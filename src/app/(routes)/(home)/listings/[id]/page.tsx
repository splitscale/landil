import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, and, count } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { listing } from "@/db/schema/listings";
import { offer } from "@/db/schema/marketplace";
import { requireRole } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/get-session";
import { MapPin, FileText, MessageSquare, Sparkles } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [l] = await db.select({ title: listing.title }).from(listing).where(eq(listing.id, id));
  return { title: l ? l.title : "Listing not found" };
}

function formatPrice(pesos: number) {
  return `₱${pesos.toLocaleString("en-PH")}`;
}

export default async function ListingDetailPage({ params }: Props) {
  await requireRole("seller", "admin");
  const { id } = await params;
  const session = await getServerSession();

  const [l] = await db
    .select()
    .from(listing)
    .where(and(eq(listing.id, id), eq(listing.userId, session!.user.id)));

  if (!l) notFound();

  const [{ value: offerCount }] = await db
    .select({ value: count() })
    .from(offer)
    .where(eq(offer.listingId, id));

  const isPro = (session!.user as { plan?: string }).plan === "pro";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{l.title}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin size={12} />
            {l.city}, {l.province}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
          l.status === "published" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}>
          {l.status}
        </span>
      </div>

      {/* Key details */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Asking price", value: formatPrice(l.askingPrice) },
          { label: "Lot area", value: `${l.lotArea} sqm` },
          { label: "Property type", value: l.propertyType },
          { label: "Title type", value: l.titleType },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border p-3">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      {l.description && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Description</p>
          <p className="text-sm leading-relaxed">{l.description}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        {/* Offers inbox */}
        {isPro ? (
          <Link
            href={`/listings/${id}/offers`}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <MessageSquare size={14} />
            Offers
            {offerCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                {offerCount}
              </span>
            )}
          </Link>
        ) : (
          <span className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground cursor-not-allowed opacity-60">
            <MessageSquare size={14} />
            Offers
            <span className="flex items-center gap-0.5 text-[10px] text-primary">
              <Sparkles size={9} /> Pro
            </span>
          </span>
        )}

        <Link
          href={`/listings/${id}/docs`}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <FileText size={14} />
          Documents
        </Link>
      </div>
    </div>
  );
}
