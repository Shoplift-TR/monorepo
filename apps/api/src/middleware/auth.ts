import { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "../lib/firebase.js";
import { ApiResponse } from "@shoplift/types";

/**
 * Middleware to verify Firebase ID tokens.
 * Extracts the Bearer token from the Authorization header and verifies it.
 * Attaches the decoded token to request.user.
 */
export const verifyAuth = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const errorResponse: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Unauthorized: Missing or invalid Authorization header",
    };
    return reply.status(401).send(errorResponse);
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await auth.verifyIdToken(token);

    // Attach the decoded token (including custom claims) to the request
    request.user = decodedToken;
  } catch (_error) {
    const errorResponse: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Unauthorized: Invalid token",
    };
    return reply.status(401).send(errorResponse);
  }
};
