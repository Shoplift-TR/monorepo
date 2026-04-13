import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { db, restaurants, menuItems } from "@shoplift/db";
import { eq, and, asc, desc, sql } from "drizzle-orm";

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
          const result = await db
            .select()
            .from(restaurants)
            .where(
              and(
                eq(restaurants.isActive, true),
                eq(restaurants.isApproved, true),
                cuisine
                  ? sql`${restaurants.cuisineTags} @> ARRAY[${cuisine}]::text[]`
                  : undefined,
              ),
            )
            .orderBy(desc(restaurants.rating));

          return reply.send({ success: true, data: result });
        }
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch restaurants",
          },
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
      const result = await db
        .select()
        .from(restaurants)
        .where(and(eq(restaurants.id, id), eq(restaurants.isActive, true)))
        .limit(1);

      if (!result[0]) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Restaurant not found",
          },
        });
      }

      return reply.send({ success: true, data: result[0] });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch restaurant",
        },
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
        const items = await db
          .select()
          .from(menuItems)
          .where(
            and(
              eq(menuItems.restaurantId, id),
              eq(menuItems.isAvailable, true),
            ),
          )
          .orderBy(asc(menuItems.displayOrder));

        return reply.send({
          success: true,
          data: items,
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch menu items",
          },
        });
      }
    },
  );
}
