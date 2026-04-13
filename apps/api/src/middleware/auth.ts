import { FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../lib/supabase.js";
import { ApiResponse } from "@shoplift/types";
import { db, profiles } from "@shoplift/db";
import { eq } from "drizzle-orm";

/**
 * verifyAuth
 *
 * Verifies the Supabase JWT from the Authorization header, fetches the
 * caller's profile row from Postgres, and attaches a normalised user
 * object to request.user.
 *
 * Shape attached: { uid, email, role, restaurantId }
 */
export const verifyAuth = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const authHeader = request.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split("Bearer ")[1];
  } else if (request.cookies.token) {
    token = request.cookies.token;
  }

  if (!token) {
    return reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing authentication token",
      },
    });
  }

  // Verify JWT and get Supabase auth user
  const { data: authData, error: authError } =
    await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    request.log.warn(
      { authError, path: request.url },
      "Unauthorized access attempt: Invalid token",
    );
    return reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      },
    });
  }

  // Fetch profile from Postgres for role + restaurantId
  const profileResult = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, authData.user.id))
    .limit(1);

  const profile = profileResult[0];

  if (!profile) {
    request.log.error(
      { userId: authData.user.id },
      "Security event: Authenticated user has no profile",
    );
    return reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "User profile not found",
      },
    });
  }

  if (profile.isActive === false) {
    request.log.warn(
      { userId: authData.user.id },
      "Forbidden access attempt: Account is disabled",
    );
    return reply.status(403).send({
      success: false,
      error: {
        code: "ACCOUNT_DISABLED",
        message: "This account has been disabled",
      },
    });
  }

  request.user = {
    uid: authData.user.id,
    id: authData.user.id,
    email: authData.user.email ?? "",
    displayName: profile.displayName || "Customer",
    username: profile.username || null,
    role: profile.role,
    restaurantId: profile.restaurantId ?? null,
    restaurant_id: profile.restaurantId ?? null,
  };
};

/**
 * requireRole(...roles)
 *
 * Middleware factory. Returns a preHandler that 403s unless
 * request.user.role is one of the supplied roles.
 *
 * Usage:
 *   preHandler: [verifyAuth, requireRole('super_admin', 'restaurant_admin')]
 */
export const requireRole =
  (...roles: string[]) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !roles.includes(request.user.role)) {
      request.log.warn(
        {
          userId: request.user?.uid,
          role: request.user?.role,
          requiredRoles: roles,
          path: request.url,
        },
        "Forbidden access attempt: Insufficient permissions",
      );
      return reply.status(403).send({
        success: false,
        error: {
          code: "ROLE_VIOLATION",
          message: `Only users with roles [${roles.join(", ")}] can access this resource`,
        },
      });
    }
  };

/**
 * requireRestaurantAdmin
 *
 * Checks that the caller is a restaurant_admin and attaches their
 * restaurantId to request.restaurantId for downstream use.
 *
 * Usage:
 *   preHandler: [verifyAuth, requireRestaurantAdmin]
 */
export const requireRestaurantAdmin = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (
    !request.user ||
    (request.user.role !== "restaurant_admin" &&
      request.user.role !== "super_admin")
  ) {
    request.log.warn(
      { userId: request.user?.uid, path: request.url },
      "Forbidden access attempt: Not a restaurant admin",
    );
    return reply.status(403).send({
      success: false,
      error: {
        code: "ROLE_VIOLATION",
        message: "Restaurant admin access required",
      },
    });
  }

  // Super admins bypass ownership check in some contexts, but middleware should pass if authorized
  if (request.user.role === "restaurant_admin" && !request.user.restaurantId) {
    request.log.error(
      { userId: request.user?.uid },
      "Security event: Restaurant admin has no restaurantId",
    );
    return reply.status(403).send({
      success: false,
      error: {
        code: "OWNERSHIP_VIOLATION",
        message: "No restaurant associated with this account",
      },
    });
  }

  request.restaurantId = request.user.restaurantId ?? undefined;
};

/**
 * requireSuperAdmin
 *
 * Checks that the caller has role === 'super_admin'.
 *
 * Usage:
 *   preHandler: [verifyAuth, requireSuperAdmin]
 */
export const requireSuperAdmin = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (!request.user || request.user.role !== "super_admin") {
    request.log.warn(
      { userId: request.user?.uid, path: request.url },
      "Forbidden access attempt: Not a super admin",
    );
    return reply.status(403).send({
      success: false,
      error: {
        code: "ROLE_VIOLATION",
        message: "Super admin access required",
      },
    });
  }
};

/**
 * checkRestaurantOwnership
 *
 * Verifies that the authenticated user (restaurant_admin) owns the
 * requested restaurant. Super admins bypass this check.
 */
export const checkRestaurantOwnership = (
  request: FastifyRequest,
  targetRestaurantId: string,
) => {
  if (request.user?.role === "super_admin") return;

  if (request.user?.role !== "restaurant_admin") {
    throw new Error("ROLE_VIOLATION"); // Handled by standard error handler or manual catch
  }

  if (request.user.restaurantId !== targetRestaurantId) {
    throw new Error("OWNERSHIP_VIOLATION");
  }
};
