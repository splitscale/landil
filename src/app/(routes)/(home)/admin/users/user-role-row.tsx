"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";

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

  const handleVerifiedToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await patchUser(user.id, { verified: !verified });
      setVerified((v) => !v);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium">{user.name}</p>
        {user.username && <p className="text-xs text-muted-foreground">@{user.username}</p>}
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
        <button
          onClick={handleVerifiedToggle}
          disabled={loading}
          title={verified ? "Revoke verified" : "Mark verified"}
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
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
          user.plan === "pro" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}>
          {user.plan}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(user.createdAt)}</td>
    </tr>
  );
}
