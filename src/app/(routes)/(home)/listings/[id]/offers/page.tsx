import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { listing } from "@/db/schema/listings";
import { offer } from "@/db/schema/marketplace";
import { user } from "@/db/schema/auth/user";
import { requireRole } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/get-session";
import UpgradePrompt from "@/app/(routes)/(home)/components/upgrade-prompt";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Offers" };

type Props = { params: Promise<{ id: string }> };

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  accepted:  "bg-primary/10 text-primary",
  rejected:  "bg-destructive/10 text-destructive",
  countered: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  withdrawn: "bg-muted text-muted-foreground line-through",
};

export default async function OffersPage({ params }: Props) {
  await requireRole("seller", "admin");
  const { id } = await params;
  const session = await getServerSession();
  const u = session!.user as { id: string; plan?: string; role?: string };
  const isPro = u.plan === "pro" || u.role === "admin";
  const isAdmin = u.role === "admin";

  // Verify listing belongs to seller (admin sees all)
  const [l] = await db
    .select({ id: listing.id, title: listing.title, status: listing.status, userId: listing.userId })
    .from(listing)
    .where(isAdmin ? eq(listing.id, id) : and(eq(listing.id, id), eq(listing.userId, u.id)));

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
      sqm: offer.sqm,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
      buyerName: user.name,
      buyerUsername: user.username,
      buyerEmail: user.email,
    })
    .from(offer)
    .leftJoin(user, eq(offer.buyerId, user.id))
    .where(eq(offer.listingId, id))
    .orderBy(offer.createdAt);

  const stats = {
    pending:   offers.filter((o) => o.status === "pending").length,
    accepted:  offers.filter((o) => o.status === "accepted").length,
    rejected:  offers.filter((o) => o.status === "rejected").length,
    countered: offers.filter((o) => o.status === "countered").length,
    withdrawn: offers.filter((o) => o.status === "withdrawn").length,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Offers — {l.title}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {offers.length} total
          {l.status === "sold" && (
            <span className="ml-2 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
              Sold
            </span>
          )}
        </p>
      </div>

      {/* Stats bar */}
      {offers.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Pending", count: stats.pending, style: "text-amber-600 dark:text-amber-400" },
            { label: "Accepted", count: stats.accepted, style: "text-primary" },
            { label: "Rejected", count: stats.rejected, style: "text-destructive" },
            { label: "Countered", count: stats.countered, style: "text-blue-600 dark:text-blue-400" },
          ].map(({ label, count, style }) => (
            <div key={label} className="rounded-lg border border-border p-3">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className={`mt-0.5 text-xl font-semibold tabular-nums ${style}`}>{count}</p>
            </div>
          ))}
        </div>
      )}

      {offers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No offers yet.</p>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => (
            <Link
              key={o.id}
              href={`/listings/${id}/offers/${o.id}`}
              className="block rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold">{formatPrice(o.amount)}</p>
                  {o.sqm && (
                    <p className="text-xs text-muted-foreground">{o.sqm} sqm</p>
                  )}
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {o.buyerName}
                    {o.buyerUsername && <span className="ml-1 text-xs">@{o.buyerUsername}</span>}
                  </p>
                  {o.buyerEmail && (
                    <span className="text-xs text-muted-foreground">{o.buyerEmail}</span>
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
