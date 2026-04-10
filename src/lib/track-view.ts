import { createHash } from "crypto";
import { headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { listingView } from "@/db/schema/listings/listing-view";

// Cooldown window: same viewer won't add another click within this period
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/**
 * Records a listing view.
 *
 * Guards:
 * - Skips if viewer is the listing owner (no self-inflation)
 * - Deduplicates: same viewerKey + listingId within COOLDOWN_MS = no insert
 *
 * Reach  = COUNT(DISTINCT viewer_key)  across all time
 * Clicks = COUNT(*)                    (each non-deduped visit)
 */
export async function trackListingView(
  listingId: string,
  sellerId: string,
  userId: string | null,
): Promise<void> {
  // Guard 1: don't count seller's own views
  if (userId && userId === sellerId) return;

  // Derive viewer key: prefer authenticated user ID, fall back to hashed IP
  let viewerKey: string;
  if (userId) {
    viewerKey = userId;
  } else {
    const hdrs = await headers();
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      hdrs.get("x-real-ip") ??
      "unknown";
    viewerKey = hashIp(ip);
  }

  // Guard 2: cooldown dedup — skip if same viewer already counted recently
  const cooldownSince = new Date(Date.now() - COOLDOWN_MS);
  const [recent] = await db
    .select({ id: listingView.id })
    .from(listingView)
    .where(
      and(
        eq(listingView.listingId, listingId),
        eq(listingView.viewerKey, viewerKey),
        gt(listingView.createdAt, cooldownSince),
      ),
    )
    .limit(1);

  if (recent) return;

  await db.insert(listingView).values({ listingId, viewerKey });
}
