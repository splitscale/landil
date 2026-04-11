import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/get-session";
import { db } from "@/db";
import { listing, listingPhoto, listingDoc } from "@/db/schema/listings";
import { user } from "@/db/schema/auth/user";
import { ListingSchema } from "@/app/(routes)/(home)/listings/new/validate";

const EditPhotoSchema = z.object({
  dbId: z.string().optional(),
  url: z.string().url(),
  key: z.string().min(1),
  cover: z.boolean(),
});

const EditDocSchema = z.object({
  dbId: z.string().optional(),
  url: z.string().url(),
  key: z.string().min(1),
  name: z.string().min(1),
  visibility: z.enum(["public", "private"]),
});

const BodySchema = z.object({
  status: z.enum(["draft", "published"]),
  values: ListingSchema,
  photos: z.array(EditPhotoSchema).default([]),
  docs: z.array(EditDocSchema).default([]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const [l] = await db
    .select({ id: listing.id })
    .from(listing)
    .where(and(eq(listing.id, id), eq(listing.userId, session.user.id)));
  if (!l) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [owner] = await db.select({ plan: user.plan, role: user.role }).from(user).where(eq(user.id, session.user.id));
  const isPro = owner?.plan === "pro" || owner?.role === "admin";

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { status, values, photos, docs } = parsed.data;
  const sanitisedDocs = docs.map((d) => ({
    ...d,
    visibility: isPro ? d.visibility : "public" as const,
  }));

  const askingPrice = parseInt(values.askingPrice.replace(/,/g, ""), 10);
  if (isNaN(askingPrice)) {
    return NextResponse.json({ error: "Invalid asking price" }, { status: 422 });
  }

  await db.transaction(async (tx) => {
    // Update listing fields
    await tx
      .update(listing)
      .set({
        status,
        propertyType: values.propertyType,
        title: values.title,
        askingPrice,
        lotArea: values.lotArea,
        floorArea: values.floorArea ?? null,
        city: values.city,
        province: values.province,
        description: values.description,
        titleType: values.titleType,
        titleNumber: values.titleNumber ?? null,
        registryOfDeeds: values.registryOfDeeds ?? null,
        lotNumber: values.lotNumber ?? null,
        encumbrances: values.encumbrances,
        utilities: values.utilities,
      })
      .where(eq(listing.id, id));

    // Photos: delete all then re-insert (kept + new)
    await tx.delete(listingPhoto).where(eq(listingPhoto.listingId, id));
    if (photos.length > 0) {
      await tx.insert(listingPhoto).values(
        photos.map((p, i) => ({
          id: p.dbId ?? crypto.randomUUID(),
          listingId: id,
          url: p.url,
          key: p.key,
          cover: i === 0,
        })),
      );
    }

    // Docs: delete all then re-insert
    await tx.delete(listingDoc).where(eq(listingDoc.listingId, id));
    if (sanitisedDocs.length > 0) {
      await tx.insert(listingDoc).values(
        sanitisedDocs.map((d) => ({
          id: d.dbId ?? crypto.randomUUID(),
          listingId: id,
          url: d.url,
          key: d.key,
          name: d.name,
          visibility: d.visibility,
        })),
      );
    }
  });

  return NextResponse.json({ id });
}
