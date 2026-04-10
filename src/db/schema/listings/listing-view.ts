import { text, timestamp, index } from "drizzle-orm/pg-core";
import { listingsSchema, listing } from "./listing";

export const listingView = listingsSchema.table(
  "listing_view",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    listingId: text("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    // user_id for authenticated, sha256(ip).slice(0,16) for anonymous
    viewerKey: text("viewer_key").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("listing_view_listing_id_idx").on(t.listingId),
    index("listing_view_viewer_key_idx").on(t.listingId, t.viewerKey, t.createdAt),
  ],
);

export type ListingViewType = typeof listingView.$inferSelect;
