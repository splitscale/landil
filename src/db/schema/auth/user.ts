import { boolean, json, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type NotifPrefs = {
  email: Partial<Record<string, boolean>>;
  inApp: Partial<Record<string, boolean>>;
};

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  role: text("role", { enum: ["admin", "seller", "buyer"] }).default("buyer").notNull(),
  gender: boolean("gender").notNull(),
  verified: boolean("verified").default(false).notNull(),
  plan: text("plan", { enum: ["free", "pro"] }).default("free").notNull(),
  notificationPrefs: json("notification_prefs").$type<NotifPrefs>(),
  banned: boolean("banned").default(false),
  banReason: text("banReason"),
  banExpires: timestamp("banExpires"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

export type UserType = typeof user.$inferSelect;
