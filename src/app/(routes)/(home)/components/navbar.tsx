"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { Bell, LogOut, Settings, User, Tag } from "lucide-react";
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
import { initials } from "@/lib/utils/initials";
import { formatPrice } from "@/lib/format";
import { OFFER_STATUS_LABEL } from "@/lib/listings-browse";

type NavUser = {
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
  role?: string | null;
  createdAt?: Date | string | null;
} | null;

type NavNotification = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  href: string | null;
  createdAt: Date | string;
};

type NavOffer = {
  id: string;
  listingId: string;
  listingTitle: string | null;
  amount: number;
  status: string;
  updatedAt: Date | string;
};

type Props = {
  user: NavUser;
  notifications?: NavNotification[];
  recentOffers?: NavOffer[];
  hasUnread?: boolean;
};

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Navbar({
  user,
  notifications = [],
  recentOffers = [],
  hasUnread = false,
}: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ fetchOptions: { onSuccess: () => router.push("/signin") } });
  };

  const hasActiveOffers = recentOffers.some(
    (o) => o.status === "pending" || o.status === "countered",
  );

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
            <div className="flex items-center gap-1">

              {/* ── Offers dropdown ───────────────────────────────── */}
              {recentOffers.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                      aria-label="My offers"
                    >
                      <Tag size={16} />
                      {hasActiveOffers && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72" sideOffset={8}>
                    <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                      My offers
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {recentOffers.map((o) => {
                      const s = OFFER_STATUS_LABEL[o.status] ?? { label: o.status, color: "text-muted-foreground" };
                      return (
                        <DropdownMenuItem key={o.id} asChild>
                          <Link
                            href={`/listings/${o.listingId}/my-offer`}
                            className="flex items-center justify-between gap-3 px-2 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {o.listingTitle ?? "Listing"}
                              </p>
                              <p className="text-xs text-muted-foreground">{fmtDate(o.updatedAt)}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs font-semibold">{formatPrice(o.amount)}</p>
                              <p className={`text-[10px] font-medium ${s.color}`}>{s.label}</p>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* ── Notifications dropdown ────────────────────────── */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell size={16} />
                    {hasUnread && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72" sideOffset={8}>
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                    Notifications
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                      No notifications yet.
                    </p>
                  ) : (
                    notifications.map((n) => {
                      const item = (
                        <div className="flex flex-col gap-0.5 px-2 py-2 w-full">
                          <div className="flex items-center gap-2">
                            {!n.read && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            )}
                            <p className={`truncate text-sm ${!n.read ? "font-medium" : ""}`}>
                              {n.title}
                            </p>
                          </div>
                          {n.body && (
                            <p className="truncate text-xs text-muted-foreground pl-3.5">
                              {n.body}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground pl-3.5">
                            {fmtDate(n.createdAt)}
                          </p>
                        </div>
                      );
                      return (
                        <DropdownMenuItem key={n.id} asChild={!!n.href} className="p-0">
                          {n.href ? (
                            <Link href={n.href} className="block">{item}</Link>
                          ) : (
                            <div>{item}</div>
                          )}
                        </DropdownMenuItem>
                      );
                    })
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/notifications"
                      className="w-full text-center text-xs text-muted-foreground"
                    >
                      View all notifications
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* ── Avatar / account dropdown ─────────────────────── */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full outline-none ring-ring ring-offset-2 ring-offset-background focus-visible:ring-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image ? `${user.image}?u=${encodeURIComponent(user.email)}` : undefined} alt={user.name} />
                      <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={user.image ? `${user.image}?u=${encodeURIComponent(user.email)}` : undefined} alt={user.name} />
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
                    {user.username && user.role === "seller" && (
                      <DropdownMenuItem asChild>
                        <Link href={`/u/${user.username}`}>
                          <User size={14} />
                          My profile
                        </Link>
                      </DropdownMenuItem>
                    )}
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
