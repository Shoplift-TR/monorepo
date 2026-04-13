import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyAuth } from "./auth.js";

/**
 * RBAC Middleware
 *
 * Provides authorization hooks and decorates fastify with .authenticate.
 */
export async function setupRBACMiddleware(fastify: FastifyInstance) {
  // We decorate the instance so it can be used in preHandler: [fastify.authenticate]
  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await verifyAuth(request, reply);
      } catch (err) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or missing authentication token",
          },
        });
      }
    },
  );
}
