import { pgSchema, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/user";

export const notificationsSchema = pgSchema("notifications");

export const notification = notificationsSchema.table("notification", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // new_offer | offer_accepted | offer_rejected | offer_countered | offer_withdrawn | offer_message
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  relatedId: text("related_id"), // offerId
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type NotificationType = typeof notification.$inferSelect;
