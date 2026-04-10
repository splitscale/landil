import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { getServerSession } from "@/lib/auth/get-session";

const Body = z.object({
  role: z.enum(["admin", "seller", "buyer"]),
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

  await db.update(user).set({ role: parsed.data.role }).where(eq(user.id, id));
  return NextResponse.json({ ok: true });
}
