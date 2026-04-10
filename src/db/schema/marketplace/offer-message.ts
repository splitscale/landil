import { text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/user";
import { marketplaceSchema, offer } from "./offer";

export const offerMessage = marketplaceSchema.table("offer_message", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  offerId: text("offer_id").notNull().references(() => offer.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OfferMessageType = typeof offerMessage.$inferSelect;
