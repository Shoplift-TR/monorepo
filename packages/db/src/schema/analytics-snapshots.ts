import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  date,
  timestamp,
} from "drizzle-orm/pg-core";

export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id").notNull(),
  date: date("date").notNull(),
  totalOrders: integer("total_orders").default(0),
  totalRevenue: numeric("total_revenue").default("0"),
  averageOrderValue: numeric("average_order_value").default("0"),
  popularItem: text("popular_item"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;
