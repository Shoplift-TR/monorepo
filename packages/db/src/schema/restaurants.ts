import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: jsonb("name").notNull(),
  description: jsonb("description"),
  logo: text("logo"),
  address: text("address"),
  ownerId: uuid("owner_id"),
  cuisineTags: text("cuisine_tags").array(),
  isActive: boolean("is_active").default(true),
  isApproved: boolean("is_approved").default(false),
  commissionRate: numeric("commission_rate").default("0.10"),
  maintenanceFee: numeric("maintenance_fee").default("0"),
  rating: numeric("rating").default("0"),
  totalOrders: integer("total_orders").default(0),
  totalRatings: integer("total_ratings").default(0),
  healthScore: integer("health_score").default(100),
  averageDeliveryMinutes: integer("average_delivery_minutes").default(30),
  operatingHours: jsonb("operating_hours"),
  slug: text("slug").unique(),
  deliveryFee: numeric("delivery_fee").default("0"),
  lat: numeric("lat"),
  lng: numeric("lng"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;
