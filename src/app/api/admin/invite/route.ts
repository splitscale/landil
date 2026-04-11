import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminInvite } from "@/db/schema/auth";
import { getServerSession } from "@/lib/auth/get-session";
import { sendEmail } from "@/lib/email";

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

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const inviteUrl = `${base}/invite/${token}`;

  // Email the generating admin the invite link so they can share it
  await sendEmail({
    to: session.user.email,
    subject: "Your admin invite link — Landil",
    html: `
      <p>You generated an admin invite link. Share it with the person you want to promote:</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      <p>This link expires in 7 days and can only be used once.</p>
    `,
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
