import { type Metadata } from "next";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { listing } from "@/db/schema/listings";
import { requireRole } from "@/lib/auth/roles";
import { Users, LayoutList, ShieldCheck, TrendingUp } from "lucide-react";
import { RoleDonut, StatusDonut, SignupsBar, ListingsBar } from "./charts";

export const metadata: Metadata = { title: "Admin" };

function buildDailyBuckets(dates: (Date | string | null)[], days = 30) {
  const buckets: Record<string, number> = {};
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    buckets[key] = 0;
  }

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  for (const raw of dates) {
    if (!raw) continue;
    const d = new Date(raw);
    if (d < cutoff) continue;
    const key = d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    if (key in buckets) buckets[key]++;
  }

  return Object.entries(buckets).map(([date, count]) => ({ date, count }));
}

export default async function AdminPage() {
  await requireRole("admin");

  const [users, listings] = await Promise.all([
    db.select({ id: user.id, role: user.role, plan: user.plan, createdAt: user.createdAt }).from(user),
    db.select({ id: listing.id, status: listing.status, createdAt: listing.createdAt }).from(listing),
  ]);

  // Counts
  const byRole = {
    buyer: users.filter((u) => u.role === "buyer").length,
    seller: users.filter((u) => u.role === "seller").length,
    admin: users.filter((u) => u.role === "admin").length,
  };
  const byStatus = {
    published: listings.filter((l) => l.status === "published").length,
    draft: listings.filter((l) => l.status === "draft").length,
  };
  const proUsers = users.filter((u) => u.plan === "pro").length;

  // Time series
  const signupBuckets = buildDailyBuckets(users.map((u) => u.createdAt));
  const listingBuckets = buildDailyBuckets(listings.map((l) => l.createdAt));

  const signupsData = signupBuckets.map(({ date, count }) => ({ date, signups: count }));
  const listingsData = listingBuckets.map(({ date, count }) => ({ date, listings: count }));

  const roleData = [
    { name: "buyer", value: byRole.buyer },
    { name: "seller", value: byRole.seller },
    { name: "admin", value: byRole.admin },
  ];
  const statusData = [
    { name: "published", value: byStatus.published },
    { name: "draft", value: byStatus.draft },
  ];

  const stats = [
    { label: "Total users", value: users.length, sub: `${byRole.seller} sellers · ${byRole.buyer} buyers`, icon: Users },
    { label: "Total listings", value: listings.length, sub: `${byStatus.published} published · ${byStatus.draft} drafts`, icon: LayoutList },
    { label: "Pro users", value: proUsers, sub: `${users.length - proUsers} on free`, icon: TrendingUp },
    { label: "Admins", value: byRole.admin, sub: "Platform administrators", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Icon size={12} />
              {label}
            </div>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Time series */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-sm font-medium">User signups — last 30 days</p>
          <SignupsBar data={signupsData} />
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-sm font-medium">Listings created — last 30 days</p>
          <ListingsBar data={listingsData} />
        </div>
      </div>

      {/* Distribution */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-sm font-medium">Users by role</p>
          <RoleDonut data={roleData} />
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-sm font-medium">Listings by status</p>
          <StatusDonut data={statusData} />
        </div>
      </div>
    </div>
  );
}

