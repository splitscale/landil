import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { listing } from "@/db/schema/listings";
import { offer, offerMessage } from "@/db/schema/marketplace";
import { user } from "@/db/schema/auth/user";
import { getServerSession } from "@/lib/auth/get-session";
import { requireRole } from "@/lib/auth/roles";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import OfferThreadClient from "../../offer-thread-client";

export const metadata: Metadata = { title: "Offer" };
type Props = { params: Promise<{ id: string; offerId: string }> };

function formatPrice(p: number) {
  return `₱${p.toLocaleString("en-PH")}`;
}

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  accepted:  "bg-primary/10 text-primary",
  rejected:  "bg-destructive/10 text-destructive",
  countered: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  withdrawn: "bg-muted text-muted-foreground line-through",
};

export default async function SellerOfferThreadPage({ params }: Props) {
  await requireRole("seller", "admin");
  const { id, offerId } = await params;
  const session = await getServerSession();
  const u = session!.user as { id: string; role?: string };
  const isAdmin = u.role === "admin";

  const [o] = await db
    .select({
      id: offer.id,
      amount: offer.amount,
      status: offer.status,
      note: offer.note,
      createdAt: offer.createdAt,
      buyerId: offer.buyerId,
      buyerName: user.name,
      buyerEmail: user.email,
      buyerUsername: user.username,
      listingTitle: listing.title,
      sellerId: listing.userId,
    })
    .from(offer)
    .leftJoin(listing, eq(offer.listingId, listing.id))
    .leftJoin(user, eq(offer.buyerId, user.id))
    .where(and(eq(offer.id, offerId), eq(offer.listingId, id)));

  if (!o) notFound();
  if (o.sellerId !== u.id && !isAdmin) notFound();

  const messages = await db
    .select({
      id: offerMessage.id,
      content: offerMessage.content,
      senderId: offerMessage.senderId,
      senderName: user.name,
      createdAt: offerMessage.createdAt,
    })
    .from(offerMessage)
    .leftJoin(user, eq(offerMessage.senderId, user.id))
    .where(eq(offerMessage.offerId, offerId))
    .orderBy(asc(offerMessage.createdAt));

  const canAct = ["pending", "countered"].includes(o.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div>
        <Link
          href={`/listings/${id}/offers`}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={12} />
          All offers
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">{o.listingTitle}</h1>
      </div>

      {/* Offer summary */}
      <div className="rounded-xl border border-border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">{formatPrice(o.amount)}</p>
            <p className="text-sm text-muted-foreground">
              {o.buyerName}
              {o.buyerUsername && <span className="ml-1 text-xs">@{o.buyerUsername}</span>}
            </p>
            {o.buyerEmail && (
              <a href={`mailto:${o.buyerEmail}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {o.buyerEmail}
              </a>
            )}
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[o.status] ?? ""}`}>
            {o.status}
          </span>
        </div>
        {o.note && (
          <p className="rounded-lg bg-muted/50 p-3 text-sm italic text-muted-foreground">"{o.note}"</p>
        )}
        <p className="text-xs text-muted-foreground">
          {new Date(o.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
        </p>
      </div>

      <OfferThreadClient
        offerId={offerId}
        listingId={id}
        currentUserId={u.id}
        messages={messages.map((m) => ({
          id: m.id,
          content: m.content,
          senderId: m.senderId!,
          senderName: m.senderName ?? "Unknown",
          createdAt: new Date(m.createdAt).toISOString(),
        }))}
        canAct={canAct}
        isBuyer={false}
      />
    </div>
  );
}
