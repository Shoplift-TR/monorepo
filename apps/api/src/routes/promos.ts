import { FastifyInstance } from "fastify";
import { validatePromo } from "../lib/promos.js";
import { verifyAuth } from "../middleware/auth.js";

interface PromoValidationBody {
  code: string;
  restaurantId: string;
  cartTotal: number;
  cartItemIds: string[];
}

export default async function promoRoutes(fastify: FastifyInstance) {
  /**
   * POST /promos/validate
   * Requires verifyAuth. Calls validatePromo and returns its result.
   */
  fastify.post<{ Body: PromoValidationBody }>(
    "/validate",
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const user = (request as any).user;
      const { code, restaurantId, cartTotal, cartItemIds } = request.body;

      try {
        const result = await validatePromo({
          code,
          userId: user.uid,
          restaurantId,
          cartTotal,
          cartItemIds,
        });

        return reply.send({ success: true, data: result });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error.message || "Failed to validate promo code",
        });
      }
    },
  );
}
