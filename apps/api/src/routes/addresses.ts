import { FastifyInstance } from "fastify";
import { verifyAuth } from "../middleware/auth.js";
import { db, addresses } from "@shoplift/db";
import { eq, desc } from "drizzle-orm";

interface CreateAddressBody {
  label: string;
  street: string;
  district: string;
  city: string;
  lat?: number;
  lng?: number;
}

export default async function addressRoutes(fastify: FastifyInstance) {
  /**
   * GET /addresses
   * Requires verifyAuth. Returns all addresses for the calling user.
   */
  fastify.get("/", { preHandler: [verifyAuth] }, async (request, reply) => {
    const user = (request as any).user;

    const result = await db
      .select()
      .from(addresses)
      .where(eq(addresses.profileId, user.uid))
      .orderBy(desc(addresses.createdAt));

    return reply.send({ success: true, data: result });
  });

  /**
   * POST /addresses
   * Requires verifyAuth. Inserts a new address for the calling user.
   */
  fastify.post<{ Body: CreateAddressBody }>(
    "/",
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const user = (request as any).user;
      const { label, street, district, city, lat, lng } = request.body;

      try {
        const result = await db
          .insert(addresses)
          .values({
            profileId: user.uid,
            label,
            street,
            district,
            city,
            lat: lat?.toString(),
            lng: lng?.toString(),
          })
          .returning();

        return reply.status(201).send({ success: true, data: result[0] });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error.message || "Failed to create address",
        });
      }
    },
  );
}
