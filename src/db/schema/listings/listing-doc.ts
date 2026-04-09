import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { listing } from "./listing";

export const listingDoc = pgTable("listing_doc", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  listingId: text("listing_id").notNull().references(() => listing.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  visibility: text("visibility", { enum: ["public", "private"] }).notNull().default("private"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ListingDocType = typeof listingDoc.$inferSelect;
