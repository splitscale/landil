import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/get-session";
import { db } from "@/db";
import { listing } from "@/db/schema/listings";
import { offer } from "@/db/schema/marketplace";
import { createNotification } from "@/lib/notifications";

const BodySchema = z.object({
  amount: z.number().int().positive(),
  note: z.string().max(1000).optional(),
  sqm: z.number().positive().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const u = session.user as { id: string; role?: string };

  const [l] = await db
    .select({
      id: listing.id,
      userId: listing.userId,
      title: listing.title,
      status: listing.status,
    })
    .from(listing)
    .where(eq(listing.id, id));

  if (!l || (l.status !== "published" && l.status !== "sold")) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (l.userId === u.id) {
    return NextResponse.json({ error: "Cannot offer on own listing" }, { status: 400 });
  }

  // One offer per buyer per listing
  const [existing] = await db
    .select({ id: offer.id })
    .from(offer)
    .where(and(eq(offer.listingId, id), eq(offer.buyerId, u.id)));

  if (existing) {
    return NextResponse.json({ error: "You already have an active offer on this listing" }, { status: 409 });
  }

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const newOffer = {
    id: crypto.randomUUID(),
    listingId: id,
    buyerId: u.id,
    amount: parsed.data.amount,
    note: parsed.data.note ?? null,
    sqm: parsed.data.sqm ?? null,
  };

  await db.insert(offer).values(newOffer);

  // Notify seller (in-app + email)
  await createNotification({
    userId: l.userId,
    type: "new_offer",
    title: "New offer received",
    body: `Someone made an offer on "${l.title}"`,
    relatedId: newOffer.id,
  });

  return NextResponse.json({ id: newOffer.id }, { status: 201 });
}
