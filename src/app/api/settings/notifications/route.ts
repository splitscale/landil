import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/get-session";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import type { NotifPrefs } from "@/db/schema/auth/user";

const PrefsSchema = z.object({
  email: z.record(z.string(), z.boolean()),
  inApp: z.record(z.string(), z.boolean()),
});

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const u = session.user as { id: string };
  const [row] = await db
    .select({ notificationPrefs: user.notificationPrefs })
    .from(user)
    .where(eq(user.id, u.id))
    .limit(1);

  return NextResponse.json({ prefs: row?.notificationPrefs ?? null });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const u = session.user as { id: string };
  const raw = await req.json();
  const parsed = PrefsSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const prefs: NotifPrefs = parsed.data;
  await db.update(user).set({ notificationPrefs: prefs }).where(eq(user.id, u.id));

  return NextResponse.json({ ok: true });
}
