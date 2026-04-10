import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminInvite } from "@/db/schema/auth";
import { getServerSession } from "@/lib/auth/get-session";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const session = await getServerSession();
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { token } = await params;
  await db.delete(adminInvite).where(eq(adminInvite.token, token));
  return NextResponse.json({ ok: true });
}
