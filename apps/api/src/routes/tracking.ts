import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../lib/supabase.js";
import { verifyAuth, requireRole } from "../middleware/auth.js";
import { ApiResponse, TrackingOverview, TrackingRoute } from "@shoplift/types";

/**
 * assertTrackingAccess
 *
 * Enforces ownership:
 * - Customers can only track their own orders.
 * - Restaurant admins can only track orders belonging to their restaurant.
 * - Super admins can track anything.
 */
function assertTrackingAccess(order: any, user: any, reply: FastifyReply) {
  if (user.role === "super_admin") return true;

  if (user.role === "customer") {
    if (order.customer_id !== user.uid) {
      reply.status(403).send({
        success: false,
        data: null,
        error: "Forbidden: You do not have access to this order tracking",
      } as ApiResponse<null>);
      return false;
    }
    return true;
  }

  if (user.role === "restaurant_admin") {
    if (order.restaurant_id !== user.restaurantId) {
      reply.status(403).send({
        success: false,
        data: null,
        error: "Forbidden: This order does not belong to your restaurant",
      } as ApiResponse<null>);
      return false;
    }
    return true;
  }

  reply.status(403).send({
    success: false,
    data: null,
    error: "Forbidden: Access denied",
  } as ApiResponse<null>);
  return false;
}

export default async function trackingRoutes(fastify: FastifyInstance) {
  // GET /tracking/:orderId
  fastify.get<{ Params: { orderId: string } }>(
    "/:orderId",
    {
      preHandler: [
        verifyAuth,
        requireRole("customer", "restaurant_admin", "super_admin"),
      ],
    },
    async (request: any, reply) => {
      const { orderId } = request.params;

      const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error || !order) {
        return reply.status(404).send({
          success: false,
          data: null,
          error: "Order not found",
        } as ApiResponse<null>);
      }

      if (!assertTrackingAccess(order, request.user, reply)) return;

      const response: ApiResponse<TrackingOverview> = {
        success: true,
        data: {
          orderId: order.id,
          status: order.status,
          estimatedDeliveryTime: order.estimated_delivery_time,
          driverId: order.driver_id,
          restaurantName: order.restaurant_name || null,
          deliveryAddressSnapshot: order.delivery_address_snapshot,
          createdAt: order.created_at,
          confirmedAt: order.confirmed_at,
          deliveredAt: order.delivered_at,
        },
        error: null,
      };

      return reply.send(response);
    },
  );

  // GET /tracking/:orderId/route
  fastify.get<{ Params: { orderId: string } }>(
    "/:orderId/route",
    {
      preHandler: [
        verifyAuth,
        requireRole("customer", "restaurant_admin", "super_admin"),
      ],
    },
    async (request: any, reply) => {
      const { orderId } = request.params;

      const { data: order, error } = await supabase
        .from("orders")
        .select(
          "id, status, simulated_route_waypoints, customer_id, restaurant_id",
        )
        .eq("id", orderId)
        .single();

      if (error || !order) {
        return reply.status(404).send({
          success: false,
          data: null,
          error: "Order not found",
        } as ApiResponse<null>);
      }

      if (!assertTrackingAccess(order, request.user, reply)) return;

      if (!order.simulated_route_waypoints) {
        const response: ApiResponse<TrackingRoute> = {
          success: true,
          data: {
            waypoints: null,
            message: "Route not yet available — order has not been picked up",
          },
          error: null,
        };
        return reply.send(response);
      }

      const response: ApiResponse<TrackingRoute> = {
        success: true,
        data: {
          waypoints: order.simulated_route_waypoints,
          totalPoints: order.simulated_route_waypoints.length,
        },
        error: null,
      };

      return reply.send(response);
    },
  );
}
