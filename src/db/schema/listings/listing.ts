import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/user";

export const listing = pgTable("listing", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),

  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),

  // Core details
  propertyType: text("property_type").notNull(),
  title: text("title").notNull(),
  askingPrice: integer("asking_price").notNull(), // stored as PHP pesos
  lotArea: text("lot_area").notNull(),
  floorArea: text("floor_area"),
  city: text("city").notNull(),
  province: text("province").notNull(),
  description: text("description").notNull(),

  // Title & ownership
  titleType: text("title_type").notNull(),
  titleNumber: text("title_number"),
  registryOfDeeds: text("registry_of_deeds"),
  lotNumber: text("lot_number"),

  // Arrays stored as JSON strings
  encumbrances: text("encumbrances").array().notNull().default([]),
  utilities: text("utilities").array().notNull().default([]),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type ListingType = typeof listing.$inferSelect;
export type NewListing = typeof listing.$inferInsert;
