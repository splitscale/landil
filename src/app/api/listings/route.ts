import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/get-session";
import { db } from "@/db";
import { listing, listingPhoto, listingDoc } from "@/db/schema/listings";
import { ListingSchema } from "@/app/(routes)/(home)/listings/new/validate";

const PhotoSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
  cover: z.boolean(),
});

const DocSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
  name: z.string().min(1),
  visibility: z.enum(["public", "private"]),
});

const BodySchema = z.object({
  status: z.enum(["draft", "published"]),
  values: ListingSchema,
  photos: z.array(PhotoSchema).default([]),
  docs: z.array(DocSchema).default([]),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { status, values, photos, docs } = parsed.data;

  // Strip commas and parse price
  const askingPrice = parseInt(values.askingPrice.replace(/,/g, ""), 10);
  if (isNaN(askingPrice)) {
    return NextResponse.json({ error: "Invalid asking price" }, { status: 422 });
  }

  const listingId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(listing).values({
      id: listingId,
      userId: session.user.id,
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
    });

    if (photos.length > 0) {
      await tx.insert(listingPhoto).values(
        photos.map((p) => ({
          listingId,
          url: p.url,
          key: p.key,
          cover: p.cover,
        })),
      );
    }

    if (docs.length > 0) {
      await tx.insert(listingDoc).values(
        docs.map((d) => ({
          listingId,
          url: d.url,
          key: d.key,
          name: d.name,
          visibility: d.visibility,
        })),
      );
    }
  });

  return NextResponse.json({ id: listingId }, { status: 201 });
}
