import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, and, count, ne, avg, sql } from "drizzle-orm";
import { after } from "next/server";
import Link from "next/link";
import { db } from "@/db";
import { listing, listingPhoto, listingDoc } from "@/db/schema/listings";
import { offer } from "@/db/schema/marketplace";
import { user } from "@/db/schema/auth/user";
import { getServerSession } from "@/lib/auth/get-session";
import { trackListingView } from "@/lib/track-view";
import { formatPrice } from "@/lib/format";
import AnalyticsChart from "./analytics-chart";
import OffersChart from "./offers-chart";
import MakeOfferDialog from "./make-offer-dialog";
import ListingCard from "@/app/(routes)/(home)/components/listing-card";
import { MapPin, FileText, MessageSquare, Sparkles, Pencil, Globe, Lock, TrendingUp } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [l] = await db.select({ title: listing.title }).from(listing).where(eq(listing.id, id));
  return { title: l ? l.title : "Listing not found" };
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) notFound();

  const u = session.user as { id: string; plan?: string; role?: string };
  const isAdmin = u.role === "admin";

  // Fetch listing — published visible to all, draft only to owner/admin
  const [l] = await db
    .select()
    .from(listing)
    .where(eq(listing.id, id));

  if (!l) notFound();

  const isOwner = l.userId === u.id;
  const canManage = isOwner || isAdmin;

  // Draft listings only visible to owner/admin
  if (l.status === "draft" && !canManage) notFound();

  const isPro = u.plan === "pro" || isAdmin;

  const [photos, docs, sellerInfo] = await Promise.all([
    db.select().from(listingPhoto).where(eq(listingPhoto.listingId, id)).orderBy(listingPhoto.cover),
    db.select().from(listingDoc).where(eq(listingDoc.listingId, id)).orderBy(listingDoc.createdAt),
    db.select({ name: user.name, username: user.username }).from(user).where(eq(user.id, l.userId)).limit(1),
  ]);

  // For managers: offer count; for buyers: their existing offer
  let offerCount = 0;
  let buyerOffer: { id: string; amount: number; status: string } | null = null;

  if (canManage) {
    const [{ value }] = await db.select({ value: count() }).from(offer).where(eq(offer.listingId, id));
    offerCount = value;
  } else {
    const [existing] = await db
      .select({ id: offer.id, amount: offer.amount, status: offer.status })
      .from(offer)
      .where(and(eq(offer.listingId, id), eq(offer.buyerId, u.id)))
      .limit(1);
    buyerOffer = existing ?? null;
  }

  const publicDocs = docs.filter((d) => d.visibility === "public");
  const privateDocs = docs.filter((d) => d.visibility === "private");
  const seller = sellerInfo[0];

  // Comparable listings — same province, published, exclude self (buyer view)
  const comps = canManage ? [] : await db
    .select({
      id: listing.id,
      title: listing.title,
      city: listing.city,
      province: listing.province,
      askingPrice: listing.askingPrice,
      lotArea: listing.lotArea,
      propertyType: listing.propertyType,
    })
    .from(listing)
    .where(and(eq(listing.province, l.province), eq(listing.status, "published"), ne(listing.id, id)))
    .limit(4);

  // Valuation panel — avg price/sqm in same province (seller/pro view)
  let valuationData: { avgPricePerSqm: number | null; compsCount: number } | null = null;
  if (canManage && isPro) {
    const [row] = await db
      .select({
        avgPricePerSqm: avg(sql<number>`${listing.askingPrice}::float / NULLIF(${listing.lotArea}::float, 0)`),
        compsCount: count(),
      })
      .from(listing)
      .where(and(eq(listing.province, l.province), eq(listing.status, "published"), ne(listing.id, id)));
    valuationData = {
      avgPricePerSqm: row?.avgPricePerSqm ? Math.round(Number(row.avgPricePerSqm)) : null,
      compsCount: row?.compsCount ?? 0,
    };
  }

  after(() => trackListingView(id, l.userId, u.id));

  // ── Seller / Admin view ──────────────────────────────────────────────────
  if (canManage) {
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
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
              l.status === "published" ? "bg-primary/10 text-primary" :
              l.status === "sold" ? "bg-green-500/10 text-green-600 dark:text-green-400" :
              "bg-muted text-muted-foreground"
            }`}>
              {l.status}
            </span>
            <Link
              href={`/listings/${id}/edit`}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors"
            >
              <Pencil size={12} />
              Edit
            </Link>
          </div>
        </div>

        {/* Metrics */}
        <div className={`grid gap-3 ${isPro ? "grid-cols-2" : "grid-cols-1"}`}>
          <AnalyticsChart listingId={id} />
          {isPro && <OffersChart listingId={id} />}
        </div>

        {/* Valuation panel */}
        {isPro ? (
          valuationData && valuationData.compsCount > 0 ? (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <TrendingUp size={12} />
                Market valuation — {l.province}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] text-muted-foreground">Market avg/sqm</p>
                  <p className="mt-0.5 text-sm font-semibold">{formatPrice(valuationData.avgPricePerSqm ?? 0)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] text-muted-foreground">Your asking/sqm</p>
                  <p className="mt-0.5 text-sm font-semibold">{formatPrice(Math.round(l.askingPrice / parseFloat(l.lotArea)))}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] text-muted-foreground">Based on</p>
                  <p className="mt-0.5 text-sm font-semibold">{valuationData.compsCount} listing{valuationData.compsCount !== 1 ? "s" : ""}</p>
                </div>
              </div>
              {valuationData.avgPricePerSqm && (
                <p className="text-xs text-muted-foreground">
                  {Math.round(l.askingPrice / parseFloat(l.lotArea)) > valuationData.avgPricePerSqm
                    ? `Your listing is priced ${Math.round(((l.askingPrice / parseFloat(l.lotArea)) / valuationData.avgPricePerSqm - 1) * 100)}% above market average.`
                    : `Your listing is priced ${Math.round((1 - (l.askingPrice / parseFloat(l.lotArea)) / valuationData.avgPricePerSqm) * 100)}% below market average.`}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border p-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 mb-1 font-medium">
                <TrendingUp size={12} />
                Market valuation
              </div>
              Not enough comparable listings in {l.province} yet.
            </div>
          )
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-dashed border-border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp size={14} />
              Valuation panel
            </div>
            <span className="flex items-center gap-1 text-xs text-primary">
              <Sparkles size={10} />
              Pro only
            </span>
          </div>
        )}

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

        {l.description && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Description</p>
            <p className="text-sm leading-relaxed">{l.description}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 border-t border-border pt-6">
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

  // ── Buyer view ────────────────────────────────────────────────────────────
  const coverPhoto = photos.find((p) => p.cover) ?? photos[0];
  const otherPhotos = photos.filter((p) => p.id !== coverPhoto?.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      {/* Photos */}
      {photos.length > 0 && (
        <div className="space-y-2">
          {coverPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverPhoto.url}
              alt={l.title}
              className="w-full rounded-xl object-cover"
              style={{ maxHeight: 400 }}
            />
          )}
          {otherPhotos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {otherPhotos.slice(0, 4).map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.url} alt={l.title} className="h-24 w-full rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{l.title}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin size={12} />
            {l.city}, {l.province}
          </p>
          {seller?.username && (
            <Link
              href={`/u/${seller.username}`}
              className="mt-1 inline-block text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Listed by {seller.name ?? seller.username}
            </Link>
          )}
        </div>
        <p className="shrink-0 text-xl font-bold tabular-nums">{formatPrice(l.askingPrice)}</p>
      </div>

      {/* Key details */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Lot area", value: `${l.lotArea} sqm` },
          { label: "Property type", value: l.propertyType },
          { label: "Title type", value: l.titleType },
          ...(l.floorArea ? [{ label: "Floor area", value: `${l.floorArea} sqm` }] : []),
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border p-3">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>

      {l.description && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Description</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{l.description}</p>
        </div>
      )}

      {/* Public documents */}
      {publicDocs.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Globe size={11} />
            Documents
          </div>
          <div className="space-y-2">
            {publicDocs.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <FileText size={14} className="shrink-0 text-muted-foreground" />
                <span className="text-sm">{doc.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {privateDocs.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          <Lock size={12} />
          {privateDocs.length} private document{privateDocs.length !== 1 ? "s" : ""} — visible to seller only
        </div>
      )}

      {/* Offer action */}
      <div className="border-t border-border pt-6">
        {buyerOffer ? (
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">Your offer: {formatPrice(buyerOffer.amount)}</p>
              <p className="mt-0.5 text-xs capitalize text-muted-foreground">Status: {buyerOffer.status}</p>
            </div>
            <Link
              href={`/listings/${id}/my-offer`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors"
            >
              View thread
            </Link>
          </div>
        ) : (
          <MakeOfferDialog listingId={id} askingPrice={l.askingPrice} lotArea={l.lotArea} />
        )}
      </div>

      {/* Comparable listings */}
      {comps.length > 0 && (
        <div className="border-t border-border pt-6 space-y-3">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <MapPin size={11} />
            Similar listings in {l.province}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {comps.map((c) => (
              <ListingCard key={c.id} item={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
