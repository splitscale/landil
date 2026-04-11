"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/client";
import {
  IconCirclePlusFilled,
  IconDashboard,
  IconDotsVertical,
  IconListDetails,
  IconLogout,
  IconSettings,
  IconBuildingStore,
  IconShieldHalf,
  IconBell,
} from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import SettingsDialog from "./settings-dialog";
import { initials } from "@/lib/utils/initials";

type SidebarUser = {
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
  role?: string | null;
  createdAt?: Date | string | null;
};

type AppSidebarProps = {
  user: SidebarUser;
  unreadCount?: number;
};

const NAV_MAIN = [
  { title: "Dashboard", href: "/", icon: IconDashboard },
  { title: "My listings", href: "/listings", icon: IconListDetails, roles: ["seller", "admin"] },
  { title: "Browse", href: "/browse", icon: IconBuildingStore },
];

const NAV_ADMIN = [
  { title: "Admin", href: "/admin", icon: IconShieldHalf },
];

const NAV_SECONDARY = [
  { title: "Settings", icon: IconSettings },
];

function NavUser({ user, onSettingsOpen }: { user: SidebarUser; onSettingsOpen: () => void }) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ fetchOptions: { onSuccess: () => router.push("/signin") } });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.image ? `${user.image}?u=${encodeURIComponent(user.email)}` : undefined} alt={user.name} />
                <AvatarFallback className="rounded-lg text-xs">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuItem onSelect={onSettingsOpen}>
              <IconSettings className="size-4" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={handleSignOut}
              disabled={signingOut}
              className="text-destructive focus:text-destructive"
            >
              <IconLogout className="size-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export default function AppSidebar({ user, unreadCount = 0 }: AppSidebarProps) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <Sidebar collapsible="icon">
        {/* Brand */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
                <Link href="/">
                  <span className="text-base font-semibold">Landil</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="overflow-x-hidden">
          {/* Main nav */}
          <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
              {(user.role === "seller" || user.role === "admin") && (
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="New listing"
                      className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                    >
                      <Link href="/listings/new">
                        <IconCirclePlusFilled />
                        <span>New listing</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              )}

              <SidebarMenu>
                {NAV_MAIN.filter(({ roles }) => !roles || roles.includes(user.role ?? "")).map(({ title, href, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild tooltip={title} isActive={pathname === href}>
                      <Link href={href}>
                        <Icon />
                        <span>{title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Notifications" isActive={pathname === "/notifications"}>
                    <Link href="/notifications" className="relative">
                      <IconBell />
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Admin nav */}
          {user.role === "admin" && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {NAV_ADMIN.map(({ title, href, icon: Icon }) => (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton asChild tooltip={title} isActive={pathname.startsWith(href)}>
                          <Link href={href}>
                            <Icon />
                            <span>{title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>

        <SidebarFooter className="overflow-x-hidden">
          <NavUser user={user} onSettingsOpen={() => setSettingsOpen(true)} />
        </SidebarFooter>
      </Sidebar>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} user={user} />
    </>
  );
}
