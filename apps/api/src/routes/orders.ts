import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { notifyNewOrder, notifyOrderStatusChange } from "../lib/notifier.js";
import { validatePromo } from "../lib/promos.js";
import { verifyAuth } from "../middleware/auth.js";
import {
  db,
  orders,
  menuItems,
  addresses,
  restaurants,
  profiles,
} from "@shoplift/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import crypto from "crypto";

interface OrderItem {
  itemId: string;
  quantity: number;
  selectedModifiers: Array<{
    groupName: string;
    optionName: string;
    priceAdjustment: number;
  }>;
}

interface CreateOrderBody {
  restaurantId: string;
  items: OrderItem[];
  promoCode?: string;
  deliveryAddressId: string;
  paymentMethod: "card" | "cash";
  notes?: string;
}

export default async function orderRoutes(fastify: FastifyInstance) {
  /**
   * GET /orders/history
   * Requires verifyAuth. Returns the 20 most recent orders for the calling customer.
   */
  fastify.get(
    "/history",
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const user = (request as any).user;

      try {
        const result = await db
          .select()
          .from(orders)
          .where(eq(orders.customerId, user.uid))
          .orderBy(desc(orders.createdAt))
          .limit(20);

        return reply.send({ success: true, data: result });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error.message || "Failed to fetch order history",
        });
      }
    },
  );

  /**
   * POST /orders
   * Requires verifyAuth, customer only.
   */
  fastify.post<{ Body: CreateOrderBody }>(
    "/",
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const user = (request as any).user;

      // 1. Role check (customer only)
      if (user.role && user.role !== "customer") {
        return reply
          .status(403)
          .send({ success: false, error: "Only customers can place orders" });
      }

      const {
        restaurantId,
        items,
        promoCode,
        deliveryAddressId,
        paymentMethod,
        notes,
      } = request.body;

      try {
        // 2. Fetch all menu items for the provided itemIds
        const itemIds = items.map((i) => i.itemId);
        const menuItemsResult = await db
          .select()
          .from(menuItems)
          .where(
            and(
              eq(menuItems.restaurantId, restaurantId),
              eq(menuItems.isAvailable, true),
              inArray(menuItems.id, itemIds),
            ),
          );

        if (
          !menuItemsResult ||
          menuItemsResult.length !== Array.from(new Set(itemIds)).length
        ) {
          return reply.status(400).send({
            success: false,
            error: "One or more items are unavailable",
          });
        }

        // 3. Recompute prices server-side
        let subtotal = 0;
        const summarizedItems = items.map((item) => {
          const menuItem = menuItemsResult.find((mi) => mi.id === item.itemId);
          if (!menuItem) throw new Error(`Item ${item.itemId} not found`);

          let modifiersTotal = 0;
          item.selectedModifiers.forEach((mod) => {
            modifiersTotal += mod.priceAdjustment;
          });

          const itemPrice = Number(menuItem.price);
          const lineTotal = (itemPrice + modifiersTotal) * item.quantity;
          subtotal += lineTotal;

          return {
            ...item,
            name: menuItem.name,
            unitPrice: itemPrice,
            lineTotal,
          };
        });

        // 4. Fetch the delivery address
        const addressResult = await db
          .select()
          .from(addresses)
          .where(
            and(
              eq(addresses.id, deliveryAddressId),
              eq(addresses.profileId, user.uid),
            ),
          )
          .limit(1);

        const address = addressResult[0];

        if (!address) {
          return reply
            .status(400)
            .send({ success: false, error: "Invalid delivery address" });
        }

        // 5. Promo Code logic
        let discount = 0;
        if (promoCode) {
          const promoResult = await validatePromo({
            code: promoCode,
            userId: user.uid,
            restaurantId,
            cartTotal: subtotal,
            cartItemIds: items.map((i) => i.itemId),
          });
          if (promoResult.valid) {
            discount = promoResult.discount;
          }
        }

        // 6. Calculate total
        const restaurantResult = await db
          .select({ deliveryFee: restaurants.deliveryFee })
          .from(restaurants)
          .where(eq(restaurants.id, restaurantId))
          .limit(1);

        const deliveryFee = Number(restaurantResult[0]?.deliveryFee ?? 0);
        const total = subtotal + deliveryFee - discount;

        // 7. Build deliveryAddressSnapshot
        const deliveryAddressSnapshot = { ...address };

        // 8. Payment logic
        let paymentGateway = null;
        let paymentIntentId = null;
        if (paymentMethod === "card") {
          paymentGateway = "simulated";
          paymentIntentId = "sim_" + crypto.randomUUID();
        }

        // 9. Insert into orders table
        const orderResult = await db
          .insert(orders)
          .values({
            customerId: user.uid,
            restaurantId: restaurantId,
            items: summarizedItems,
            status: "PENDING",
            paymentMethod: paymentMethod,
            paymentGateway: paymentGateway,
            paymentIntentId: paymentIntentId,
            subtotal: subtotal.toString(),
            deliveryFee: deliveryFee.toString(),
            discount: discount.toString(),
            total: total.toString(),
            promoCode: promoCode,
            deliveryAddressId: deliveryAddressId,
            deliveryAddressSnapshot: deliveryAddressSnapshot,
            notes,
          })
          .returning();

        const order = orderResult[0];

        // 10. Fetch restaurant name for notification
        const restaurantData = await db
          .select({ name: restaurants.name })
          .from(restaurants)
          .where(eq(restaurants.id, restaurantId))
          .limit(1);

        const restaurant = restaurantData[0];

        // 11. Notify new order
        await notifyNewOrder({
          orderId: order.id,
          restaurantId,
          restaurantName:
            typeof (restaurant as any)?.name === "object"
              ? ((restaurant as any).name as any).en ||
                ((restaurant as any).name as any).tr
              : (restaurant as any)?.name || "Restaurant",
          restaurantEmail: "", // As requested
          customerName: user.displayName ?? "Customer",
          items: summarizedItems,
          total,
        });

        return reply.status(201).send({ success: true, data: order });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error.message || "Failed to create order",
        });
      }
    },
  );

  /**
   * GET /orders/:id
   * Requires verifyAuth.
   */
  fastify.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const { id } = request.params;
      const user = (request as any).user;

      try {
        const orderResult = await db
          .select()
          .from(orders)
          .where(eq(orders.id, id))
          .limit(1);

        const order = orderResult[0];

        if (!order) {
          return reply
            .status(404)
            .send({ success: false, error: "Order not found" });
        }

        // Permissions check
        const canAccess =
          order.customerId === user.uid ||
          user.role === "restaurant_admin" ||
          user.role === "super_admin";

        if (!canAccess) {
          return reply
            .status(403)
            .send({ success: false, error: "Access denied" });
        }

        return reply.send({ success: true, data: order });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error.message || "Failed to fetch order",
        });
      }
    },
  );

  /**
   * PUT /orders/:id/status
   * Requires verifyAuth.
   */
  fastify.put<{ Params: { id: string }; Body: { status: string } }>(
    "/:id/status",
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const { id } = request.params;
      const { status: newStatus } = request.body;
      const user = (request as any).user;

      try {
        const orderResult = await db
          .select()
          .from(orders)
          .where(eq(orders.id, id))
          .limit(1);

        const order = orderResult[0];

        if (!order) {
          return reply
            .status(404)
            .send({ success: false, error: "Order not found" });
        }

        // Enforce transitions
        let allowed = false;
        if (user.role === "super_admin") {
          allowed = true;
        } else if (user.role === "restaurant_admin") {
          allowed = ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"].includes(
            newStatus,
          );
        } else if (user.role === "driver") {
          allowed = ["OUT_FOR_DELIVERY", "DELIVERED"].includes(newStatus);
        }

        if (!allowed) {
          return reply.status(403).send({
            success: false,
            error: "Not authorized to transition to this status",
          });
        }

        const updateData: any = { status: newStatus };

        // Waypoints for OUT_FOR_DELIVERY
        if (newStatus === "OUT_FOR_DELIVERY") {
          // Simulation placeholder as location is not in schema
          console.log("Simulating delivery for order", id);
        }

        request.log.info(
          { orderId: id, newStatus, userRole: user.role },
          "Attempting status update",
        );

        const updatedResult = await db
          .update(orders)
          .set(updateData)
          .where(eq(orders.id, id))
          .returning();

        const updatedOrder = updatedResult[0];

        // Fetch customer info for notification
        const profileResult = await db
          .select({ email: profiles.email, displayName: profiles.displayName })
          .from(profiles)
          .where(eq(profiles.id, order.customerId))
          .limit(1);

        const profile = profileResult[0];

        const restaurantData = await db
          .select({ name: restaurants.name })
          .from(restaurants)
          .where(eq(restaurants.id, order.restaurantId))
          .limit(1);

        const restaurant = restaurantData[0];

        if (profile) {
          await notifyOrderStatusChange({
            orderId: id,
            customerId: order.customerId,
            customerEmail: profile.email,
            customerName: profile.displayName || "Customer",
            restaurantName:
              typeof (restaurant as any)?.name === "object"
                ? ((restaurant as any).name as any).en ||
                  ((restaurant as any).name as any).tr
                : (restaurant as any)?.name || "Restaurant",
            newStatus,
          });
        }

        return reply.send({ success: true, data: updatedOrder });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error.message || "Failed to update order status",
        });
      }
    },
  );

  /**
   * POST /orders/:id/cancel
   * Requires verifyAuth. Only allowed if customer and PENDING.
   */
  fastify.post<{ Params: { id: string } }>(
    "/:id/cancel",
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const { id } = request.params;
      const user = (request as any).user;

      try {
        const orderResult = await db
          .select()
          .from(orders)
          .where(eq(orders.id, id))
          .limit(1);

        const order = orderResult[0];

        if (!order) {
          return reply
            .status(404)
            .send({ success: false, error: "Order not found" });
        }

        if (order.customerId !== user.uid) {
          return reply.status(403).send({
            success: false,
            error: "Only the customer can cancel their order",
          });
        }

        if (order.status !== "PENDING") {
          return reply.status(400).send({
            success: false,
            error: "Only PENDING orders can be cancelled",
          });
        }

        const updatedResult = await db
          .update(orders)
          .set({ status: "CANCELLED" })
          .where(eq(orders.id, id))
          .returning();

        const updatedOrder = updatedResult[0];

        // Notify
        const profileResult = await db
          .select({ email: profiles.email, displayName: profiles.displayName })
          .from(profiles)
          .where(eq(profiles.id, order.customerId))
          .limit(1);

        const profile = profileResult[0];

        const restaurantData = await db
          .select({ name: restaurants.name })
          .from(restaurants)
          .where(eq(restaurants.id, order.restaurantId))
          .limit(1);

        const restaurant = restaurantData[0];

        if (profile) {
          await notifyOrderStatusChange({
            orderId: id,
            customerId: order.customerId,
            customerEmail: profile.email,
            customerName: profile.displayName || "Customer",
            restaurantName:
              typeof (restaurant as any)?.name === "object"
                ? ((restaurant as any).name as any).en ||
                  ((restaurant as any).name as any).tr
                : (restaurant as any)?.name || "Restaurant",
            newStatus: "CANCELLED",
          });
        }

        return reply.send({ success: true, data: updatedOrder });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error.message || "Failed to cancel order",
        });
      }
    },
  );
}
