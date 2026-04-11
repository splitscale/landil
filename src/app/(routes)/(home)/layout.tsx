import Link from "next/link";
import { eq, and, desc, inArray } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/auth/get-session";
import { db } from "@/db";
import { notification } from "@/db/schema/notifications";
import { offer } from "@/db/schema/marketplace";
import { listing } from "@/db/schema/listings";
import AppSidebar from "@/app/(routes)/(home)/components/app-sidebar";
import Navbar from "@/app/(routes)/(home)/components/navbar";
import ImpersonationBanner from "@/app/(routes)/(home)/components/impersonation-banner";
import Breadcrumbs from "@/app/(routes)/(home)/components/breadcrumbs";

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const user = session?.user ?? null;

  if (!user) {
    return (
      <>
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Landil
            </Link>
            <Link href="/signin" className={buttonVariants({ variant: "default", size: "sm" })}>
              Sign in
            </Link>
          </div>
        </header>
        <main>{children}</main>
      </>
    );
  }

  const isImpersonating = !!(session as { session?: { impersonatedBy?: string } } | null)?.session?.impersonatedBy;
  const role = (user as { role?: string | null }).role ?? "buyer";
  const isBuyer = role !== "seller" && role !== "admin";

  // ── Notifications (all roles) ──────────────────────────────────────────────
  const [recentNotifications, [firstUnread]] = await Promise.all([
    db
      .select({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        read: notification.read,
        relatedId: notification.relatedId,
        createdAt: notification.createdAt,
      })
      .from(notification)
      .where(eq(notification.userId, user.id))
      .orderBy(desc(notification.createdAt))
      .limit(5),
    db
      .select({ id: notification.id })
      .from(notification)
      .where(and(eq(notification.userId, user.id), eq(notification.read, false)))
      .limit(1),
  ]);

  const hasUnread = !!firstUnread;

  // Build offer href map for notification links
  const relatedIds = recentNotifications.map((n) => n.relatedId).filter(Boolean) as string[];
  const offerInfoMap = new Map<string, { listingId: string; buyerId: string }>();
  if (relatedIds.length > 0) {
    const offerRows = await db
      .select({ id: offer.id, listingId: offer.listingId, buyerId: offer.buyerId })
      .from(offer)
      .where(inArray(offer.id, relatedIds));
    for (const o of offerRows) offerInfoMap.set(o.id, { listingId: o.listingId, buyerId: o.buyerId });
  }

  const navNotifications = recentNotifications.map((n) => {
    const info = n.relatedId ? offerInfoMap.get(n.relatedId) : null;
    return {
      id: n.id,
      title: n.title,
      body: n.body,
      read: n.read,
      createdAt: n.createdAt as Date | string,
      href: info
        ? info.buyerId === user.id
          ? `/listings/${info.listingId}/my-offer`
          : `/listings/${info.listingId}/offers/${n.relatedId}`
        : null,
    };
  });

  // ── Buyer: recent offers ───────────────────────────────────────────────────
  type NavOffer = {
    id: string;
    listingId: string;
    listingTitle: string | null;
    amount: number;
    status: string;
    updatedAt: Date | string;
  };
  let recentOffers: NavOffer[] = [];
  if (isBuyer) {
    recentOffers = await db
      .select({
        id: offer.id,
        listingId: offer.listingId,
        listingTitle: listing.title,
        amount: offer.amount,
        status: offer.status,
        updatedAt: offer.updatedAt,
      })
      .from(offer)
      .leftJoin(listing, eq(offer.listingId, listing.id))
      .where(eq(offer.buyerId, user.id))
      .orderBy(desc(offer.updatedAt))
      .limit(5);
  }

  // Buyer: topbar layout (no sidebar)
  if (isBuyer) {
    return (
      <div className="flex flex-col min-h-svh">
        {isImpersonating && <ImpersonationBanner impersonatedName={user.name} />}
        <Navbar
          user={user}
          notifications={navNotifications}
          recentOffers={recentOffers}
          hasUnread={hasUnread}
        />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // Seller / Admin: sidebar layout (sidebar has its own notification link)
  return (
    <div className="flex flex-col min-h-svh">
      {isImpersonating && <ImpersonationBanner impersonatedName={user.name} />}
      <SidebarProvider className="flex-1">
        <AppSidebar user={user} unreadCount={hasUnread ? 1 : 0} />
        <SidebarInset>
          <header className="flex h-12 items-center gap-2 border-b border-border px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-border" />
            <Breadcrumbs />
          </header>
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
