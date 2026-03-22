import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const promos = pgTable("promos", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(),
  value: numeric("value").notNull(),
  maxDiscount: numeric("max_discount"),
  minOrderValue: numeric("min_order_value"),
  expiresAt: timestamp("expires_at").notNull(),
  usageLimit: integer("usage_limit").notNull(),
  usedCount: integer("used_count").default(0),
  perUserLimit: integer("per_user_limit").default(1),
  restaurantId: uuid("restaurant_id"),
  eligibleItemIds: uuid("eligible_item_ids").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Promo = typeof promos.$inferSelect;
export type NewPromo = typeof promos.$inferInsert;
