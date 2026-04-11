import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { eq, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { notification } from "@/db/schema/notifications";
import { offer } from "@/db/schema/marketplace";
import { getServerSession } from "@/lib/auth/get-session";
import { after } from "next/server";
import Link from "next/link";

export const metadata: Metadata = { title: "Notifications" };

const TYPE_STYLES: Record<string, string> = {
  new_offer: "bg-primary/10 text-primary",
  offer_accepted: "bg-primary/10 text-primary",
  offer_rejected: "bg-destructive/10 text-destructive",
  offer_countered: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  offer_withdrawn: "bg-muted text-muted-foreground",
  offer_message: "bg-muted text-muted-foreground",
};

function formatTime(iso: Date | string) {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

async function markAllRead(userId: string) {
  await db
    .update(notification)
    .set({ read: true })
    .where(eq(notification.userId, userId));
}

export default async function NotificationsPage() {
  const session = await getServerSession();
  if (!session) redirect("/signin");

  const u = session.user as { id: string };

  const notifications = await db
    .select()
    .from(notification)
    .where(eq(notification.userId, u.id))
    .orderBy(desc(notification.createdAt))
    .limit(50);

  // Build offerId → listingId map for links
  const offerIds = notifications.map((n) => n.relatedId).filter(Boolean) as string[];
  type OfferInfo = { listingId: string; buyerId: string };
  const offerMap = new Map<string, OfferInfo>();
  if (offerIds.length > 0) {
    const offers = await db
      .select({ id: offer.id, listingId: offer.listingId, buyerId: offer.buyerId })
      .from(offer)
      .where(inArray(offer.id, offerIds));
    for (const o of offers) offerMap.set(o.id, { listingId: o.listingId, buyerId: o.buyerId });
  }

  // Mark all as read after fetching
  after(() => markAllRead(u.id));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
        {notifications.some((n) => !n.read) && (
          <span className="text-xs text-muted-foreground">Marking all as read…</span>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const content = (
              <div className={`rounded-xl border p-4 transition-colors ${
                n.read ? "border-border" : "border-primary/30 bg-primary/5"
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_STYLES[n.type] ?? "bg-muted text-muted-foreground"}`}>
                    {n.type.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">{formatTime(n.createdAt)}</p>
              </div>
            );

            const offerInfo = n.relatedId ? offerMap.get(n.relatedId) : null;
            const offerHref = offerInfo
              ? offerInfo.buyerId === u.id
                ? `/listings/${offerInfo.listingId}/my-offer`
                : `/listings/${offerInfo.listingId}/offers/${n.relatedId}`
              : null;
            return offerHref ? (
              <Link key={n.id} href={offerHref} className="block hover:opacity-90">
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
