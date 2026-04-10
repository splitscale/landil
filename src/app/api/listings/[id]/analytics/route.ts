import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { listing } from "@/db/schema/listings";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/get-session";
import { bucketConfig, formatBucket, VALID_WINDOWS, type Window } from "@/lib/analytics-buckets";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const u = session.user as { id: string; role?: string };
  const isAdmin = u.role === "admin";

  // Verify ownership (admins bypass)
  if (!isAdmin) {
    const [l] = await db
      .select({ id: listing.id })
      .from(listing)
      .where(and(eq(listing.id, id), eq(listing.userId, u.id)));
    if (!l) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const windowParam = (req.nextUrl.searchParams.get("window") ?? "7d") as Window;
  const validWindows: Window[] = ["1h", "1d", "7d", "30d"];
  const w: Window = validWindows.includes(windowParam) ? windowParam : "7d";

  const { truncExpr, since } = bucketConfig(w);

  const rows = await db.execute<{ bucket: string; clicks: string; reach: string }>(sql`
    SELECT
      ${truncExpr} AS bucket,
      COUNT(*) AS clicks,
      COUNT(DISTINCT viewer_key) AS reach
    FROM listings.listing_view
    WHERE listing_id = ${id}
      AND created_at >= ${since}
    GROUP BY bucket
    ORDER BY bucket
  `);

  const buckets = rows.map((r) => ({
    label: formatBucket(new Date(r.bucket), w),
    clicks: Number(r.clicks),
    reach: Number(r.reach),
  }));

  const totals = buckets.reduce(
    (acc, b) => ({ clicks: acc.clicks + b.clicks, reach: acc.reach + b.reach }),
    { clicks: 0, reach: 0 },
  );

  return NextResponse.json({ buckets, totals });
}
