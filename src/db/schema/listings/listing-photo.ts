import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { listing } from "./listing";

export const listingPhoto = pgTable("listing_photo", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  listingId: text("listing_id").notNull().references(() => listing.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  key: text("key").notNull(),
  cover: boolean("cover").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ListingPhotoType = typeof listingPhoto.$inferSelect;
