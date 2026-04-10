import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminInvite } from "@/db/schema/auth";
import { getServerSession } from "@/lib/auth/get-session";

export async function POST() {
  const session = await getServerSession();
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(adminInvite).values({
    token,
    createdBy: session.user.id,
    expiresAt,
  });

  return NextResponse.json({ token }, { status: 201 });
}

export async function GET() {
  const session = await getServerSession();
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await db.select().from(adminInvite).orderBy(adminInvite.createdAt);
  return NextResponse.json(invites);
}
