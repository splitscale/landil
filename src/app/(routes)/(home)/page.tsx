import { type Metadata } from "next";
import { getServerSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { and, count, desc, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { listing, listingPhoto } from "@/db/schema/listings";
import { listingView } from "@/db/schema/listings/listing-view";
import { offer } from "@/db/schema/marketplace";
import { user } from "@/db/schema/auth/user";
import SetupAdminDialog from "./components/setup-admin-dialog";
import DashboardCharts from "./components/dashboard-charts";
import ListingCard from "./components/listing-card";
import ListingFilterBar from "./components/listing-filter-bar";
import { propertyTypes as listingPropertyTypes } from "@/app/(routes)/(home)/listings/new/validate";
import { formatPrice, formatPriceShort } from "@/lib/format";
import { PRICE_RANGES } from "@/lib/listings-browse";
import { LayoutList, MessageSquare, TrendingUp, FileText, Eye } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Manage your land listings, review bids, and track due diligence from your Landil dashboard.",
};

type HomePageProps = {
  searchParams: Promise<{
    q?: string;
    propertyType?: string;
    priceRange?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const me = await getServerSession();
  if (!me) redirect("/signin");

  const u = me.user as { id: string; name: string; role?: string | null; username?: string | null; email: string; image?: string | null };
  const role = u.role ?? "buyer";
  const isAdmin = role === "admin";
  const isSeller = role === "seller";

  const [{ value: adminCount }] = await db
    .select({ value: count() })
    .from(user)
    .where(eq(user.role, "admin"));

  // ── Seller / Admin dashboard ──────────────────────────────────────────────
  if (isSeller || isAdmin) {
    const ownListings = await db
      .select({ id: listing.id, status: listing.status, askingPrice: listing.askingPrice })
      .from(listing)
      .where(isAdmin ? undefined : eq(listing.userId, u.id));

    const listingIds = ownListings.map((l) => l.id);

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

    const published = ownListings.filter((l) => l.status === "published").length;
    const totalOffers = offerRows[0].value;
    const totalReach = reachRows.length;
    const portfolioValue = ownListings.reduce((acc, l) => acc + l.askingPrice, 0);

    return (
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        {adminCount === 0 && <SetupAdminDialog />}

        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Welcome back, {u.name}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isAdmin ? "Platform overview" : "Your seller dashboard"}
          </p>
        </div>

        <div className="rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp size={14} />
            <p className="text-xs">{isAdmin ? "Total market value" : "Portfolio value"}</p>
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {formatPrice(portfolioValue)}
          </p>
          {ownListings.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              avg {formatPriceShort(Math.round(portfolioValue / ownListings.length))} per listing
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<LayoutList size={14} />} label="Total listings" value={ownListings.length} />
          <StatCard icon={<FileText size={14} />} label="Published" value={published} accent />
          <StatCard icon={<MessageSquare size={14} />} label="Offers" value={totalOffers} />
          <StatCard icon={<Eye size={14} />} label="Reach" value={totalReach} sublabel="unique viewers" />
        </div>

        <DashboardCharts />
      </div>
    );
  }

  // ── Buyer browse ──────────────────────────────────────────────────────────
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const propertyTypeFilter = params.propertyType ?? "all";
  const priceRangeFilter = params.priceRange ?? "all";

  const filters = [eq(listing.status, "published")];

  if (query.length > 0) {
    filters.push(
      or(
        ilike(listing.title, `%${query}%`),
        ilike(listing.city, `%${query}%`),
        ilike(listing.province, `%${query}%`),
        ilike(listing.propertyType, `%${query}%`),
      )!,
    );
  }

  if (propertyTypeFilter !== "all") {
    filters.push(eq(listing.propertyType, propertyTypeFilter));
  }

  const selectedPriceRange = PRICE_RANGES.find((r) => r.value === priceRangeFilter);
  if (selectedPriceRange && selectedPriceRange.value !== "all") {
    if (typeof selectedPriceRange.min === "number") {
      filters.push(gte(listing.askingPrice, selectedPriceRange.min));
    }
    if ("max" in selectedPriceRange && typeof selectedPriceRange.max === "number") {
      filters.push(lte(listing.askingPrice, selectedPriceRange.max));
    }
  }

  const [listings, propertyTypesFromListings, [availablePropertiesRow]] = await Promise.all([
    db
      .select({
        id: listing.id,
        title: listing.title,
        city: listing.city,
        province: listing.province,
        propertyType: listing.propertyType,
        lotArea: listing.lotArea,
        askingPrice: listing.askingPrice,
        sellerName: user.name,
        sellerUsername: user.username,
      })
      .from(listing)
      .leftJoin(user, eq(listing.userId, user.id))
      .where(and(...filters))
      .orderBy(desc(listing.createdAt))
      .limit(48),
    db
      .select({ propertyType: listing.propertyType })
      .from(listing)
      .where(eq(listing.status, "published"))
      .groupBy(listing.propertyType)
      .orderBy(listing.propertyType),
    db
      .select({ value: count() })
      .from(listing)
      .where(eq(listing.status, "published")),
  ]);

  const listingIds = listings.map((l) => l.id);
  const listingPhotos = listingIds.length
    ? await db
      .select({ listingId: listingPhoto.listingId, url: listingPhoto.url })
      .from(listingPhoto)
      .where(inArray(listingPhoto.listingId, listingIds))
      .orderBy(desc(listingPhoto.cover), desc(listingPhoto.createdAt))
    : [];

  const coverByListing = new Map<string, string>();
  for (const photo of listingPhotos) {
    if (!coverByListing.has(photo.listingId)) {
      coverByListing.set(photo.listingId, photo.url);
    }
  }

  const availablePropertiesCount = availablePropertiesRow?.value ?? 0;
  const allPropertyTypeOptions = Array.from(
    new Set([
      ...listingPropertyTypes,
      ...propertyTypesFromListings.map((r) => r.propertyType),
    ]),
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      {adminCount === 0 && <SetupAdminDialog />}

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Browse listings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{availablePropertiesCount} properties available</p>
      </div>

      <ListingFilterBar
        query={query}
        propertyTypeFilter={propertyTypeFilter}
        priceRangeFilter={priceRangeFilter}
        propertyTypeOptions={allPropertyTypeOptions}
        clearHref="/"
      />

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {listings.length} result{listings.length !== 1 ? "s" : ""}
          {(query.length > 0 || propertyTypeFilter !== "all" || priceRangeFilter !== "all") && " matching filters"}
        </h2>

        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">No listings match your filters.</p>
            <Link
              href="/"
              className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((item) => (
              <ListingCard
                key={item.id}
                item={{ ...item, coverUrl: coverByListing.get(item.id) }}
              />
            ))}
          </div>
        )}
      </div>
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
