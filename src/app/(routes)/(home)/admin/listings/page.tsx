import { type Metadata } from "next";
import { db } from "@/db";
import { listing } from "@/db/schema/listings";
import { user } from "@/db/schema/auth/user";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/roles";
import ListingsTable from "./listings-table";

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
      <ListingsTable listings={listings} />
    </div>
  );
}
