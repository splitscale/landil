import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { listing } from "@/db/schema/listings";
import { offer } from "@/db/schema/marketplace";
import { user } from "@/db/schema/auth/user";
import { requireRole } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/get-session";
import UpgradePrompt from "@/app/(routes)/(home)/components/upgrade-prompt";

export const metadata: Metadata = { title: "Offers" };

type Props = { params: Promise<{ id: string }> };

function formatPrice(pesos: number) {
  return `₱${pesos.toLocaleString("en-PH")}`;
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  accepted: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
  countered: "bg-yellow-500/10 text-yellow-600",
  withdrawn: "bg-muted text-muted-foreground line-through",
};

export default async function OffersPage({ params }: Props) {
  await requireRole("seller", "admin");
  const { id } = await params;
  const session = await getServerSession();
  const isPro = (session!.user as { plan?: string }).plan === "pro";

  // Verify listing belongs to seller
  const [l] = await db
    .select({ id: listing.id, title: listing.title })
    .from(listing)
    .where(and(eq(listing.id, id), eq(listing.userId, session!.user.id)));

  if (!l) notFound();

  if (!isPro) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-xl font-semibold tracking-tight">Offers — {l.title}</h1>
        <UpgradePrompt feature="Offers inbox" />
      </div>
    );
  }

  const offers = await db
    .select({
      id: offer.id,
      amount: offer.amount,
      status: offer.status,
      note: offer.note,
      createdAt: offer.createdAt,
      buyerName: user.name,
      buyerUsername: user.username,
      buyerEmail: user.email,
    })
    .from(offer)
    .leftJoin(user, eq(offer.buyerId, user.id))
    .where(eq(offer.listingId, id))
    .orderBy(offer.createdAt);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">
        Offers — {l.title}
        <span className="ml-2 text-sm font-normal text-muted-foreground">{offers.length} total</span>
      </h1>

      {offers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No offers yet.</p>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => (
            <div key={o.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold">{formatPrice(o.amount)}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {o.buyerName}
                    {o.buyerUsername && <span className="ml-1 text-xs">@{o.buyerUsername}</span>}
                  </p>
                  {o.buyerEmail && (
                    <a href={`mailto:${o.buyerEmail}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {o.buyerEmail}
                    </a>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[o.status] ?? "bg-muted text-muted-foreground"}`}>
                  {o.status}
                </span>
              </div>
              {o.note && (
                <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm italic text-muted-foreground">
                  "{o.note}"
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">{formatDate(o.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
