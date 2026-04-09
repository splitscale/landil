"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, User, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateUser, changePassword } from "@/lib/auth/client";

type SettingsUser = {
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
  role?: string | null;
  createdAt?: Date | string | null;
};

type Section = "account" | "preferences";

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "account", label: "Account", icon: User },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
];

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function SettingsDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SettingsUser;
}) {
  const [active, setActive] = useState<Section>("account");
  const { theme, setTheme } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 p-0 sm:max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex h-11 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-semibold">Settings</span>
          <DialogClose className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X size={16} />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* Body */}
        <div className="flex h-[460px]">
          {/* Sidebar */}
          <div className="flex w-44 shrink-0 flex-col border-r border-border bg-muted/30 p-3">
            <nav className="flex flex-col gap-0.5">
              {NAV.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors text-left",
                    active === id
                      ? "bg-background text-foreground shadow-xs hover:bg-background/80"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                  )}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {active === "account" && <AccountSection user={user} />}
            {active === "preferences" && (
              <PreferencesSection theme={theme} setTheme={setTheme} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Account ────────────────────────────────────────────────────────────────────

function AccountSection({ user }: { user: SettingsUser }) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const profileDirty =
    name.trim() !== user.name || username.trim() !== (user.username ?? "");

  const handleSaveProfile = async () => {
    if (!name.trim()) { toast.error("Name can't be empty."); return; }
    setSavingProfile(true);
    const { error } = await updateUser({
      name: name.trim(),
      ...(username.trim() && { username: username.trim() }),
    });
    setSavingProfile(false);
    if (error) {
      toast.error(error.message ?? "Failed to update profile.");
    } else {
      toast.success("Saved.");
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters."); return; }
    setSavingPassword(true);
    const { error } = await changePassword({ currentPassword, newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message ?? "Failed to change password.");
    } else {
      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    }
  };

  return (
    <div className="space-y-6">

      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={user.image ?? undefined} alt={user.name} />
          <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Profile */}
      <div className="space-y-2.5">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={savingProfile} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Username</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} disabled={savingProfile} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input value={user.email} disabled className="opacity-60" />
        </div>
        <Button size="sm" onClick={handleSaveProfile} disabled={!profileDirty || savingProfile}>
          {savingProfile ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="h-px bg-border" />

      {/* Password */}
      <div className="space-y-2.5">
        <p className="text-xs font-medium text-muted-foreground">Change password</p>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Current</Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            disabled={savingPassword}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">New</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            disabled={savingPassword}
          />
        </div>
        <Button
          size="sm"
          onClick={handleSavePassword}
          disabled={!currentPassword || !newPassword || savingPassword}
        >
          {savingPassword ? "Saving…" : "Update password"}
        </Button>
      </div>

    </div>
  );
}

// ── Preferences ────────────────────────────────────────────────────────────────

function PreferencesSection({
  theme,
  setTheme,
}: {
  theme: string | undefined;
  setTheme: (t: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Appearance</p>
      <div className="flex gap-2">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors",
                theme === value
                  ? "border-foreground bg-foreground text-background hover:bg-foreground/85"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground hover:bg-muted",
              )}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
      </div>
    </div>
  );
}
