import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { adminInvite, user } from "@/db/schema/auth";
import { getServerSession } from "@/lib/auth/get-session";
import { ShieldCheck, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Admin Invite" };

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const session = await getServerSession();

  const [invite] = await db
    .select()
    .from(adminInvite)
    .where(eq(adminInvite.token, token));

  const isExpired = invite && invite.expiresAt < new Date();
  const isUsed = invite && invite.usedAt !== null;
  const isValid = invite && !isExpired && !isUsed;

  // If valid invite and signed in — claim it
  if (isValid && session) {
    await db.transaction(async (tx) => {
      await tx.update(user).set({ role: "admin" }).where(eq(user.id, session.user.id));
      await tx
        .update(adminInvite)
        .set({ usedAt: new Date(), usedBy: session.user.id })
        .where(eq(adminInvite.token, token));
    });
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck size={22} className="text-primary" />
          </div>
        </div>

        {!invite || isExpired || isUsed ? (
          <>
            <h1 className="text-lg font-semibold">Invite invalid</h1>
            <p className="text-sm text-muted-foreground">
              {!invite
                ? "This invite link doesn't exist."
                : isExpired
                ? "This invite has expired."
                : "This invite has already been used."}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold">You've been invited</h1>
            <p className="text-sm text-muted-foreground">
              This link grants admin access to Landil. Sign in to claim it.
            </p>
            <Button asChild className="w-full">
              <Link href={`/signin?callbackUrl=/invite/${token}`}>
                <LogIn size={14} />
                Sign in to claim
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Don't have an account?{" "}
              <Link href={`/signup`} className="underline underline-offset-2 hover:text-foreground">
                Sign up first
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
