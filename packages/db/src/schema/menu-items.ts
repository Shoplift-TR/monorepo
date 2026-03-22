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
import { restaurants } from "./restaurants";

export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  name: jsonb("name").notNull(),
  description: jsonb("description"),
  price: numeric("price").notNull(),
  category: text("category"),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").default(true),
  modifiers: jsonb("modifiers"),
  foodCostPercent: numeric("food_cost_percent"),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
