import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/get-session";
import { db } from "@/db";
import { listing } from "@/db/schema/listings";
import { offer } from "@/db/schema/marketplace";
import { createNotification } from "@/lib/notifications";

const BodySchema = z.object({
  status: z.enum(["accepted", "rejected", "countered", "withdrawn"]),
  counterAmount: z.number().int().positive().optional(),
});

type Params = { params: Promise<{ id: string; offerId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, offerId } = await params;
  const u = session.user as { id: string; role?: string };
  const isAdmin = u.role === "admin";

  const [o] = await db
    .select({
      id: offer.id,
      listingId: offer.listingId,
      buyerId: offer.buyerId,
      status: offer.status,
      sellerId: listing.userId,
      listingTitle: listing.title,
    })
    .from(offer)
    .leftJoin(listing, eq(offer.listingId, listing.id))
    .where(eq(offer.id, offerId));

  if (!o || o.listingId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { status, counterAmount } = parsed.data;
  const isSeller = o.sellerId === u.id;
  const isBuyer = o.buyerId === u.id;

  // Sellers can accept/reject/counter; buyers can only withdraw
  if (status === "withdrawn" && !isBuyer && !isAdmin) {
    return NextResponse.json({ error: "Only buyer can withdraw" }, { status: 403 });
  }
  if (["accepted", "rejected", "countered"].includes(status) && !isSeller && !isAdmin) {
    return NextResponse.json({ error: "Only seller can accept/reject/counter" }, { status: 403 });
  }

  const update: Record<string, unknown> = { status };
  if (status === "countered" && counterAmount) {
    update.amount = counterAmount;
  }

  await db.update(offer).set(update).where(eq(offer.id, offerId));

  // When accepted: mark listing as sold
  if (status === "accepted") {
    await db.update(listing).set({ status: "sold" }).where(eq(listing.id, id));
  }

  // Notify other party
  const notifyUserId = status === "withdrawn" ? o.sellerId! : o.buyerId;
  const notifyTitle =
    status === "accepted" ? "Offer accepted" :
    status === "rejected" ? "Offer rejected" :
    status === "countered" ? "Counter offer received" :
    "Offer withdrawn";
  const notifyBody =
    status === "accepted" ? `Your offer on "${o.listingTitle}" was accepted!` :
    status === "rejected" ? `Your offer on "${o.listingTitle}" was declined.` :
    status === "countered" ? `The seller countered your offer on "${o.listingTitle}".` :
    `An offer on "${o.listingTitle}" was withdrawn.`;

  if (notifyUserId) {
    await createNotification({
      userId: notifyUserId,
      type: `offer_${status}`,
      title: notifyTitle,
      body: notifyBody,
      relatedId: offerId,
    });
  }

  return NextResponse.json({ ok: true });
}
