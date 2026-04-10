import { type Metadata } from "next";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { adminInvite } from "@/db/schema/auth";
import { requireRole } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/get-session";
import UserRoleRow from "./user-role-row";
import InvitePanel from "../invite-panel";

export const metadata: Metadata = { title: "Users · Admin" };

export default async function AdminUsersPage() {
  await requireRole("admin");
  const session = await getServerSession();

  const [users, invites] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        verified: user.verified,
        plan: user.plan,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(user.createdAt),
    db.select().from(adminInvite).orderBy(adminInvite.createdAt),
  ]);

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        <InvitePanel initial={invites} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Verified</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRoleRow key={u.id} user={u} currentUserId={session!.user.id} />
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No users yet.</p>
        )}
      </div>
    </div>
  );
}
