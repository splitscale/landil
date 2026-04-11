import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { db } from "@/db";
import { offer } from "@/db/schema/marketplace";
import { listing } from "@/db/schema/listings";
import { eq, and } from "drizzle-orm";
import { createSubscriber, offerChannel } from "@/lib/redis";

type Params = { params: Promise<{ id: string; offerId: string }> };

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id, offerId } = await params;
  const u = session.user as { id: string; role?: string };
  const isAdmin = u.role === "admin";

  // Verify access: buyer or seller of this offer
  const [o] = await db
    .select({ buyerId: offer.buyerId, sellerId: listing.userId })
    .from(offer)
    .leftJoin(listing, eq(offer.listingId, listing.id))
    .where(and(eq(offer.id, offerId), eq(offer.listingId, id)));

  if (!o) return new Response("Not found", { status: 404 });
  if (o.buyerId !== u.id && o.sellerId !== u.id && !isAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  const sub = createSubscriber();

  const stream = new ReadableStream({
    async start(controller) {
      const channel = offerChannel(offerId);

      const onMessage = (_ch: string, message: string) => {
        try {
          controller.enqueue(`data: ${message}\n\n`);
        } catch {
          // Controller closed
        }
      };

      const onError = () => {
        try { controller.close(); } catch { /* */ }
        sub.disconnect();
      };

      sub.on("message", onMessage);
      sub.on("error", onError);

      try {
        await sub.subscribe(channel);
      } catch {
        controller.close();
        sub.disconnect();
        return;
      }

      // Heartbeat every 25s to keep connection alive
      const heartbeat = setInterval(() => {
        try { controller.enqueue(": heartbeat\n\n"); } catch { clearInterval(heartbeat); }
      }, 25_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        sub.unsubscribe(channel).catch(() => {});
        sub.disconnect();
        try { controller.close(); } catch { /* */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
