import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notification } from "@/db/schema/notifications";
import { user } from "@/db/schema/auth/user";
import { offer } from "@/db/schema/marketplace";
import { sendNotificationEmail } from "@/lib/email";

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
  // Insert in-app notification
  await db.insert(notification).values({ userId, type, title, body, relatedId: relatedId ?? null });

  // Send email (fire-and-forget — never throw)
  try {
    const [recipient] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!recipient) return;

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
