import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "customer",
  "restaurant_admin",
  "super_admin",
  "driver",
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  username: text("username").unique(),
  phone: text("phone"),
  role: text("role").notNull().default("customer"),
  restaurantId: uuid("restaurant_id"),
  preferredLanguage: text("preferred_language").default("en"),
  usedPromoIds: text("used_promo_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
