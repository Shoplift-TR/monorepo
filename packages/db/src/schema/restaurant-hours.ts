import {
  pgTable,
  uuid,
  smallint,
  text,
  boolean,
  timestamp,
  time,
  unique,
} from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants.js";

export const restaurantHours = pgTable(
  "restaurant_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    dayOfWeek: smallint("day_of_week").notNull(),
    openTime: time("open_time"),
    closeTime: time("close_time"),
    isClosed: boolean("is_closed").notNull().default(false),
    timezone: text("timezone").notNull().default("Asia/Nicosia"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    unq: unique().on(t.restaurantId, t.dayOfWeek),
  }),
);

export type RestaurantHours = typeof restaurantHours.$inferSelect;
export type NewRestaurantHours = typeof restaurantHours.$inferInsert;
