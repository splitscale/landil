import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getServerSession } from "@/lib/auth/get-session";
import {
  bucketConfig,
  bucketKey,
  formatBucket,
  generateBuckets,
  VALID_WINDOWS,
  type Window,
} from "@/lib/analytics-buckets";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const u = session.user as { id: string; role?: string };
  const isAdmin = u.role === "admin";

  const windowParam = (req.nextUrl.searchParams.get("window") ?? "7d") as Window;
  const w: Window = VALID_WINDOWS.includes(windowParam) ? windowParam : "7d";
  const { truncExpr, since } = bucketConfig(w);

  const listingScope = isAdmin
    ? sql`SELECT id FROM listings.listing`
    : sql`SELECT id FROM listings.listing WHERE user_id = ${u.id}`;

  const [viewRows, offerRows] = await Promise.all([
    db.execute<{ bucket: string; clicks: string; reach: string }>(sql`
      SELECT
        ${truncExpr} AS bucket,
        COUNT(*) AS clicks,
        COUNT(DISTINCT viewer_key) AS reach
      FROM listings.listing_view
      WHERE listing_id IN (${listingScope})
        AND created_at >= ${since}
      GROUP BY bucket
      ORDER BY bucket
    `),
    db.execute<{ bucket: string; total: string }>(sql`
      SELECT
        ${truncExpr} AS bucket,
        COUNT(*) AS total
      FROM marketplace.offer
      WHERE listing_id IN (${listingScope})
        AND created_at >= ${since}
      GROUP BY bucket
      ORDER BY bucket
    `),
  ]);

  // Index DB results by normalised key
  const viewMap = new Map<string, { clicks: number; reach: number }>();
  for (const r of viewRows) {
    viewMap.set(bucketKey(new Date(r.bucket), w), {
      clicks: Number(r.clicks),
      reach:  Number(r.reach),
    });
  }

  const offerMap = new Map<string, number>();
  for (const r of offerRows) {
    offerMap.set(bucketKey(new Date(r.bucket), w), Number(r.total));
  }

  // Emit every bucket in the window — zeros where no data
  const allBuckets = generateBuckets(w);

  const views = allBuckets.map((b) => {
    const k = bucketKey(b, w);
    const d = viewMap.get(k) ?? { clicks: 0, reach: 0 };
    return { label: formatBucket(b, w), ...d };
  });

  const offers = allBuckets.map((b) => {
    const k = bucketKey(b, w);
    return { label: formatBucket(b, w), total: offerMap.get(k) ?? 0 };
  });

  return NextResponse.json({ views, offers });
}
