import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull(),
  restaurantId: uuid("restaurant_id").notNull(),
  driverId: uuid("driver_id"),
  items: jsonb("items").notNull(),
  status: text("status").notNull().default("PENDING"),
  paymentMethod: text("payment_method").notNull(),
  paymentGateway: text("payment_gateway"),
  paymentIntentId: text("payment_intent_id"),
  subtotal: integer("subtotal").notNull(),
  deliveryFee: integer("delivery_fee").notNull(),
  discountAmount: integer("discount_amount").default(0),
  taxAmount: integer("tax_amount").default(0),
  total: integer("total").notNull(),
  promoCode: text("promo_code"),
  deliveryAddressId: uuid("delivery_address_id"),
  deliveryAddressSnapshot: jsonb("delivery_address_snapshot"),
  notes: text("notes"),
  refundStatus: text("refund_status"),
  refundReason: text("refund_reason"),
  refundedAt: timestamp("refunded_at"),
  simulatedRouteWaypoints: jsonb("simulated_route_waypoints"),
  estimatedDeliveryTime: text("estimated_delivery_time"),
  confirmedAt: timestamp("confirmed_at"),
  deliveredAt: timestamp("delivered_at"),
  platformFee: integer("platform_fee").default(0),
  rejectionReason: text("rejection_reason"),
  idempotencyKey: text("idempotency_key").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
