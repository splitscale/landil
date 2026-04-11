import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/get-session";
import { db } from "@/db";
import { offer } from "@/db/schema/marketplace";
import { listing } from "@/db/schema/listings";
import { user } from "@/db/schema/auth/user";
import { getPublisher, offerChannel } from "@/lib/redis";

type Params = { params: Promise<{ id: string; offerId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, offerId } = await params;
  const u = session.user as { id: string };

  const [o] = await db
    .select({
      buyerId: offer.buyerId,
      sellerId: listing.userId,
      senderName: user.name,
    })
    .from(offer)
    .leftJoin(listing, eq(offer.listingId, listing.id))
    .leftJoin(user, eq(user.id, u.id))
    .where(and(eq(offer.id, offerId), eq(offer.listingId, id)));

  if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (u.id !== o.buyerId && u.id !== o.sellerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const pub = getPublisher();
    await pub.publish(
      offerChannel(offerId),
      JSON.stringify({ type: "typing", senderId: u.id, senderName: o.senderName }),
    );
  } catch {
    // Redis unavailable — typing indicator just won't show
  }

  return NextResponse.json({ ok: true });
}
