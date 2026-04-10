import { type Metadata } from "next";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { adminInvite } from "@/db/schema/auth";
import { requireRole } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/get-session";
import UsersTable from "./users-table";
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
      <UsersTable users={users} currentUserId={session!.user.id} />
    </div>
  );
}
