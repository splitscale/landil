import { type Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { listing } from "@/db/schema/listings";
import { offer, offerMessage } from "@/db/schema/marketplace";
import { user } from "@/db/schema/auth/user";
import { getServerSession } from "@/lib/auth/get-session";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import OfferThreadClient from "../offer-thread-client";

export const metadata: Metadata = { title: "My Offer" };
type Props = { params: Promise<{ id: string }> };

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

export default async function MyOfferPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) redirect("/signin");

  const u = session.user as { id: string };

  const [o] = await db
    .select({
      id: offer.id,
      amount: offer.amount,
      status: offer.status,
      note: offer.note,
      createdAt: offer.createdAt,
      listingTitle: listing.title,
      listingId: offer.listingId,
      sellerId: listing.userId,
    })
    .from(offer)
    .leftJoin(listing, eq(offer.listingId, listing.id))
    .where(and(eq(offer.listingId, id), eq(offer.buyerId, u.id)));

  if (!o) notFound();

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
    .where(eq(offerMessage.offerId, o.id))
    .orderBy(asc(offerMessage.createdAt));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div>
        <Link
          href={`/listings/${id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={12} />
          Back to listing
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">{o.listingTitle}</h1>
      </div>

      {/* Offer summary */}
      <div className="rounded-xl border border-border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold">{formatPrice(o.amount)}</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[o.status] ?? ""}`}>
            {o.status}
          </span>
        </div>
        {o.note && (
          <p className="rounded-lg bg-muted/50 p-3 text-sm italic text-muted-foreground">"{o.note}"</p>
        )}
        <p className="text-xs text-muted-foreground">
          Submitted {new Date(o.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
        </p>
      </div>

      {/* Thread */}
      <OfferThreadClient
        offerId={o.id}
        listingId={id}
        currentUserId={u.id}
        messages={messages.map((m) => ({
          id: m.id,
          content: m.content,
          senderId: m.senderId!,
          senderName: m.senderName ?? "Unknown",
          createdAt: new Date(m.createdAt).toISOString(),
        }))}
        canWithdraw={o.status === "pending" || o.status === "countered"}
        isBuyer
      />
    </div>
  );
}
