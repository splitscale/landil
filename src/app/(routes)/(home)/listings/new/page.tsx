import { type Metadata } from "next";
import { eq, count } from "drizzle-orm";
import { requireRole } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/get-session";
import { db } from "@/db";
import { listing } from "@/db/schema/listings";
import { user } from "@/db/schema/auth/user";
import NewListingForm from "@/app/(routes)/(home)/listings/new/form";
import UpgradePrompt from "@/app/(routes)/(home)/components/upgrade-prompt";

const FREE_CAP = 3;

export const metadata: Metadata = {
  title: "New Listing",
  description: "List your land or property on Landil. Add photos, documents, title details, and set your asking price.",
};

export default async function NewListingPage() {
  await requireRole("seller", "admin");
  const session = await getServerSession();

  const [{ plan }] = await db.select({ plan: user.plan }).from(user).where(eq(user.id, session!.user.id));

  if (plan === "free") {
    const [{ value: listingCount }] = await db
      .select({ value: count() })
      .from(listing)
      .where(eq(listing.userId, session!.user.id));

    if (listingCount >= FREE_CAP) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-10">
          <UpgradePrompt feature={`Listing cap reached (${FREE_CAP}/${FREE_CAP}). Unlimited listings`} />
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">New listing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            List your property on Landil.
          </p>
        </div>
        <NewListingForm />
      </div>
    </div>
  );
}