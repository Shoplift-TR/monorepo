import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { verifyAuth, requireRole } from "../middleware/auth.js";
import { ApiResponse, TrackingOverview, TrackingRoute } from "@shoplift/types";
import { db, orders, restaurants } from "@shoplift/db";
import { eq, desc } from "drizzle-orm";

/**
 * assertTrackingAccess
 */
function assertTrackingAccess(order: any, user: any, reply: FastifyReply) {
  if (user.role === "super_admin") return true;

  if (user.role === "customer") {
    if (order.customerId !== user.uid) {
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
    if (order.restaurantId !== user.restaurantId) {
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

      try {
        const orderResult = await db
          .select({
            id: orders.id,
            status: orders.status,
            estimatedDeliveryTime: orders.estimatedDeliveryTime,
            driverId: orders.driverId,
            deliveryAddressSnapshot: orders.deliveryAddressSnapshot,
            createdAt: orders.createdAt,
            confirmedAt: orders.confirmedAt,
            deliveredAt: orders.deliveredAt,
            customerId: orders.customerId,
            restaurantId: orders.restaurantId,
            restaurantName: restaurants.name,
          })
          .from(orders)
          .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
          .where(eq(orders.id, orderId))
          .limit(1);

        const order = orderResult[0];

        if (!order) {
          return reply.status(404).send({
            success: false,
            data: null,
            error: "Order not found",
          } as ApiResponse<null>);
        }

        if (!assertTrackingAccess(order, request.user, reply)) return;

        const response = {
          success: true,
          data: {
            orderId: order.id,
            status: order.status,
            estimatedDeliveryTime: order.estimatedDeliveryTime,
            driverId: order.driverId,
            restaurantName:
              typeof order.restaurantName === "object" &&
              order.restaurantName &&
              "en" in order.restaurantName
                ? (order.restaurantName as any).en
                : (order.restaurantName as string) || "",
            deliveryAddressSnapshot: order.deliveryAddressSnapshot as object,
            createdAt: order.createdAt ? order.createdAt.toISOString() : null,
            confirmedAt: order.confirmedAt
              ? order.confirmedAt.toISOString()
              : null,
            deliveredAt: order.deliveredAt
              ? order.deliveredAt.toISOString()
              : null,
          },
          error: null,
        } as any;

        return reply.send(response);
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message || "Failed to fetch tracking overview",
        });
      }
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

      try {
        const orderResult = await db
          .select({
            id: orders.id,
            status: orders.status,
            simulatedRouteWaypoints: orders.simulatedRouteWaypoints,
            customerId: orders.customerId,
            restaurantId: orders.restaurantId,
          })
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);

        const order = orderResult[0];

        if (!order) {
          return reply.status(404).send({
            success: false,
            data: null,
            error: "Order not found",
          } as ApiResponse<null>);
        }

        if (!assertTrackingAccess(order, request.user, reply)) return;

        if (!order.simulatedRouteWaypoints) {
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
            waypoints: order.simulatedRouteWaypoints as any,
            totalPoints: (order.simulatedRouteWaypoints as any[]).length,
          },
          error: null,
        };

        return reply.send(response);
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message || "Failed to fetch tracking route",
        });
      }
    },
  );
}
