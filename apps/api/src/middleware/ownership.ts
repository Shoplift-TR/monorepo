import { FastifyRequest, FastifyReply } from "fastify";
import { db, auditLogs } from "@shoplift/db";

/**
 * createOwnershipMiddleware
 *
 * Enforces that the authenticated user (admin) owns the restaurant identified
 * by a route parameter (defaulting to 'restaurant_id').
 * Super admins bypass this check.
 */
export function createOwnershipMiddleware(paramName: string = "restaurant_id") {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const targetRestaurantId = (request.params as any)[paramName];

    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      });
    }

    // Super Admin bypass
    if (request.user.role === "super_admin") {
      return;
    }

    if (request.user.role !== "restaurant_admin") {
      return reply.status(403).send({
        success: false,
        error: {
          code: "ROLE_VIOLATION",
          message: "Only admins can access this resource",
        },
      });
    }

    if (request.user.restaurant_id !== targetRestaurantId) {
      // Log security event (Ownership Violation)
      try {
        await db.insert(auditLogs).values({
          adminId: request.user.id,
          action: "OWNERSHIP_VIOLATION_ATTEMPT",
          targetType: "restaurant",
          targetId: targetRestaurantId,
          ipAddress: request.ip,
          payload: {
            path: request.url,
            method: request.method,
            user_restaurant_id: request.user.restaurant_id,
            target_restaurant_id: targetRestaurantId,
          },
        });
      } catch (logError) {
        request.log.error(logError, "Failed to log ownership violation");
      }

      return reply.status(403).send({
        success: false,
        error: {
          code: "OWNERSHIP_VIOLATION",
          message: "You do not have access to this restaurant",
        },
      });
    }
  };
}
