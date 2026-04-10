"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { LayoutList, LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SettingsDialog from "./settings-dialog";

type NavUser = {
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
  role?: string | null;
  createdAt?: Date | string | null;
} | null;

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function Navbar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ fetchOptions: { onSuccess: () => router.push("/signin") } });
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          {/* Brand */}
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Landil
          </Link>

          {/* Right side */}
          {user ? (
            <div className="flex items-center gap-2">
              {(user.role === "seller" || user.role === "admin") && (
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
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full outline-none ring-ring ring-offset-2 ring-offset-background focus-visible:ring-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image ?? undefined} alt={user.name} />
                      <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={user.image ?? undefined} alt={user.name} />
                        <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="grid min-w-0 flex-1">
                        <span className="truncate text-sm font-medium">{user.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                      <Settings size={14} />
                      Settings
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onSelect={handleSignOut}
                    disabled={signingOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut size={14} />
                    {signingOut ? "Signing out…" : "Sign out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

      {user && (
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} user={user} />
      )}
    </>
  );
}
