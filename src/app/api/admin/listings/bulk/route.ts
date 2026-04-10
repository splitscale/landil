import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { listing } from "@/db/schema/listings";
import { getServerSession } from "@/lib/auth/get-session";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), ids: z.array(z.string()).min(1) }),
  z.object({ action: z.literal("setStatus"), ids: z.array(z.string()).min(1), value: z.enum(["draft", "published"]) }),
]);

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await req.json();
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { action, ids } = parsed.data;

  if (action === "delete") {
    await db.delete(listing).where(inArray(listing.id, ids));
  } else if (action === "setStatus") {
    await db.update(listing).set({ status: parsed.data.value }).where(inArray(listing.id, ids));
  }

  return NextResponse.json({ ok: true });
}
