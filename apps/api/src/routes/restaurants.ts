import { FastifyInstance } from "fastify";
import { ApiResponse, Restaurant } from "@shoplift/types";
import { supabase } from "../lib/supabase.js";

/**
 * Utility to calculate distance between two coordinates in Kilometers
 * (Haversine formula — used for in-memory proximity filter at pilot scale)
 */
function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface RestaurantsQuery {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  cuisine?: string | string[];
}

export default async function restaurantRoutes(fastify: FastifyInstance) {
  /**
   * GET /restaurants
   * Returns a list of active restaurants, optionally filtered by proximity and cuisine.
   */
  fastify.get(
    "/",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            lat: { type: "number" },
            lng: { type: "number" },
            radiusKm: { type: "number", default: 10 },
            cuisine: {
              oneOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } },
              ],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { lat, lng, radiusKm, cuisine } = request.query as RestaurantsQuery;

      try {
        let query = supabase
          .from("restaurants")
          .select("*")
          .eq("is_active", true);

        // Filter by cuisine tags if provided
        if (cuisine) {
          const cuisineArray = Array.isArray(cuisine)
            ? cuisine
            : cuisine.split(",").map((c: string) => c.trim());

          if (cuisineArray.length > 0) {
            // PostGIS cuisine_tags is text[], use overlaps operator
            query = query.overlaps("cuisine_tags", cuisineArray);
          }
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        let restaurants: Restaurant[] = (data ?? []).map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          logo: row.logo_url,
          address: row.address,
          location: row.location,
          operatingHours: row.operating_hours,
          cuisineTags: row.cuisine_tags,
          isActive: row.is_active,
          commissionRate: row.commission_rate,
          rating: row.rating,
          totalOrders: row.total_orders,
        }));

        // Apply proximity filter in memory at pilot scale.
        // TODO: Replace with PostGIS ST_DWithin query when restaurant count grows.
        if (typeof lat === "number" && typeof lng === "number") {
          restaurants = restaurants.filter((restaurant) => {
            const distance = getDistanceKm(
              lat,
              lng,
              restaurant.location.lat,
              restaurant.location.lng,
            );
            return distance <= (radiusKm ?? 10);
          });
        }

        const response: ApiResponse<Restaurant[]> = {
          success: true,
          data: restaurants,
          error: null,
        };

        return response;
      } catch (error) {
        request.log.error(error);
        const errorResponse: ApiResponse<null> = {
          success: false,
          data: null,
          error: "Failed to fetch restaurants",
        };
        return reply.status(500).send(errorResponse);
      }
    },
  );

  fastify.get("/:id", async (_request, _reply) => {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Not Implemented",
    };
    return response;
  });
}
