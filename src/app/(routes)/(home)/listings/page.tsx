import { type Metadata } from "next";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { listing } from "@/db/schema/listings";
import { getServerSession } from "@/lib/auth/get-session";
import { MapPin } from "lucide-react";

export const metadata: Metadata = { title: "My listings" };

function formatPrice(pesos: number) {
  return `₱${pesos.toLocaleString("en-PH")}`;
}

export default async function MyListingsPage() {
  const session = await getServerSession();
  const userId = session!.user.id;

  const listings = await db
    .select()
    .from(listing)
    .where(eq(listing.userId, userId));

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
        <p className="text-sm text-muted-foreground">No listings yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={`/listings/${l.id}`}
              className="group rounded-xl border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin size={10} />
                    {l.city}, {l.province}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                  {l.propertyType}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold">{formatPrice(l.askingPrice)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{l.lotArea} sqm</p>
              <p className="mt-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                {l.status}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
