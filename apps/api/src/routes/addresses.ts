import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { verifyAuth } from "../middleware/auth.js";

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

    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("profile_id", user.uid)
      .order("created_at", { ascending: false });

    if (error) {
      request.log.error(error);
      return reply.status(500).send({ success: false, error: error.message });
    }

    return reply.send({ success: true, data });
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
        const { data, error } = await supabase
          .from("addresses")
          .insert({
            profile_id: user.uid,
            label,
            street,
            district,
            city,
            lat: lat || 0, // Fallback if not provided, though prompt didn't specify
            lng: lng || 0, // Fallback
          })
          .select()
          .single();

        if (error) throw error;

        return reply.status(201).send({ success: true, data });
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
