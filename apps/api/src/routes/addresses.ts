import { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyAuth } from "../middleware/auth.js";
import { db, addresses } from "@shoplift/db";
import { eq, desc } from "drizzle-orm";

// Zod Schemas
const CreateAddressSchema = z
  .object({
    label: z.string().min(1).max(50),
    street: z.string().min(1).max(255),
    district: z.string().min(1).max(100),
    city: z.string().min(1).max(100),
    lat: z.number().optional(),
    lng: z.number().optional(),
  })
  .strict();

export default async function addressRoutes(fastify: FastifyInstance) {
  /**
   * GET /addresses
   */
  fastify.get("/", { preHandler: [verifyAuth] }, async (request, reply) => {
    const user = request.user!;

    try {
      const result = await db
        .select()
        .from(addresses)
        .where(eq(addresses.profileId, user.id))
        .orderBy(desc(addresses.createdAt));

      return reply.send({ success: true, data: result });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch addresses" },
      });
    }
  });

  /**
   * POST /addresses
   */
  fastify.post("/", { preHandler: [verifyAuth] }, async (request, reply) => {
    const user = request.user!;

    const validation = CreateAddressSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid address data",
          details: validation.error.issues.map((e: z.ZodIssue) => ({
            field: e.path.join("."),
            issue: e.message,
          })),
        },
      });
    }

    const { label, street, district, city, lat, lng } = validation.data;

    try {
      const result = await db
        .insert(addresses)
        .values({
          profileId: user.id,
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
        error: { code: "INTERNAL_ERROR", message: "Failed to create address" },
      });
    }
  });
}
