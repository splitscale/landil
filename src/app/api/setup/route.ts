import { NextResponse } from "next/server";
import { eq, count } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { getServerSession } from "@/lib/auth/get-session";

export async function POST() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ value }] = await db
    .select({ value: count() })
    .from(user)
    .where(eq(user.role, "admin"));

  if (value > 0) {
    return NextResponse.json({ error: "Admin already exists" }, { status: 403 });
  }

  await db.update(user).set({ role: "admin" }).where(eq(user.id, session.user.id));
  return NextResponse.json({ ok: true });
}
