"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "admin" | "seller" | "buyer";

type User = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  role: string;
  verified: boolean;
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

export default function UserRoleRow({ user, currentUserId }: { user: User; currentUserId: string }) {
  const [role, setRole] = useState<Role>(user.role as Role);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRoleChange = async (next: Role) => {
    if (next === role || loading) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      setRole(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const isSelf = user.id === currentUserId;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium">{user.name}</p>
        {user.username && (
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
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
      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(user.createdAt)}</td>
    </tr>
  );
}
