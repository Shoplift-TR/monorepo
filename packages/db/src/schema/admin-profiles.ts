import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const adminProfiles = pgTable("admin_profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  role: text("role").notNull(),
  restaurantId: uuid("restaurant_id"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminProfile = typeof adminProfiles.$inferSelect;
export type NewAdminProfile = typeof adminProfiles.$inferInsert;
