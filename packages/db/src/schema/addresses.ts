import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull(),
  label: text("label").notNull(),
  street: text("street").notNull(),
  district: text("district"),
  city: text("city"),
  lat: numeric("lat"),
  lng: numeric("lng"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
