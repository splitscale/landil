import { NextRequest, NextResponse } from "next/server";
import { inArray, and, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { getServerSession } from "@/lib/auth/get-session";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), ids: z.array(z.string()).min(1) }),
  z.object({ action: z.literal("setRole"), ids: z.array(z.string()).min(1), value: z.enum(["admin", "seller", "buyer"]) }),
  z.object({ action: z.literal("setPlan"), ids: z.array(z.string()).min(1), value: z.enum(["free", "pro"]) }),
  z.object({ action: z.literal("setVerified"), ids: z.array(z.string()).min(1), value: z.boolean() }),
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
    // Never delete self
    await db.delete(user).where(and(inArray(user.id, ids), ne(user.id, session.user.id)));
  } else if (action === "setRole") {
    await db.update(user).set({ role: parsed.data.value }).where(inArray(user.id, ids));
  } else if (action === "setPlan") {
    await db.update(user).set({ plan: parsed.data.value }).where(inArray(user.id, ids));
  } else if (action === "setVerified") {
    await db.update(user).set({ verified: parsed.data.value }).where(inArray(user.id, ids));
  }

  return NextResponse.json({ ok: true });
}
