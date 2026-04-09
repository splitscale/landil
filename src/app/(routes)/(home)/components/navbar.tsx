"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { LayoutList, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type NavUser = {
  name: string;
  email: string;
} | null;

export default function Navbar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ fetchOptions: { onSuccess: () => router.push("/signin") } });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Brand */}
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Landil
        </Link>

        {/* Right side */}
        {user ? (
          <div className="flex items-center gap-1">
            <Link
              href="/listings/new"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "gap-1.5",
                pathname === "/listings/new" && "opacity-60 pointer-events-none",
              )}
            >
              <LayoutList size={13} />
              New listing
            </Link>

            <Link
              href="/profile"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "gap-1.5",
              )}
            >
              <User size={13} />
              <span className="hidden sm:inline">{user.name}</span>
            </Link>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "gap-1.5 text-muted-foreground hover:text-destructive",
              )}
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">
                {signingOut ? "Signing out…" : "Sign out"}
              </span>
            </button>
          </div>
        ) : (
          <Link
            href="/signin"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}