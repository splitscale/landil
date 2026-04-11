import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { and, count, desc, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { listing, listingPhoto } from "@/db/schema/listings";
import { offer } from "@/db/schema/marketplace";
import { user } from "@/db/schema/auth/user";
import { getServerSession } from "@/lib/auth/get-session";
import { propertyTypes as listingPropertyTypes } from "@/app/(routes)/(home)/listings/new/validate";
import { MapPin, Search, X } from "lucide-react";

export const metadata: Metadata = { title: "Browse listings" };

const PRICE_RANGES = [
  { value: "all", label: "All price ranges" },
  { value: "under-1m", label: "Under PHP 1M", min: 0, max: 999_999 },
  { value: "1m-3m", label: "PHP 1M – 3M", min: 1_000_000, max: 3_000_000 },
  { value: "3m-5m", label: "PHP 3M – 5M", min: 3_000_000, max: 5_000_000 },
  { value: "5m-10m", label: "PHP 5M – 10M", min: 5_000_000, max: 10_000_000 },
  { value: "over-10m", label: "Over PHP 10M", min: 10_000_001 },
] as const satisfies ReadonlyArray<{ value: string; label: string; min?: number; max?: number }>;

const OFFER_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending",   color: "text-amber-600 dark:text-amber-400" },
  accepted:  { label: "Accepted",  color: "text-green-600 dark:text-green-400" },
  rejected:  { label: "Rejected",  color: "text-destructive" },
  countered: { label: "Countered", color: "text-blue-600 dark:text-blue-400" },
  withdrawn: { label: "Withdrawn", color: "text-muted-foreground" },
};

function formatPrice(pesos: number) {
  return `₱${pesos.toLocaleString("en-PH")}`;
}

type BrowsePageProps = {
  searchParams: Promise<{
    q?: string;
    propertyType?: string;
    priceRange?: string;
  }>;
};

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const session = await getServerSession();
  if (!session) redirect("/signin");

  const u = session.user as { id: string; role?: string | null };

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

  const [listings, propertyTypesFromDB, [totalRow], myOffers] = await Promise.all([
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

    db
      .select({
        id: offer.id,
        listingId: offer.listingId,
        listingTitle: listing.title,
        amount: offer.amount,
        status: offer.status,
        updatedAt: offer.updatedAt,
      })
      .from(offer)
      .leftJoin(listing, eq(offer.listingId, listing.id))
      .where(eq(offer.buyerId, u.id))
      .orderBy(desc(offer.updatedAt))
      .limit(5),
  ]);

  // Cover photos for listing cards
  const listingIds = listings.map((l) => l.id);
  const photos = listingIds.length
    ? await db
        .select({ listingId: listingPhoto.listingId, url: listingPhoto.url })
        .from(listingPhoto)
        .where(inArray(listingPhoto.listingId, listingIds))
        .orderBy(desc(listingPhoto.cover))
    : [];

  const coverByListing = new Map<string, string>();
  for (const p of photos) {
    if (!coverByListing.has(p.listingId)) coverByListing.set(p.listingId, p.url);
  }

  const totalPublished = totalRow?.value ?? 0;
  const propertyTypeOptions = Array.from(
    new Set([...listingPropertyTypes, ...propertyTypesFromDB.map((r) => r.propertyType)]),
  );
  const hasFilters = query.length > 0 || propertyTypeFilter !== "all" || priceRangeFilter !== "all";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Browse listings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalPublished} propert{totalPublished !== 1 ? "ies" : "y"} available
          </p>
        </div>
        {myOffers.length > 0 && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {myOffers.filter((o) => o.status === "pending" || o.status === "countered").length}
            </span>{" "}
            active offer{myOffers.filter((o) => o.status === "pending" || o.status === "countered").length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Filters — single grouped row */}
      <form>
        <div className="flex h-10 w-full overflow-hidden rounded-lg border border-input shadow-xs bg-background focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 transition-[color,box-shadow] dark:bg-input/30">
          {/* Search */}
          <label className="relative flex min-w-0 flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 size-4 shrink-0 text-muted-foreground" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search listings…"
              className="h-full w-full border-0 bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>

          <div className="w-px self-stretch bg-input" />

          {/* Property type */}
          <select
            name="propertyType"
            defaultValue={propertyTypeFilter}
            className="h-full cursor-pointer border-0 bg-transparent px-3 text-sm text-foreground outline-none"
          >
            <option value="all">All types</option>
            {propertyTypeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="w-px self-stretch bg-input" />

          {/* Price range */}
          <select
            name="priceRange"
            defaultValue={priceRangeFilter}
            className="h-full cursor-pointer border-0 bg-transparent px-3 text-sm text-foreground outline-none"
          >
            {PRICE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <div className="w-px self-stretch bg-input" />

          {/* Submit */}
          <button
            type="submit"
            className="h-full rounded-r-[calc(0.5rem-1px)] bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none"
          >
            Search
          </button>
        </div>

        {hasFilters && (
          <div className="mt-2 flex items-center gap-1.5">
            <Link
              href="/browse"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={11} />
              Clear filters
            </Link>
          </div>
        )}
      </form>

      {/* Listings grid */}
      <div>
        <p className="mb-3 text-sm text-muted-foreground">
          {listings.length} result{listings.length !== 1 ? "s" : ""}
          {hasFilters && " matching filters"}
        </p>

        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">No listings match your filters.</p>
            <Link
              href="/browse"
              className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((item) => {
              const cover = coverByListing.get(item.id);
              return (
                <article key={item.id} className="group rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
                  <Link href={`/listings/${item.id}`} className="block p-4">
                    <div className="mb-3 overflow-hidden rounded-lg border border-border/70 bg-muted/40">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt={`${item.title} property photo`}
                          className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-40 w-full items-center justify-center text-xs text-muted-foreground">
                          No photo
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
                  </Link>

                  {item.sellerUsername && (
                    <div className="border-t border-border/60 px-4 py-2">
                      <Link
                        href={`/u/${item.sellerUsername}`}
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        by {item.sellerName ?? item.sellerUsername}
                      </Link>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* My offer activity (buyers) */}
      {myOffers.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">My offer activity</h2>
          <div className="divide-y divide-border rounded-xl border border-border">
            {myOffers.map((o) => {
              const s = OFFER_STATUS_LABEL[o.status] ?? { label: o.status, color: "text-muted-foreground" };
              return (
                <div key={o.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/listings/${o.listingId}/my-offer`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {o.listingTitle ?? "Listing"}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(o.updatedAt).toLocaleDateString("en-PH", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">{formatPrice(o.amount)}</p>
                    <p className={`text-xs font-medium ${s.color}`}>{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
