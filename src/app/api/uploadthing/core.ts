import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getServerSession } from "@/lib/auth/get-session";

const f = createUploadthing();

export const ourFileRouter = {
  // Property photos — up to 20 images, 15 MB each
  listingPhotos: f({ image: { maxFileSize: "16MB", maxFileCount: 20 } })
    .middleware(async () => {
      const session = await getServerSession();
      if (!session) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl, key: file.key };
    }),

  // Supporting documents — PDFs + images, 15 MB each, up to 20
  listingDocs: f({ pdf: { maxFileSize: "16MB", maxFileCount: 20 }, image: { maxFileSize: "16MB", maxFileCount: 20 } })
    .middleware(async () => {
      const session = await getServerSession();
      if (!session) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl, key: file.key, name: file.name };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
