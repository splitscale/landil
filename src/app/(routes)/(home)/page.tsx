import { type Metadata } from "next";
import { getServerSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { LayoutList, MapPin, Search } from "lucide-react";
import { and, count, desc, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { listing, listingPhoto } from "@/db/schema/listings";
import { offer } from "@/db/schema/marketplace";
import { user } from "@/db/schema/auth/user";
import SetupAdminDialog from "./components/setup-admin-dialog";
import { propertyTypes as listingPropertyTypes } from "@/app/(routes)/(home)/listings/new/validate";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your land listings, review bids, and track due diligence from your Landil dashboard.",
};

function formatPrice(pesos: number) {
  return `₱${pesos.toLocaleString("en-PH")}`;
}

type HomePageProps = {
  searchParams: Promise<{
    q?: string;
    propertyType?: string;
    priceRange?: string;
  }>;
};

const PRICE_RANGES = [
  { value: "all", label: "All price ranges" },
  { value: "under-1m", label: "Under PHP 1M", min: 0, max: 999_999 },
  { value: "1m-3m", label: "PHP 1M - 3M", min: 1_000_000, max: 3_000_000 },
  { value: "3m-5m", label: "PHP 3M - 5M", min: 3_000_000, max: 5_000_000 },
  { value: "5m-10m", label: "PHP 5M - 10M", min: 5_000_000, max: 10_000_000 },
  { value: "over-10m", label: "Over PHP 10M", min: 10_000_001 },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  min?: number;
  max?: number;
}>;

export default async function Home({ searchParams }: HomePageProps) {
  const me = await getServerSession();
  if (!me) redirect("/signin");

  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const propertyTypeFilter = params.propertyType ?? "all";
  const priceRangeFilter = params.priceRange ?? "all";
  const canCreateListing = me.user.role === "seller" || me.user.role === "admin";

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

  const selectedPriceRange = PRICE_RANGES.find((item) => item.value === priceRangeFilter);
  if (selectedPriceRange && selectedPriceRange.value !== "all") {
    if (typeof selectedPriceRange.min === "number") {
      filters.push(gte(listing.askingPrice, selectedPriceRange.min));
    }
    if ("max" in selectedPriceRange && typeof selectedPriceRange.max === "number") {
      filters.push(lte(listing.askingPrice, selectedPriceRange.max));
    }
  }

  const [[adminCountRow], listings, propertyTypesFromListings, [availablePropertiesRow], buyerOffers] = await Promise.all([
    db
      .select({ value: count() })
      .from(user)
      .where(eq(user.role, "admin")),
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
      .limit(24),
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
    db
      .select({ listingId: offer.listingId, status: offer.status })
      .from(offer)
      .where(eq(offer.buyerId, me.user.id)),
  ]);

  const listingIds = listings.map((item) => item.id);
  const listingPhotos = listingIds.length
    ? await db
      .select({
        listingId: listingPhoto.listingId,
        url: listingPhoto.url,
      })
      .from(listingPhoto)
      .where(inArray(listingPhoto.listingId, listingIds))
      .orderBy(desc(listingPhoto.cover), desc(listingPhoto.createdAt))
    : [];

  const firstPhotoByListingId = new Map<string, string>();
  for (const photo of listingPhotos) {
    if (!firstPhotoByListingId.has(photo.listingId)) {
      firstPhotoByListingId.set(photo.listingId, photo.url);
    }
  }

  const adminCount = adminCountRow?.value ?? 0;
  const availablePropertiesCount = availablePropertiesRow?.value ?? 0;
  const trackedListingsCount = new Set(buyerOffers.map((item) => item.listingId)).size;
  const activeOffersCount = buyerOffers.filter((item) => item.status === "pending" || item.status === "countered").length;
  const allPropertyTypeOptions = Array.from(
    new Set([
      ...listingPropertyTypes,
      ...propertyTypesFromListings.map((item) => item.propertyType),
    ]),
  );

  const hasActiveFilters = query.length > 0 || propertyTypeFilter !== "all" || priceRangeFilter !== "all";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      {adminCount === 0 && <SetupAdminDialog />}

      <div className="rounded-2xl border border-border bg-linear-to-br from-muted/60 via-background to-background p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {me.user.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Find active listings faster with search and filters.</p>
          </div>

          {canCreateListing && (
            <Link
              href="/listings/new"
              className={cn(buttonVariants({ variant: "default" }), "w-full gap-2 sm:w-auto")}
            >
              <LayoutList size={14} />
              Create new listing
            </Link>
          )}
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Available properties</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{availablePropertiesCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Total listings you can browse right now</p>
        </article>

        <article className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Tracked listings</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{trackedListingsCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Listings where you have submitted offers</p>
        </article>

        <article className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active offers</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{activeOffersCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Offers pending seller response or counter</p>
        </article>
      </section>

      <form className="rounded-xl border border-border/60 bg-background/60 p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr,1fr,1fr,auto]">
          <label className="relative lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search by title, city, province, or type"
              className="h-9 w-full rounded-lg border border-input/70 bg-background pl-9 pr-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </label>

          <select
            name="propertyType"
            defaultValue={propertyTypeFilter}
            className="h-9 w-full rounded-lg border border-input/70 bg-background px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="all">All property types</option>
            {allPropertyTypeOptions.map((propertyType) => (
              <option key={propertyType} value={propertyType}>
                {propertyType}
              </option>
            ))}
          </select>

          <select
            name="priceRange"
            defaultValue={priceRangeFilter}
            className="h-9 w-full rounded-lg border border-input/70 bg-background px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {PRICE_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className={cn(buttonVariants({ variant: "secondary" }), "h-9 w-full rounded-lg px-4 md:w-auto")}
          >
            Apply filters
          </button>
        </div>

        {hasActiveFilters && (
          <div className="mt-2">
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-1 text-muted-foreground")}
            >
              Clear filters
            </Link>
          </div>
        )}
      </form>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {listings.length} published listing{listings.length === 1 ? "" : "s"}
        </h2>

        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No listings match your current filters.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((item) => (
              <article key={item.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 overflow-hidden rounded-lg border border-border/70 bg-muted/40">
                  {firstPhotoByListingId.get(item.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={firstPhotoByListingId.get(item.id)}
                      alt={`${item.title} property image`}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center text-xs text-muted-foreground">
                      No property image
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin size={10} />
                      {item.city}, {item.province}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    {item.propertyType}
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold">{formatPrice(item.askingPrice)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.lotArea} sqm</p>

                {item.sellerUsername && (
                  <Link
                    href={`/u/${item.sellerUsername}`}
                    className="mt-3 inline-flex text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Seller: {item.sellerName ?? item.sellerUsername}
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}