import { type Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { listing } from "@/db/schema/listings";
import { requireRole } from "@/lib/auth/roles";
import { Users, LayoutList } from "lucide-react";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireRole("admin");

  const [users, listings] = await Promise.all([
    db.select({ id: user.id, role: user.role }).from(user),
    db.select({ id: listing.id, status: listing.status }).from(listing),
  ]);

  const byRole = {
    admin: users.filter((u) => u.role === "admin").length,
    seller: users.filter((u) => u.role === "seller").length,
    buyer: users.filter((u) => u.role === "buyer").length,
  };

  const byStatus = {
    published: listings.filter((l) => l.status === "published").length,
    draft: listings.filter((l) => l.status === "draft").length,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-xl font-semibold tracking-tight">Admin</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/users"
          className="rounded-xl border border-border p-5 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users size={14} />
            Users
          </div>
          <p className="mt-3 text-3xl font-semibold">{users.length}</p>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            <span>{byRole.buyer} buyers</span>
            <span>{byRole.seller} sellers</span>
            <span>{byRole.admin} admins</span>
          </div>
        </Link>

        <Link
          href="/admin/listings"
          className="rounded-xl border border-border p-5 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <LayoutList size={14} />
            Listings
          </div>
          <p className="mt-3 text-3xl font-semibold">{listings.length}</p>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            <span>{byStatus.published} published</span>
            <span>{byStatus.draft} drafts</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
