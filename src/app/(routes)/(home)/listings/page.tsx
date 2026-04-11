import { type Metadata } from "next";
import { eq, desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { listing, listingPhoto } from "@/db/schema/listings";
import { requireRole } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/get-session";
import ListingCard from "@/app/(routes)/(home)/components/listing-card";

export const metadata: Metadata = { title: "My listings" };

export default async function MyListingsPage() {
  await requireRole("seller", "admin");
  const session = await getServerSession();
  const userId = session!.user.id;

  const listings = await db
    .select({
      id: listing.id,
      title: listing.title,
      city: listing.city,
      province: listing.province,
      propertyType: listing.propertyType,
      lotArea: listing.lotArea,
      askingPrice: listing.askingPrice,
      status: listing.status,
    })
    .from(listing)
    .where(eq(listing.userId, userId))
    .orderBy(desc(listing.createdAt));

  const listingIds = listings.map((l) => l.id);
  const photos = listingIds.length
    ? await db
        .select({ listingId: listingPhoto.listingId, url: listingPhoto.url })
        .from(listingPhoto)
        .where(inArray(listingPhoto.listingId, listingIds))
        .orderBy(desc(listingPhoto.cover), desc(listingPhoto.createdAt))
    : [];

  const coverByListing = new Map<string, string>();
  for (const p of photos) {
    if (!coverByListing.has(p.listingId)) coverByListing.set(p.listingId, p.url);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">My listings</h1>
        <Link
          href="/listings/new"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          New listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium">No listings yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Create your first listing to start attracting buyers.</p>
          <Link
            href="/listings/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            New listing
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              item={{ ...l, coverUrl: coverByListing.get(l.id) }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
