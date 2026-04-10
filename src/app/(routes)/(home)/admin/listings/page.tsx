import { type Metadata } from "next";
import { db } from "@/db";
import { listing } from "@/db/schema/listings";
import { user } from "@/db/schema/auth/user";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/roles";
import ListingStatusRow from "./listing-status-row";

export const metadata: Metadata = { title: "Listings · Admin" };

export default async function AdminListingsPage() {
  await requireRole("admin");

  const listings = await db
    .select({
      id: listing.id,
      title: listing.title,
      status: listing.status,
      propertyType: listing.propertyType,
      city: listing.city,
      province: listing.province,
      askingPrice: listing.askingPrice,
      createdAt: listing.createdAt,
      sellerName: user.name,
      sellerUsername: user.username,
    })
    .from(listing)
    .leftJoin(user, eq(listing.userId, user.id))
    .orderBy(listing.createdAt);

  return (
    <div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Listing</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Seller</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <ListingStatusRow key={l.id} listing={l} />
            ))}
          </tbody>
        </table>

        {listings.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No listings yet.</p>
        )}
      </div>
    </div>
  );
}
