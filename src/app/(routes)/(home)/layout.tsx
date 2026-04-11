import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/auth/get-session";
import { db } from "@/db";
import { notification } from "@/db/schema/notifications";
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
  const role = (user as { role?: string | null }).role ?? "user";
  const isBuyer = role !== "seller" && role !== "admin";

  const unreadNotifications = await db
    .select({ id: notification.id })
    .from(notification)
    .where(and(eq(notification.userId, user.id), eq(notification.read, false)));
  const unreadCount = unreadNotifications.length;

  // Buyer: topbar layout (no sidebar)
  if (isBuyer) {
    return (
      <div className="flex flex-col min-h-svh">
        {isImpersonating && <ImpersonationBanner impersonatedName={user.name} />}
        <Navbar user={user} unreadCount={unreadCount} />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // Seller / Admin: sidebar layout
  return (
    <div className="flex flex-col min-h-svh">
      {isImpersonating && <ImpersonationBanner impersonatedName={user.name} />}
      <SidebarProvider className="flex-1">
        <AppSidebar user={user} unreadCount={unreadCount} />
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
