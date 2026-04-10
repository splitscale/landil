import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./user";

export const adminInvite = pgTable("admin_invite", {
  token: text("token").primaryKey(),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  usedBy: text("used_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AdminInviteType = typeof adminInvite.$inferSelect;
