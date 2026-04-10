import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/auth/get-session";
import AppSidebar from "@/app/(routes)/(home)/components/app-sidebar";
import ImpersonationBanner from "@/app/(routes)/(home)/components/impersonation-banner";

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

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        {isImpersonating && <ImpersonationBanner impersonatedName={user.name} />}
        <header className="flex h-12 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
