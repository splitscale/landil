import { type Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { listing } from "@/db/schema/listings";
import { requireRole } from "@/lib/auth/roles";
import { Users, LayoutList, ShieldCheck, TrendingUp } from "lucide-react";
import { RoleDonut, StatusDonut, SignupsLine, ListingsLine } from "./charts";

export const metadata: Metadata = { title: "Admin" };

const PERIODS = [
  { label: "7d",  days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

function buildDailyBuckets(dates: (Date | string | null)[], days: number) {
  const buckets: Record<string, number> = {};
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // Use a locale-independent key so it sorts correctly
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    buckets[key] = 0;
  }

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  for (const raw of dates) {
    if (!raw) continue;
    const d = new Date(raw);
    if (d < cutoff) continue;
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (key in buckets) buckets[key]++;
  }

  return Object.entries(buckets).map(([date, count]) => ({ date, count }));
}

type AdminPageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireRole("admin");

  const { period: periodParam } = await searchParams;
  const days = PERIODS.find((p) => p.label === periodParam)?.days ?? 30;
  const activePeriod = PERIODS.find((p) => p.days === days)?.label ?? "30d";

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
  const signupBuckets  = buildDailyBuckets(users.map((u) => u.createdAt), days);
  const listingBuckets = buildDailyBuckets(listings.map((l) => l.createdAt), days);

  const signupsData  = signupBuckets.map(({ date, count }) => ({ date, signups: count }));
  const listingsData = listingBuckets.map(({ date, count }) => ({ date, listings: count }));

  const roleData = [
    { name: "buyer",  value: byRole.buyer },
    { name: "seller", value: byRole.seller },
    { name: "admin",  value: byRole.admin },
  ];
  const statusData = [
    { name: "published", value: byStatus.published },
    { name: "draft",     value: byStatus.draft },
  ];

  const stats = [
    { label: "Total users",    value: users.length,    sub: `${byRole.seller} sellers · ${byRole.buyer} buyers`, icon: Users },
    { label: "Total listings", value: listings.length, sub: `${byStatus.published} published · ${byStatus.draft} drafts`, icon: LayoutList },
    { label: "Pro users",      value: proUsers,        sub: `${users.length - proUsers} on free`, icon: TrendingUp },
    { label: "Admins",         value: byRole.admin,    sub: "Platform administrators", icon: ShieldCheck },
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
      <div className="rounded-xl border border-border p-4 space-y-4">
        {/* Header + period filter */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Activity over time</p>
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            {PERIODS.map(({ label }) => (
              <Link
                key={label}
                href={`/admin?period=${label}`}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activePeriod === label
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">User signups</p>
            <SignupsLine data={signupsData} />
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Listings created</p>
            <ListingsLine data={listingsData} />
          </div>
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
