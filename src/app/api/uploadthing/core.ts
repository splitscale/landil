import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getServerSession } from "@/lib/auth/get-session";
import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { eq } from "drizzle-orm";

const f = createUploadthing();

export const ourFileRouter = {
  listingPhotos: f({ image: { maxFileSize: "16MB", maxFileCount: 20 } })
    .middleware(async () => {
      const session = await getServerSession();
      if (!session) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl, key: file.key };
    }),

  avatar: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } }, { awaitServerData: false })
    .middleware(async () => {
      console.log("[avatar:middleware] called");
      const session = await getServerSession();
      if (!session) {
        console.error("[avatar:middleware] no session — throwing Unauthorized");
        throw new Error("Unauthorized");
      }
      console.log("[avatar:middleware] session ok — userId:", session.user.id);
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[avatar:onUploadComplete] called — ufsUrl:", file.ufsUrl, "key:", file.key, "userId:", metadata.userId);
      await db.update(user)
        .set({ image: file.ufsUrl })
        .where(eq(user.id, metadata.userId));
      console.log("[avatar:onUploadComplete] DB write ok");
      return { url: file.ufsUrl, key: file.key };
    }),

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
