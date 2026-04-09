"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import {
  Home, LayoutList, LogOut, Settings, BadgeCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SettingsDialog from "./settings-dialog";

type SidebarUser = {
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
  role?: string | null;
  createdAt?: Date | string | null;
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const NAV = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/listings/new", label: "New listing", icon: LayoutList },
];

export default function AppSidebar({ user }: { user: SidebarUser }) {
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
      <Sidebar>
        {/* Brand */}
        <SidebarHeader className="px-4 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Landil
          </Link>
        </SidebarHeader>

        <SidebarSeparator />

        {/* Nav */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={pathname === href}>
                      <Link href={href}>
                        <Icon size={15} />
                        {label}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* User footer */}
        <SidebarFooter className="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback className="text-[10px]">{initials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium leading-none">{user.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{user.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
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

              {user.username && (
                <DropdownMenuItem asChild>
                  <Link href={`/u/${user.username}`}>
                    <BadgeCheck size={14} />
                    My profile
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                <Settings size={14} />
                Settings
              </DropdownMenuItem>

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
        </SidebarFooter>
      </Sidebar>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} user={user} />
    </>
  );
}
