import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { orders } from "./orders.js";

export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" })
    .unique(),
  pngUrl: text("png_url").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
  sentAt: timestamp("sent_at"),
  status: text("status", { enum: ["pending", "generated", "failed"] })
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;
