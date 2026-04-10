import { type Metadata } from "next";
import { getServerSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import { eq, count, inArray } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { listing } from "@/db/schema/listings";
import { listingView } from "@/db/schema/listings/listing-view";
import { offer } from "@/db/schema/marketplace";
import SetupAdminDialog from "./components/setup-admin-dialog";
import DashboardCharts from "./components/dashboard-charts";
import { LayoutList, MessageSquare, TrendingUp, FileText, Eye } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Manage your land listings, review bids, and track due diligence from your Landil dashboard.",
};

function formatPriceFull(pesos: number) {
  return `₱${pesos.toLocaleString("en-PH")}`;
}

function formatPriceShort(pesos: number) {
  if (pesos >= 1_000_000) return `₱${(pesos / 1_000_000).toFixed(1)}M`;
  if (pesos >= 1_000) return `₱${(pesos / 1_000).toFixed(0)}K`;
  return `₱${pesos.toLocaleString("en-PH")}`;
}

export default async function Home() {
  const me = await getServerSession();
  if (!me) redirect("/signin");

  const u = me.user as { id: string; name: string; role?: string };
  const isAdmin = u.role === "admin";

  const [{ value: adminCount }] = await db
    .select({ value: count() })
    .from(user)
    .where(eq(user.role, "admin"));

  const listings = await db
    .select({ id: listing.id, status: listing.status, askingPrice: listing.askingPrice })
    .from(listing)
    .where(isAdmin ? undefined : eq(listing.userId, u.id));

  const listingIds = listings.map((l) => l.id);

  const [offerRows, viewRows, reachRows] = await Promise.all([
    listingIds.length > 0
      ? db.select({ value: count() }).from(offer).where(inArray(offer.listingId, listingIds))
      : Promise.resolve([{ value: 0 }]),
    listingIds.length > 0
      ? db.select({ value: count() }).from(listingView).where(inArray(listingView.listingId, listingIds))
      : Promise.resolve([{ value: 0 }]),
    listingIds.length > 0
      ? db.selectDistinct({ key: listingView.viewerKey }).from(listingView).where(inArray(listingView.listingId, listingIds))
      : Promise.resolve([]),
  ]);

  const published = listings.filter((l) => l.status === "published").length;
  const drafts = listings.filter((l) => l.status === "draft").length;
  const totalOffers = offerRows[0].value;
  const totalClicks = viewRows[0].value;
  const totalReach = reachRows.length;
  const portfolioValue = listings.reduce((acc, l) => acc + l.askingPrice, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      {adminCount === 0 && <SetupAdminDialog />}

      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Welcome back, {u.name}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {isAdmin ? "Platform overview" : "Your seller dashboard"}
        </p>
      </div>

      {/* Portfolio value */}
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TrendingUp size={14} />
          <p className="text-xs">{isAdmin ? "Total market value" : "Portfolio value"}</p>
        </div>
        <p className="mt-2 text-3xl font-semibold tabular-nums">
          {formatPriceFull(portfolioValue)}
        </p>
        {listings.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            avg {formatPriceShort(Math.round(portfolioValue / listings.length))} per listing
          </p>
        )}
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<LayoutList size={14} />} label="Total listings" value={listings.length} />
        <StatCard icon={<FileText size={14} />} label="Published" value={published} accent />
        <StatCard icon={<MessageSquare size={14} />} label="Offers" value={totalOffers} />
        <StatCard icon={<Eye size={14} />} label="Reach" value={totalReach} sublabel="unique viewers" />
      </div>

      {/* Activity charts */}
      <DashboardCharts />

    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className={`flex items-center gap-1.5 ${accent ? "text-primary" : "text-muted-foreground"}`}>
        {icon}
        <p className="text-[11px]">{label}</p>
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>
        {value}
      </p>
      {sublabel && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}
