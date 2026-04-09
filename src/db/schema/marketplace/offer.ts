import { pgSchema, text, integer, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/user";
import { listing } from "../listings/listing";

export const marketplaceSchema = pgSchema("marketplace");

export const offer = marketplaceSchema.table("offer", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  listingId: text("listing_id").notNull().references(() => listing.id, { onDelete: "cascade" }),
  buyerId: text("buyer_id").notNull().references(() => user.id, { onDelete: "cascade" }),

  // Amount in PHP pesos
  amount: integer("amount").notNull(),

  // pending → accepted | rejected | countered | withdrawn
  status: text("status", {
    enum: ["pending", "accepted", "rejected", "countered", "withdrawn"],
  }).notNull().default("pending"),

  // Optional note with the initial offer
  note: text("note"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type OfferType = typeof offer.$inferSelect;
export type NewOffer = typeof offer.$inferInsert;
