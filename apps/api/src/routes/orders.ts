import { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { notifyOrderStatusChange, notifyNewOrder } from "../lib/notifier.js";
import { sendOrderNotifications } from "../lib/notifications.js";
import { processReceipt } from "../lib/receipts.js";
import { validatePromo } from "../lib/promos.js";
import { verifyAuth } from "../middleware/auth.js";
import { writeAuditLog } from "../lib/audit.js";
import {
  db,
  orders,
  menuItems,
  addresses,
  restaurants,
  profiles,
  receipts,
} from "@shoplift/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import crypto from "crypto";

// Zod Schemas
const CreateOrderSchema = z
  .object({
    restaurantId: z.string().uuid(),
    items: z
      .array(
        z
          .object({
            itemId: z.string().uuid(),
            quantity: z.number().int().min(1).max(999),
            selectedModifiers: z
              .array(
                z
                  .object({
                    groupName: z.string().trim(),
                    optionName: z.string().trim(),
                  })
                  .strict(),
              )
              .optional(),
            specialInstructions: z.string().max(500).trim().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    promoCode: z.string().max(50).trim().optional(),
    deliveryAddressId: z.string().uuid(),
    paymentMethod: z.enum(["card", "cash"]),
    notes: z.string().max(500).trim().optional(),
    idempotencyKey: z.string().uuid().optional(),
    locale: z.enum(["en", "tr"]).default("en"),
  })
  .strict();

export default async function orderRoutes(fastify: FastifyInstance) {
  /**
   * GET /orders/history
   */
  fastify.get(
    "/history",
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const user = request.user!;

      try {
        const result = await db
          .select()
          .from(orders)
          .where(eq(orders.customerId, user.id))
          .orderBy(desc(orders.createdAt))
          .limit(20);

        return reply.send({ success: true, data: result });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch order history",
          },
        });
      }
    },
  );

  /**
   * POST /orders
   */
  fastify.post("/", { preHandler: [verifyAuth] }, async (request, reply) => {
    const user = request.user!;

    // 1. Role check (customer only)
    if (user.role && user.role !== "customer") {
      return reply.status(403).send({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Only customers can place orders",
        },
      });
    }

    // 2. Validation
    const validation = CreateOrderSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input validation failed",
          details: validation.error.issues.map((e: z.ZodIssue) => ({
            field: e.path.join("."),
            issue: e.message,
          })),
        },
      });
    }

    const {
      restaurantId,
      items,
      promoCode,
      deliveryAddressId,
      paymentMethod,
      notes,
      idempotencyKey: inputIdempotencyKey,
    } = validation.data;

    // 3. Idempotency Check
    // Use provided key or generate a unique hash of the payload to prevent accidental double-submits
    const payloadHash = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          userId: user.id,
          restaurantId,
          items,
          deliveryAddressId,
        }),
      )
      .digest("hex");

    const idempotencyKey = inputIdempotencyKey || `hash_${payloadHash}`;

    try {
      // Check if order with this key already exists
      const existingOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existingOrder.length > 0) {
        request.log.info(
          { idempotencyKey },
          "Duplicate order detected via idempotency key",
        );
        return reply.send({
          success: true,
          data: existingOrder[0],
          message: "Duplicate order prevented",
        });
      }

      // 4. Item Ownership Validation and Fetching
      const itemIds = items.map((i) => i.itemId);
      const menuItemsResult = await db
        .select()
        .from(menuItems)
        .where(inArray(menuItems.id, itemIds));

      // Ensure all items exist
      if (menuItemsResult.length !== Array.from(new Set(itemIds)).length) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "ITEM_NOT_FOUND",
            message: "One or more items do not exist",
          },
        });
      }

      // CRITICAL: Item Ownership Validation - Ensure ALL belong to the target restaurant
      const mismatchedItems = menuItemsResult.filter(
        (mi) => mi.restaurantId !== restaurantId,
      );
      if (mismatchedItems.length > 0) {
        request.log.warn(
          { restaurantId, mismatchedItems: mismatchedItems.map((i) => i.id) },
          "Security event: Attempted to order items from multiple restaurants",
        );
        return reply.status(400).send({
          success: false,
          error: {
            code: "MIXED_RESTAURANT_ITEMS",
            message: "All items must belong to the same restaurant",
          },
        });
      }

      // Ensure all items are available
      if (menuItemsResult.some((mi) => !mi.isAvailable)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "ITEM_UNAVAILABLE",
            message: "One or more items are currently unavailable",
          },
        });
      }

      // 5. Recompute prices server-side (DO NOT TRUST CLIENT)
      let subtotal = 0;
      const summarizedItems = items.map((item) => {
        const menuItem = menuItemsResult.find((mi) => mi.id === item.itemId)!;

        let modifiersTotal = 0;
        const verifiedModifiers: any[] = [];

        // Recalculate each modifier from DB
        if (item.selectedModifiers) {
          for (const selected of item.selectedModifiers) {
            const modifierGroup = (menuItem.modifiers as any[])?.find(
              (g) =>
                g.name.en === selected.groupName ||
                g.name.tr === selected.groupName,
            );
            const modifierOption = modifierGroup?.options?.find(
              (o: any) =>
                o.name.en === selected.optionName ||
                o.name.tr === selected.optionName,
            );

            if (!modifierOption) {
              throw new Error(
                `Invalid modifier: ${selected.groupName} - ${selected.optionName}`,
              );
            }

            const priceAdjustment = Number(modifierOption.price || 0);
            modifiersTotal += priceAdjustment;
            verifiedModifiers.push({
              groupName: selected.groupName,
              optionName: selected.optionName,
              priceAdjustment,
            });
          }
        }

        const itemPrice = Number(menuItem.price);
        const lineTotal = (itemPrice + modifiersTotal) * item.quantity;
        subtotal += lineTotal;

        return {
          itemId: item.itemId,
          quantity: item.quantity,
          selectedModifiers: verifiedModifiers,
          name: menuItem.name,
          unitPrice: itemPrice,
          subtotal: lineTotal,
          specialInstructions: item.specialInstructions,
        };
      });

      // 6. Fetch the delivery address
      const addressResult = await db
        .select()
        .from(addresses)
        .where(
          and(
            eq(addresses.id, deliveryAddressId),
            eq(addresses.profileId, user.id),
          ),
        )
        .limit(1);

      const address = addressResult[0];
      if (!address) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "INVALID_ADDRESS",
            message: "Invalid delivery address",
          },
        });
      }

      // 7. Promo Code logic
      let discountAmount = 0;
      if (promoCode) {
        const promoResult = await validatePromo({
          code: promoCode,
          userId: user.id,
          restaurantId,
          cartTotal: subtotal,
          cartItemIds: itemIds,
        });
        if (promoResult.valid) {
          discountAmount = promoResult.discount;
        } else {
          return reply.status(400).send({
            success: false,
            error: { code: "INVALID_PROMO_CODE", message: promoResult.message },
          });
        }
      }

      // 8. Calculate fees and total (ALL IN CENTS)
      const restaurantResult = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, restaurantId))
        .limit(1);

      const restaurant = restaurantResult[0];
      if (!restaurant) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Restaurant not found" },
        });
      }

      const deliveryFee = Number(restaurant.deliveryFee ?? 0);
      const taxAmount = Math.floor(subtotal * Number(restaurant.taxRate ?? 0));
      const platformFee = Math.floor(subtotal * 0.1); // 10% standard platform fee
      const total = Math.max(
        0,
        subtotal + deliveryFee + taxAmount + platformFee - discountAmount,
      );

      // 9. Payment logic (Placeholder)
      let paymentGateway = null;
      let paymentIntentId = null;
      if (paymentMethod === "card") {
        paymentGateway = "simulated";
        paymentIntentId = "sim_" + crypto.randomUUID();
      }

      // 10. Insert into orders table
      const orderResult = await db
        .insert(orders)
        .values({
          customerId: user.id,
          restaurantId: restaurantId,
          items: summarizedItems,
          status: "PENDING",
          paymentMethod: paymentMethod,
          paymentGateway: paymentGateway,
          paymentIntentId: paymentIntentId,
          subtotal,
          deliveryFee,
          taxAmount,
          platformFee,
          discountAmount,
          total,
          promoCode: promoCode || null,
          deliveryAddressId: deliveryAddressId,
          deliveryAddressSnapshot: address,
          idempotencyKey,
          notes,
        })
        .returning();

      const order = orderResult[0];

      // Broadcast to the restaurant's channel
      await supabase.channel(`restaurant:${order.restaurantId}`).send({
        type: "broadcast",
        event: "new_order",
        payload: {
          id: order.id,
          total: Number(order.total),
          restaurant_id: order.restaurantId,
          created_at: order.createdAt?.toISOString(),
        },
      });

      // 11. Notifications (Async)
      const restaurantProfileResult = await db
        .select({ email: profiles.email })
        .from(profiles)
        .where(
          and(
            eq(profiles.restaurantId, restaurantId),
            eq(profiles.role, "restaurant_admin"),
          ),
        )
        .limit(1);

      const restaurantProfile = restaurantProfileResult[0];

      sendOrderNotifications({
        orderId: order.id,
        restaurantId,
        restaurantName:
          (restaurant.name as any).en ||
          (restaurant.name as any).tr ||
          "Restaurant",
        restaurantEmail: restaurantProfile?.email || "",
        customerName: user.displayName ?? "Customer",
        customerEmail: user.email ?? "",
        items: summarizedItems.map((i) => ({
          name: (i.name as any).en || (i.name as any).tr || "Item",
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.subtotal,
        })),
        subtotal,
        deliveryFee,
        discount: discountAmount,
        platformFee,
        total,
        promoCode: promoCode,
        deliveryAddress: `${address.street}, ${address.district}, ${address.city}`,
        notes: notes || undefined,
        createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
      }).catch((err) => console.error("Notification dispatch failed:", err));

      notifyNewOrder({
        orderId: order.id,
        restaurantId,
        restaurantName:
          (restaurant.name as any).en ||
          (restaurant.name as any).tr ||
          "Restaurant",
        restaurantEmail: restaurantProfile?.email || "",
        customerName: user.displayName ?? "Customer",
        items: summarizedItems,
        total,
      }).catch((err) => console.error("n8n webhook failed:", err));

      return reply.status(201).send({ success: true, data: order });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to create order" },
      });
    }
  });

  /**
   * GET /orders/:id
   */
  fastify.get("/:id", { preHandler: [verifyAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    try {
      const orderResult = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      const order = orderResult[0];

      if (!order) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Order not found" },
        });
      }

      // Permissions check
      const canAccess =
        order.customerId === user.id ||
        user.role === "restaurant_admin" ||
        user.role === "super_admin";

      if (!canAccess) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "Access denied" },
        });
      }

      const restaurantData = await db
        .select({
          lat: restaurants.lat,
          lng: restaurants.lng,
          name: restaurants.name,
        })
        .from(restaurants)
        .where(eq(restaurants.id, order.restaurantId))
        .limit(1);

      return reply.send({
        success: true,
        data: {
          ...order,
          restaurant_lat: restaurantData[0]?.lat
            ? Number(restaurantData[0].lat)
            : null,
          restaurant_lng: restaurantData[0]?.lng
            ? Number(restaurantData[0].lng)
            : null,
          restaurant_name:
            (restaurantData[0]?.name as any)?.en ||
            (restaurantData[0]?.name as any)?.tr,
        },
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch order" },
      });
    }
  });

  /**
   * PUT /orders/:id/status
   */
  fastify.put(
    "/:id/status",
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { status: newStatus } = request.body as { status: string };
      const user = request.user!;

      try {
        const orderResult = await db
          .select()
          .from(orders)
          .where(eq(orders.id, id))
          .limit(1);

        const order = orderResult[0];
        if (!order) {
          return reply.status(404).send({
            success: false,
            error: { code: "NOT_FOUND", message: "Order not found" },
          });
        }

        // RBAC Check
        let allowed = false;
        if (user.role === "super_admin") {
          allowed = true;
        } else if (
          user.role === "restaurant_admin" &&
          order.restaurantId === user.restaurantId
        ) {
          allowed = ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"].includes(
            newStatus,
          );
        } else if (user.role === "driver") {
          allowed = ["OUT_FOR_DELIVERY", "DELIVERED"].includes(newStatus);
        }

        if (!allowed) {
          request.log.warn(
            { userId: user.id, orderId: id, newStatus },
            "Forbidden status update attempt",
          );
          return reply.status(403).send({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Not authorized to perform this status update",
            },
          });
        }

        const updatedResult = await db
          .update(orders)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(orders.id, id))
          .returning();

        const updatedOrder = updatedResult[0];

        // Audit Log for staff mutations
        if (user.role !== "customer") {
          await writeAuditLog({
            adminId: user.id,
            action: "UPDATE_ORDER_STATUS",
            targetType: "order",
            targetId: id,
            payload: { oldStatus: order.status, newStatus },
            ipAddress: request.ip,
          });
        }

        // Notify
        const profileResult = await db
          .select({ email: profiles.email, displayName: profiles.displayName })
          .from(profiles)
          .where(eq(profiles.id, order.customerId))
          .limit(1);

        const restaurantData = await db
          .select({ name: restaurants.name })
          .from(restaurants)
          .where(eq(restaurants.id, order.restaurantId))
          .limit(1);

        if (profileResult[0]) {
          notifyOrderStatusChange({
            orderId: id,
            customerId: order.customerId,
            customerEmail: profileResult[0].email,
            customerName: profileResult[0].displayName || "Customer",
            restaurantName:
              (restaurantData[0]?.name as any)?.en || "Restaurant",
            newStatus,
          }).catch((err) => console.error("Status change notify failed:", err));
        }

        // Trigger Receipt Generation if status is CONFIRMED (Async)
        if (newStatus === "CONFIRMED") {
          processReceipt(id).catch((err) =>
            console.error("Receipt processing failed:", err),
          );
        }

        return reply.send({ success: true, data: updatedOrder });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to update order status",
          },
        });
      }
    },
  );

  /**
   * POST /orders/:id/cancel
   */
  fastify.post(
    "/:id/cancel",
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      try {
        const orderResult = await db
          .select()
          .from(orders)
          .where(eq(orders.id, id))
          .limit(1);

        const order = orderResult[0];
        if (!order) {
          return reply.status(404).send({
            success: false,
            error: { code: "NOT_FOUND", message: "Order not found" },
          });
        }

        if (order.customerId !== user.id) {
          return reply.status(403).send({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Only the customer can cancel their order",
            },
          });
        }

        if (order.status !== "PENDING") {
          return reply.status(400).send({
            success: false,
            error: {
              code: "INVALID_STATE",
              message: "Only PENDING orders can be cancelled",
            },
          });
        }

        const updatedResult = await db
          .update(orders)
          .set({ status: "CANCELLED", updatedAt: new Date() })
          .where(eq(orders.id, id))
          .returning();

        return reply.send({ success: true, data: updatedResult[0] });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Failed to cancel order" },
        });
      }
    },
  );

  /**
   * POST /orders/:id/reject
   */
  fastify.post(
    "/:id/reject",
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };
      const user = request.user!;

      if (!["restaurant_admin", "super_admin"].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "Forbidden" },
        });
      }

      const orderResult = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      const order = orderResult[0];
      if (!order) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Order not found" },
        });
      }

      if (
        user.role === "restaurant_admin" &&
        order.restaurantId !== user.restaurantId
      ) {
        return reply.status(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "This order does not belong to your restaurant",
          },
        });
      }

      if (order.status !== "PENDING") {
        return reply.status(400).send({
          success: false,
          error: {
            code: "INVALID_STATE",
            message: "Only PENDING orders can be rejected",
          },
        });
      }

      const updated = await db
        .update(orders)
        .set({
          status: "CANCELLED",
          rejectionReason: reason?.trim() || "Contact support for more info",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning();

      await writeAuditLog({
        adminId: user.uid,
        action: "REJECT_ORDER",
        targetType: "order",
        targetId: id,
        payload: { reason: reason || "No reason provided" },
        ipAddress: request.ip,
      });

      return reply.send({ success: true, data: updated[0] });
    },
  );

  /**
   * GET /orders/:id/receipt
   */
  fastify.get(
    "/:id/receipt",
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      try {
        const orderResult = await db
          .select()
          .from(orders)
          .where(eq(orders.id, id))
          .limit(1);

        const order = orderResult[0];
        if (!order) {
          return reply.status(404).send({
            success: false,
            error: { code: "NOT_FOUND", message: "Order not found" },
          });
        }

        // RBAC Check
        const canAccess =
          order.customerId === user.id ||
          user.role === "super_admin" ||
          (user.role === "restaurant_admin" &&
            order.restaurantId === user.restaurantId);

        if (!canAccess) {
          return reply.status(403).send({
            success: false,
            error: { code: "FORBIDDEN", message: "Not authorized" },
          });
        }

        const receiptResult = await db
          .select()
          .from(receipts)
          .where(eq(receipts.orderId, id))
          .limit(1);

        const receipt = receiptResult[0];
        if (!receipt || receipt.status !== "generated") {
          return reply.status(404).send({
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Receipt not generated yet or failed",
            },
          });
        }

        // Redirect to public URL or proxy the image
        // For simplicity and to follow "downloadable PNG" requirement, we'll proxy it or redirect
        return reply.redirect(receipt.pngUrl);
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch receipt",
          },
        });
      }
    },
  );
}
