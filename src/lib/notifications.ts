import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notification } from "@/db/schema/notifications";
import { user } from "@/db/schema/auth/user";
import { offer } from "@/db/schema/marketplace";
import { sendNotificationEmail } from "@/lib/email";

/** Returns whether a given channel+type is enabled for a user (default: true). */
function isPrefEnabled(
  prefs: { email?: Partial<Record<string, boolean>>; inApp?: Partial<Record<string, boolean>> } | null | undefined,
  channel: "email" | "inApp",
  type: string,
): boolean {
  if (!prefs) return true;
  const channelPrefs = prefs[channel];
  if (!channelPrefs) return true;
  return channelPrefs[type] !== false; // undefined → true (on by default)
}

export async function createNotification({
  userId,
  type,
  title,
  body,
  relatedId,
}: {
  userId: string;
  type: string;
  title: string;
  body: string;
  relatedId?: string;
}) {
  // Fetch user + prefs in one query
  const [recipient] = await db
    .select({ email: user.email, notificationPrefs: user.notificationPrefs })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!recipient) return;

  // In-app notification (skip if user opted out for this type)
  if (isPrefEnabled(recipient.notificationPrefs, "inApp", type)) {
    await db.insert(notification).values({ userId, type, title, body, relatedId: relatedId ?? null });
  }

  // Email notification (skip if user opted out)
  if (!isPrefEnabled(recipient.notificationPrefs, "email", type)) return;

  try {
    // Resolve listingId + buyer status from offerId (relatedId)
    let listingId: string | undefined;
    let isBuyer: boolean | undefined;

    if (relatedId) {
      const [o] = await db
        .select({ listingId: offer.listingId, buyerId: offer.buyerId })
        .from(offer)
        .where(eq(offer.id, relatedId))
        .limit(1);

      if (o) {
        listingId = o.listingId;
        isBuyer = o.buyerId === userId;
      }
    }

    await sendNotificationEmail({
      recipientEmail: recipient.email,
      type,
      title,
      body,
      offerId: relatedId,
      listingId,
      isBuyer,
    });
  } catch (err) {
    console.error("[notifications] email send failed:", err);
  }
}
