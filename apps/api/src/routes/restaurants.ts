import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";

interface RestaurantsQuery {
  lat?: number;
  lng?: number;
  radius?: number;
  cuisine?: string;
}

export default async function restaurantRoutes(fastify: FastifyInstance) {
  /**
   * GET /restaurants
   * Returns a list of active restaurants, optionally filtered by proximity and cuisine.
   */
  fastify.get<{ Querystring: RestaurantsQuery }>(
    "/",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            lat: { type: "number" },
            lng: { type: "number" },
            radius: { type: "number", default: 5000 },
            cuisine: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { lat, lng, radius, cuisine } = request.query;

      try {
        if (typeof lat === "number" && typeof lng === "number") {
          // Use RPC for proximity search
          const { data, error } = await supabase.rpc("get_restaurants_near", {
            lat,
            lng,
            radius_meters: radius ?? 5000,
            cuisine_filter: cuisine || null,
          });

          if (error) throw error;
          return reply.send({ success: true, data });
        } else {
          // Standard query with optional cuisine filter
          let query = supabase
            .from("restaurants")
            .select("*")
            .eq("is_active", true)
            .eq("is_approved", true)
            .order("rating", { ascending: false });

          if (cuisine) {
            query = query.contains("cuisine_tags", [cuisine]);
          }

          const { data, error } = await query;
          if (error) throw error;

          return reply.send({ success: true, data });
        }
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error.message || "Failed to fetch restaurants",
        });
      }
    },
  );

  /**
   * GET /restaurants/:id
   */
  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = request.params;

    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return reply
          .status(404)
          .send({ success: false, error: "Restaurant not found" });
      }

      return reply.send({ success: true, data });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message || "Failed to fetch restaurant",
      });
    }
  });

  /**
   * GET /restaurants/:id/menu
   */
  fastify.get<{ Params: { id: string } }>(
    "/:id/menu",
    async (request, reply) => {
      const { id } = request.params;

      try {
        const { data, error } = await supabase
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", id)
          .eq("is_available", true)
          .order("display_order", { ascending: true });

        if (error) throw error;

        // Group by category
        const categories: Record<string, any[]> = {};
        data.forEach((item) => {
          const cat = item.category || "General";
          if (!categories[cat]) {
            categories[cat] = [];
          }
          categories[cat].push(item);
        });

        return reply.send({
          success: true,
          data: { categories },
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error.message || "Failed to fetch menu items",
        });
      }
    },
  );
}
