import { FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../lib/supabase.js";
import { ApiResponse } from "@shoplift/types";

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
    const errorResponse: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Unauthorized: Missing authentication token",
    };
    return reply.status(401).send(errorResponse);
  }

  // Verify JWT and get Supabase auth user
  const { data: authData, error: authError } =
    await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    const errorResponse: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Unauthorized: Invalid or expired token",
    };
    return reply.status(401).send(errorResponse);
  }

  // Fetch profile from Postgres for role + restaurantId
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    const errorResponse: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Unauthorized: User profile not found",
    };
    return reply.status(401).send(errorResponse);
  }

  request.user = {
    uid: authData.user.id,
    email: authData.user.email ?? "",
    displayName: profile.display_name || "Customer",
    role: profile.role,
    restaurantId: profile.restaurant_id ?? null,
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
      const errorResponse: ApiResponse<null> = {
        success: false,
        data: null,
        error: `Forbidden: requires one of [${roles.join(", ")}]`,
      };
      return reply.status(403).send(errorResponse);
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
  if (!request.user || request.user.role !== "restaurant_admin") {
    const errorResponse: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Forbidden: restaurant admin access required",
    };
    return reply.status(403).send(errorResponse);
  }

  if (!request.user.restaurantId) {
    const errorResponse: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Forbidden: no restaurant associated with this account",
    };
    return reply.status(403).send(errorResponse);
  }

  request.restaurantId = request.user.restaurantId;
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
    const errorResponse: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Forbidden: super admin access required",
    };
    return reply.status(403).send(errorResponse);
  }
};
