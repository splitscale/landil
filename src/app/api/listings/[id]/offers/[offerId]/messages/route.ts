import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/get-session";
import { db } from "@/db";
import { listing } from "@/db/schema/listings";
import { offer, offerMessage } from "@/db/schema/marketplace";
import { createNotification } from "@/lib/notifications";

const BodySchema = z.object({ content: z.string().min(1).max(2000) });

type Params = { params: Promise<{ id: string; offerId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, offerId } = await params;
  const u = session.user as { id: string };

  const [o] = await db
    .select({
      id: offer.id,
      buyerId: offer.buyerId,
      sellerId: listing.userId,
      listingTitle: listing.title,
    })
    .from(offer)
    .leftJoin(listing, eq(offer.listingId, listing.id))
    .where(and(eq(offer.id, offerId), eq(offer.listingId, id)));

  if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only buyer or seller can message
  if (u.id !== o.buyerId && u.id !== o.sellerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const msg = {
    id: crypto.randomUUID(),
    offerId,
    senderId: u.id,
    content: parsed.data.content,
  };

  await db.insert(offerMessage).values(msg);

  // Notify other party
  const recipientId = u.id === o.buyerId ? o.sellerId : o.buyerId;
  if (recipientId) {
    await createNotification({
      userId: recipientId,
      type: "offer_message",
      title: "New message",
      body: `New message on offer for "${o.listingTitle}"`,
      relatedId: offerId,
    });
  }

  return NextResponse.json({ id: msg.id }, { status: 201 });
}
