import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { db, restaurants, menuItems, restaurantHours } from "@shoplift/db";
import { eq, and, asc, desc, sql, inArray } from "drizzle-orm";

interface RestaurantsQuery {
  lat?: number;
  lng?: number;
  radius?: number;
  cuisine?: string;
  open_now?: boolean;
  open_between_start?: string; // HH:MM
  open_between_end?: string; // HH:MM
  tz?: string;
}

import { DateTime } from "luxon";

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
            open_now: { type: "boolean" },
            open_between_start: { type: "string" },
            open_between_end: { type: "string" },
            tz: { type: "string", default: "Asia/Nicosia" },
          },
        },
      },
    },
    async (request, reply) => {
      const {
        lat,
        lng,
        radius,
        cuisine,
        open_now,
        open_between_start,
        open_between_end,
        tz,
      } = request.query;

      const timezone = tz || "Asia/Nicosia";
      const now = DateTime.now().setZone(timezone);
      const currentDay = now.weekday % 7; // Luxon 1-7 (Mon-Sun), DB 0-6 (Sun-Sat)
      const currentDayAdjusted = currentDay === 0 ? 0 : currentDay;
      // Actually Luxon: 1 (Mon) ... 7 (Sun)
      // DB: 0 (Sun) ... 6 (Sat)
      const dbDay = now.weekday === 7 ? 0 : now.weekday;
      const currentTime = now.toFormat("HH:mm:ss");

      try {
        let restaurantIds: string[] | null = null;

        if (open_now || (open_between_start && open_between_end)) {
          const filterStart = open_between_start
            ? `${open_between_start}:00`
            : currentTime;
          const filterEnd = open_between_end
            ? `${open_between_end}:00`
            : currentTime;

          // Find restaurants that are open during the requested period
          const openHours = await db
            .select({ restaurantId: restaurantHours.restaurantId })
            .from(restaurantHours)
            .where(
              and(
                eq(restaurantHours.dayOfWeek, dbDay),
                eq(restaurantHours.isClosed, false),
                sql`
                  CASE 
                    WHEN ${restaurantHours.openTime} <= ${restaurantHours.closeTime} THEN 
                      ${filterStart} >= ${restaurantHours.openTime} AND ${filterEnd} <= ${restaurantHours.closeTime}
                    ELSE 
                      ${filterStart} >= ${restaurantHours.openTime} OR ${filterEnd} <= ${restaurantHours.closeTime}
                  END
                `,
              ),
            );

          restaurantIds = openHours.map((h) => h.restaurantId);

          // If no restaurants are open but filtering was requested, return empty early
          if (restaurantIds.length === 0) {
            return reply.send({ success: true, data: [] });
          }
        }

        if (typeof lat === "number" && typeof lng === "number") {
          // Use RPC for proximity search
          const { data, error } = await supabase.rpc("get_restaurants_near", {
            lat,
            lng,
            radius_meters: radius ?? 5000,
            cuisine_filter: cuisine || null,
          });

          if (error) throw error;

          let filteredData = data;
          if (restaurantIds) {
            filteredData = data.filter((r: any) =>
              restaurantIds!.includes(r.id),
            );
          }

          return reply.send({ success: true, data: filteredData });
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
                restaurantIds
                  ? inArray(restaurants.id, restaurantIds)
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
