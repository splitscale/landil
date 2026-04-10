import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { getServerSession } from "@/lib/auth/get-session";

const Body = z.object({
  role: z.enum(["admin", "seller", "buyer"]).optional(),
  verified: z.boolean().optional(),
  plan: z.enum(["free", "pro"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const raw = await req.json();
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const update: Partial<{ role: "admin" | "seller" | "buyer"; verified: boolean; plan: "free" | "pro" }> = {};
  if (parsed.data.role !== undefined) update.role = parsed.data.role;
  if (parsed.data.verified !== undefined) update.verified = parsed.data.verified;
  if (parsed.data.plan !== undefined) update.plan = parsed.data.plan;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 422 });
  }

  await db.update(user).set(update).where(eq(user.id, id));
  return NextResponse.json({ ok: true });
}
