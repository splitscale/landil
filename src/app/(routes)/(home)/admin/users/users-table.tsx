"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Copy, BadgeCheck, UserRoundCog, MoreHorizontal, ExternalLink } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Role = "admin" | "seller" | "buyer";

type User = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  role: string;
  verified: boolean;
  plan: string;
  createdAt: Date | string | null;
};

const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-destructive/10 text-destructive",
  seller: "bg-primary/10 text-primary",
  buyer: "bg-muted text-muted-foreground",
};

function formatDate(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

async function patchUser(id: string, body: Record<string, unknown>) {
  return fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function bulkUsers(body: Record<string, unknown>) {
  return fetch("/api/admin/users/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}


function UserRow({
  user,
  currentUserId,
  selected,
  onSelect,
  onDelete,
}: {
  user: User;
  currentUserId: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [role, setRole] = useState<Role>(user.role as Role);
  const [verified, setVerified] = useState(user.verified);
  const [plan, setPlan] = useState<"free" | "pro">(user.plan as "free" | "pro");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isSelf = user.id === currentUserId;

  const handle = async (body: Record<string, unknown>, optimistic: () => void) => {
    setLoading(true);
    optimistic();
    try {
      await patchUser(user.id, body);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = () => {
    startTransition(async () => {
      await authClient.admin.impersonateUser({ userId: user.id });
      router.push("/");
      router.refresh();
    });
  };

  return (
    <tr className={`border-b border-border last:border-0 transition-colors ${selected ? "bg-primary/5" : "hover:bg-muted/30"}`}>
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(user.id)}
          className="rounded border-border"
        />
      </td>
      <td className="px-4 py-3">
        {user.username ? (
          <Link href={`/u/${user.username}`} className="group">
            <p className="font-medium group-hover:underline underline-offset-2">{user.name}</p>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </Link>
        ) : (
          <p className="font-medium">{user.name}</p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
      <td className="px-4 py-3">
        {isSelf ? (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ROLE_COLORS[role]}`}>{role}</span>
        ) : (
          <select
            value={role}
            disabled={loading}
            onChange={(e) => handle({ role: e.target.value }, () => setRole(e.target.value as Role))}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs capitalize disabled:opacity-50 cursor-pointer"
          >
            <option value="buyer">buyer</option>
            <option value="seller">seller</option>
            <option value="admin">admin</option>
          </select>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => handle({ verified: !verified }, () => setVerified((v) => !v))}
          disabled={loading}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            verified
              ? "bg-primary/10 text-primary hover:bg-destructive/10 hover:text-destructive"
              : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
          }`}
        >
          <BadgeCheck size={11} />
          {verified ? "Verified" : "Unverified"}
        </button>
      </td>
      <td className="px-4 py-3">
        {role === "admin" ? (
          <span className="text-xs text-muted-foreground italic">unrestricted</span>
        ) : (
          <select
            value={plan}
            disabled={loading}
            onChange={(e) => handle({ plan: e.target.value }, () => setPlan(e.target.value as "free" | "pro"))}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs capitalize disabled:opacity-50 cursor-pointer"
          >
            <option value="free">free</option>
            <option value="pro">pro</option>
          </select>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(user.createdAt)}</td>
      <td className="px-3 py-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal size={15} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {user.username && (
              <DropdownMenuItem asChild>
                <Link href={`/u/${user.username}`} className="flex items-center gap-2">
                  <ExternalLink size={13} />
                  View profile
                </Link>
              </DropdownMenuItem>
            )}
            {user.username && (
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/u/${user.username}`);
                  toast.success("Profile link copied");
                }}
                className="flex items-center gap-2"
              >
                <Copy size={13} />
                Copy link
              </DropdownMenuItem>
            )}
            {!isSelf && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleImpersonate}
                  disabled={isPending}
                  className="flex items-center gap-2"
                >
                  <UserRoundCog size={13} />
                  Impersonate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(user.id)}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 size={13} />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export default function UsersTable({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<User[]>(users);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const allIds = rows.map((u) => u.id).filter((id) => id !== currentUserId);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulk = async (body: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await bulkUsers({ ...body, ids: [...selected] });
      if (!res.ok) { toast.error("Action failed"); return; }
      if (body.action === "delete") {
        setRows((prev) => prev.filter((u) => !selected.has(u.id)));
        setSelected(new Set());
        toast.success("Users deleted");
      } else {
        toast.success("Updated");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteSingle = async (id: string) => {
    setLoading(true);
    try {
      await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((u) => u.id !== id));
      toast.success("User deleted");
    } finally {
      setLoading(false);
    }
  };

  const count = selected.size;

  return (
    <div className="space-y-2">
      {/* Bulk toolbar */}
      {count > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium">{count} selected</span>
          <span className="text-muted-foreground">·</span>
          <select
            disabled={loading}
            defaultValue=""
            onChange={(e) => { if (e.target.value) { bulk({ action: "setRole", value: e.target.value }); e.target.value = ""; } }}
            className="rounded border border-border bg-background px-2 py-0.5 text-xs disabled:opacity-50 cursor-pointer"
          >
            <option value="" disabled>Set role…</option>
            <option value="buyer">buyer</option>
            <option value="seller">seller</option>
            <option value="admin">admin</option>
          </select>
          <select
            disabled={loading}
            defaultValue=""
            onChange={(e) => { if (e.target.value) { bulk({ action: "setPlan", value: e.target.value }); e.target.value = ""; } }}
            className="rounded border border-border bg-background px-2 py-0.5 text-xs disabled:opacity-50 cursor-pointer"
          >
            <option value="" disabled>Set plan…</option>
            <option value="free">free</option>
            <option value="pro">pro</option>
          </select>
          <button
            onClick={() => bulk({ action: "setVerified", value: true })}
            disabled={loading}
            className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted disabled:opacity-50 transition-colors"
          >
            Verify all
          </button>
          <button
            onClick={() => bulk({ action: "delete" })}
            disabled={loading}
            className="ml-auto rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
          >
            Delete {count}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground">
            Clear
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-border"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Verified</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                currentUserId={currentUserId}
                selected={selected.has(u.id)}
                onSelect={toggleOne}
                onDelete={deleteSingle}
              />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No users yet.</p>
        )}
      </div>
    </div>
  );
}
