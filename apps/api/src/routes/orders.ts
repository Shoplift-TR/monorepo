import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { notifyNewOrder, notifyOrderStatusChange } from "../lib/notifier.js";
import { validatePromo } from "../lib/promos.js";
import { verifyAuth } from "../middleware/auth.js";
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

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", user.uid)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        return reply.status(500).send({ success: false, error: error.message });
      }

      return reply.send({ success: true, data });
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
        const { data: menuItems, error: menuError } = await supabase
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("is_available", true)
          .in("id", itemIds);

        if (
          menuError ||
          !menuItems ||
          menuItems.length !== Array.from(new Set(itemIds)).length
        ) {
          return reply
            .status(400)
            .send({
              success: false,
              error: "One or more items are unavailable",
            });
        }

        // 3. Recompute prices server-side
        let subtotal = 0;
        const summarizedItems = items.map((item) => {
          const menuItem = menuItems.find((mi) => mi.id === item.itemId);
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
        const { data: address, error: addressError } = await supabase
          .from("addresses")
          .select("*")
          .eq("id", deliveryAddressId)
          .eq("profile_id", user.uid)
          .single();

        if (addressError || !address) {
          return reply
            .status(400)
            .send({ success: false, error: "Invalid delivery address" });
        }

        // 5. Promo Code logic
        let discount = 0;
        if (promoCode) {
          const promoResult = await validatePromo(promoCode);
          if (promoResult.valid) {
            discount = promoResult.discount;
          }
        }

        // 6. Calculate total
        const deliveryFee = 30;
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
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            customer_id: user.uid,
            restaurant_id: restaurantId,
            items: summarizedItems,
            status: "PENDING",
            payment_method: paymentMethod,
            payment_gateway: paymentGateway,
            payment_intent_id: paymentIntentId,
            subtotal,
            delivery_fee: deliveryFee,
            discount,
            total,
            promo_code: promoCode,
            delivery_address_id: deliveryAddressId,
            delivery_address_snapshot: deliveryAddressSnapshot,
            notes,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // 10. Fetch restaurant name for notification
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("name")
          .eq("id", restaurantId)
          .single();

        // 11. Notify new order
        await notifyNewOrder({
          orderId: order.id,
          restaurantId,
          restaurantName:
            typeof restaurant?.name === "object"
              ? (restaurant.name as any).en || (restaurant.name as any).tr
              : restaurant?.name || "Restaurant",
          restaurantEmail: "", // As requested
          customerName: user.displayName ?? "Customer",
          items: summarizedItems,
          total,
        });

        return reply.status(201).send({ success: true, data: order });
      } catch (error: any) {
        request.log.error(error);
        return reply
          .status(500)
          .send({
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

      const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !order) {
        return reply
          .status(404)
          .send({ success: false, error: "Order not found" });
      }

      // Permissions check
      const canAccess =
        order.customer_id === user.uid ||
        user.role === "restaurant_admin" ||
        user.role === "super_admin";

      if (!canAccess) {
        return reply
          .status(403)
          .send({ success: false, error: "Access denied" });
      }

      return reply.send({ success: true, data: order });
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
        const { data: order, error: fetchError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError || !order) {
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
          return reply
            .status(403)
            .send({
              success: false,
              error: "Not authorized to transition to this status",
            });
        }

        const updateData: any = { status: newStatus };

        // Waypoints for OUT_FOR_DELIVERY
        if (newStatus === "OUT_FOR_DELIVERY") {
          const { data: restaurant } = await supabase
            .from("restaurants")
            .select("location")
            .eq("id", order.restaurant_id)
            .single();

          if (restaurant && restaurant.location) {
            // locations are typically { type: 'Point', coordinates: [lng, lat] } in PostGIS GeoJSON
            const restLoc = restaurant.location as any;
            const startLng = restLoc.coordinates[0];
            const startLat = restLoc.coordinates[1];
            const endLat = order.delivery_address_snapshot.lat;
            const endLng = order.delivery_address_snapshot.lng;

            if (startLat && startLng && endLat && endLng) {
              const waypoints = [];
              for (let i = 1; i <= 5; i++) {
                const ratio = i / 6;
                waypoints.push({
                  lat: startLat + (endLat - startLat) * ratio,
                  lng: startLng + (endLng - startLng) * ratio,
                });
              }
              updateData.simulated_route_waypoints = waypoints;
            }
          }
        }

        request.log.info(
          { orderId: id, newStatus, userRole: user.role },
          "Attempting status update",
        );
        const { error: updateError } = await supabase
          .from("orders")
          .update(updateData)
          .eq("id", id);

        if (updateError) {
          request.log.error({ updateError }, "Status update failed");
          throw updateError;
        }

        const { data: updatedOrder, error: fetchError2 } = await supabase
          .from("orders")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError2 || !updatedOrder) throw fetchError2;

        // Fetch customer info for notification
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, display_name")
          .eq("id", order.customer_id)
          .single();

        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("name")
          .eq("id", order.restaurant_id)
          .single();

        if (profile) {
          await notifyOrderStatusChange({
            orderId: id,
            customerId: order.customer_id,
            customerEmail: profile.email,
            customerName: profile.display_name,
            restaurantName:
              typeof restaurant?.name === "object"
                ? (restaurant.name as any).en || (restaurant.name as any).tr
                : restaurant?.name || "Restaurant",
            newStatus,
          });
        }

        return reply.send({ success: true, data: updatedOrder });
      } catch (error: any) {
        request.log.error(error);
        return reply
          .status(500)
          .send({
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
        const { data: order, error: fetchError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError || !order) {
          return reply
            .status(404)
            .send({ success: false, error: "Order not found" });
        }

        if (order.customer_id !== user.uid) {
          return reply
            .status(403)
            .send({
              success: false,
              error: "Only the customer can cancel their order",
            });
        }

        if (order.status !== "PENDING") {
          return reply
            .status(400)
            .send({
              success: false,
              error: "Only PENDING orders can be cancelled",
            });
        }

        const { error: updateError } = await supabase
          .from("orders")
          .update({ status: "CANCELLED" })
          .eq("id", id);

        if (updateError) {
          request.log.error({ updateError }, "Order cancellation failed");
          throw updateError;
        }

        const { data: updatedOrder, error: fetchError2 } = await supabase
          .from("orders")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError2 || !updatedOrder) throw fetchError2;

        // Notify
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, display_name")
          .eq("id", order.customer_id)
          .single();

        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("name")
          .eq("id", order.restaurant_id)
          .single();

        if (profile) {
          await notifyOrderStatusChange({
            orderId: id,
            customerId: order.customer_id,
            customerEmail: profile.email,
            customerName: profile.display_name,
            restaurantName:
              typeof restaurant?.name === "object"
                ? (restaurant.name as any).en || (restaurant.name as any).tr
                : restaurant?.name || "Restaurant",
            newStatus: "CANCELLED",
          });
        }

        return reply.send({ success: true, data: updatedOrder });
      } catch (error: any) {
        request.log.error(error);
        return reply
          .status(500)
          .send({
            success: false,
            error: error.message || "Failed to cancel order",
          });
      }
    },
  );
}
