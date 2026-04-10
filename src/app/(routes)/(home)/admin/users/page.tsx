import { type Metadata } from "next";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { requireRole } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/get-session";
import UserRoleRow from "./user-role-row";

export const metadata: Metadata = { title: "Users · Admin" };

export default async function AdminUsersPage() {
  await requireRole("admin");
  const session = await getServerSession();

  const users = await db
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
    .orderBy(user.createdAt);

  return (
    <div>

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
