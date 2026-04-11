"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserRoundCog } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Switch } from "@/components/ui/switch";

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

function formatDate(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-destructive/10 text-destructive",
  seller: "bg-primary/10 text-primary",
  buyer: "bg-muted text-muted-foreground",
};

async function patchUser(id: string, body: Record<string, unknown>) {
  return fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function UserRoleRow({ user, currentUserId }: { user: User; currentUserId: string }) {
  const [role, setRole] = useState<Role>(user.role as Role);
  const [verified, setVerified] = useState(user.verified);
  const [plan, setPlan] = useState<"free" | "pro">(user.plan as "free" | "pro");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isSelf = user.id === currentUserId;

  const handleRoleChange = async (next: Role) => {
    if (next === role || loading) return;
    setLoading(true);
    try {
      await patchUser(user.id, { role: next });
      setRole(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (next: "free" | "pro") => {
    if (next === plan || loading) return;
    setLoading(true);
    try {
      await patchUser(user.id, { plan: next });
      setPlan(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async () => {
    setLoading(true);
    try {
      await authClient.admin.impersonateUser({ userId: user.id });
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
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
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ROLE_COLORS[role]}`}>
            {role}
          </span>
        ) : (
          <select
            value={role}
            disabled={loading}
            onChange={(e) => handleRoleChange(e.target.value as Role)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs capitalize disabled:opacity-50 cursor-pointer"
          >
            <option value="buyer">buyer</option>
            <option value="seller">seller</option>
            <option value="admin">admin</option>
          </select>
        )}
      </td>
      <td className="px-4 py-3">
        <Switch
          checked={verified}
          disabled={loading}
          onCheckedChange={async (next) => {
            if (loading) return;
            setLoading(true);
            try {
              await patchUser(user.id, { verified: next });
              setVerified(next);
              router.refresh();
            } finally {
              setLoading(false);
            }
          }}
          aria-label={verified ? "Revoke verified status" : "Mark as verified"}
        />
      </td>
      <td className="px-4 py-3">
        {role === "admin" ? (
          <span className="text-xs text-muted-foreground italic">unrestricted</span>
        ) : (
          <select
            value={plan}
            disabled={loading}
            onChange={(e) => handlePlanChange(e.target.value as "free" | "pro")}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs capitalize disabled:opacity-50 cursor-pointer"
          >
            <option value="free">free</option>
            <option value="pro">pro</option>
          </select>
        )}
      </td>
      <td className="px-4 py-3">
        {!isSelf && (
          <button
            onClick={handleImpersonate}
            disabled={loading}
            title={`Impersonate ${user.name}`}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <UserRoundCog size={11} />
            Impersonate
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(user.createdAt)}</td>
    </tr>
  );
}
