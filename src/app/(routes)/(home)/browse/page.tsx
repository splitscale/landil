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
import { formatPrice } from "@/lib/format";
import { PRICE_RANGES, OFFER_STATUS_LABEL } from "@/lib/listings-browse";
import ListingCard from "../components/listing-card";
import ListingFilterBar from "../components/listing-filter-bar";

export const metadata: Metadata = { title: "Browse listings" };

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

      <ListingFilterBar
        query={query}
        propertyTypeFilter={propertyTypeFilter}
        priceRangeFilter={priceRangeFilter}
        propertyTypeOptions={propertyTypeOptions}
        clearHref="/browse"
      />

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
