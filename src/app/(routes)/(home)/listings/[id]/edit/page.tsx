import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { listing, listingPhoto, listingDoc } from "@/db/schema/listings";
import { getServerSession } from "@/lib/auth/get-session";
import { requireRole } from "@/lib/auth/roles";
import EditListingForm from "./edit-form";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [l] = await db.select({ title: listing.title }).from(listing).where(eq(listing.id, id));
  return { title: l ? `Edit — ${l.title}` : "Edit listing" };
}

export default async function EditListingPage({ params }: Props) {
  await requireRole("seller", "admin");
  const { id } = await params;
  const session = await getServerSession();

  const [l] = await db
    .select()
    .from(listing)
    .where(and(eq(listing.id, id), eq(listing.userId, session!.user.id)));

  if (!l) notFound();

  const photos = await db
    .select()
    .from(listingPhoto)
    .where(eq(listingPhoto.listingId, id));

  const docs = await db
    .select()
    .from(listingDoc)
    .where(eq(listingDoc.listingId, id));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-lg font-semibold tracking-tight">Edit listing</h1>
      <EditListingForm listing={l} photos={photos} docs={docs} />
    </div>
  );
}
