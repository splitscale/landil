import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getServerSession } from "@/lib/auth/get-session";
import { bucketConfig, formatBucket, VALID_WINDOWS, type Window } from "@/lib/analytics-buckets";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const u = session.user as { id: string; role?: string };
  const isAdmin = u.role === "admin";

  const windowParam = (req.nextUrl.searchParams.get("window") ?? "7d") as Window;
  const w: Window = VALID_WINDOWS.includes(windowParam) ? windowParam : "7d";
  const { truncExpr, since } = bucketConfig(w);

  // Subquery: listing IDs scoped to the user (or all for admin)
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

  return NextResponse.json({
    views: viewRows.map((r) => ({
      label:  formatBucket(new Date(r.bucket), w),
      clicks: Number(r.clicks),
      reach:  Number(r.reach),
    })),
    offers: offerRows.map((r) => ({
      label: formatBucket(new Date(r.bucket), w),
      total: Number(r.total),
    })),
  });
}
