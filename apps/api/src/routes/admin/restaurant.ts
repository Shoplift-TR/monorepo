import { FastifyInstance } from "fastify";
import { supabase } from "../../lib/supabase.js";
import { verifyAuth, requireRestaurantAdmin } from "../../middleware/auth.js";
import { ApiResponse } from "@shoplift/types";

interface MenuBody {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable?: boolean;
  modifiers?: any;
  foodCostPercent?: number;
}

interface UpdateMenuBody {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  is_available?: boolean;
  modifiers?: any;
  image_url?: string;
  display_order?: number;
}

export default async function restaurantAdminRoutes(fastify: FastifyInstance) {
  // All routes in this plugin require restaurant admin access
  fastify.addHook("preHandler", async (request, reply) => {
    await verifyAuth(request, reply);
    if (!reply.sent) {
      await requireRestaurantAdmin(request, reply);
    }
  });

  /**
   * GET /admin/restaurant/orders
   * Query orders table where restaurant_id = request.restaurantId and status in ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].
   * Order by created_at ascending. Return array.
   */
  fastify.get("/orders", async (request, reply) => {
    const restaurantId = request.restaurantId;

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .in("status", ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP"])
      .order("created_at", { ascending: true });

    if (error) {
      return reply.status(500).send({ success: false, error: error.message });
    }

    const response: ApiResponse<any[]> = {
      success: true,
      data: data || [],
      error: null,
    };
    return reply.send(response);
  });

  /**
   * GET /admin/restaurant/menu
   * Query menu_items where restaurant_id = request.restaurantId, ordered by display_order ascending.
   * Return all items including is_available.
   */
  fastify.get("/menu", async (request, reply) => {
    const restaurantId = request.restaurantId;

    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("display_order", { ascending: true });

    if (error) {
      return reply.status(500).send({ success: false, error: error.message });
    }

    const response: ApiResponse<any[]> = {
      success: true,
      data: data || [],
      error: null,
    };
    return reply.send(response);
  });

  /**
   * POST /admin/restaurant/menu/items
   * Body: { name, description, price, category, imageUrl?, isAvailable?, modifiers?, foodCostPercent? }.
   * Get max display_order from existing items for this restaurant, add 1.
   * Insert into menu_items. Return created item with status 201.
   */
  fastify.post<{ Body: MenuBody }>("/menu/items", async (request, reply) => {
    const restaurantId = request.restaurantId;
    const {
      name,
      description,
      price,
      category,
      imageUrl,
      isAvailable,
      modifiers,
      foodCostPercent,
    } = request.body;

    try {
      // 1. Get max display_order
      const { data: maxOrderData, error: maxOrderError } = await supabase
        .from("menu_items")
        .select("display_order")
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxOrderError) throw maxOrderError;

      const nextOrder = (maxOrderData?.display_order || 0) + 1;

      // 2. Insert into menu_items
      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          restaurant_id: restaurantId,
          name,
          description,
          price,
          category,
          image_url: imageUrl,
          is_available: isAvailable ?? true,
          modifiers: modifiers ?? [],
          food_cost_percent: foodCostPercent,
          display_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;

      const response: ApiResponse<any> = {
        success: true,
        data,
        error: null,
      };
      return reply.status(201).send(response);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  /**
   * PUT /admin/restaurant/menu/items/:id
   * Allow updating only: name, description, price, category, is_available, modifiers, image_url, display_order.
   * Verify the item belongs to request.restaurantId before updating. Return updated item.
   */
  fastify.put<{ Params: { id: string }; Body: UpdateMenuBody }>(
    "/menu/items/:id",
    async (request, reply) => {
      const restaurantId = request.restaurantId;
      const { id } = request.params;
      const updates = request.body;

      try {
        // 1. Check if item belongs to this restaurant
        const { data: existing, error: fetchError } = await supabase
          .from("menu_items")
          .select("restaurant_id")
          .eq("id", id)
          .single();

        if (fetchError || !existing) {
          return reply
            .status(404)
            .send({ success: false, error: "Menu item not found" });
        }

        if (existing.restaurant_id !== restaurantId) {
          return reply.status(403).send({
            success: false,
            error: "Forbidden: Item does not belong to your restaurant",
          });
        }

        // 2. Perform update
        const allowedUpdates: any = {};
        const fieldsMapping: Record<string, string> = {
          name: "name",
          description: "description",
          price: "price",
          category: "category",
          is_available: "is_available",
          modifiers: "modifiers",
          image_url: "image_url",
          display_order: "display_order",
        };

        Object.keys(fieldsMapping).forEach((key) => {
          if (key in updates) {
            allowedUpdates[fieldsMapping[key]] = (updates as any)[key];
          }
        });

        const { data, error } = await supabase
          .from("menu_items")
          .update(allowedUpdates)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        const response: ApiResponse<any> = {
          success: true,
          data,
          error: null,
        };
        return reply.send(response);
      } catch (error: any) {
        return reply.status(500).send({ success: false, error: error.message });
      }
    },
  );

  /**
   * DELETE /admin/restaurant/menu/items/:id
   * Soft delete — set is_available = false. Verify item belongs to request.restaurantId. Return { success: true }.
   */
  fastify.delete<{ Params: { id: string } }>(
    "/menu/items/:id",
    async (request, reply) => {
      const restaurantId = request.restaurantId;
      const { id } = request.params;

      try {
        // 1. Check if item belongs to this restaurant
        const { data: existing, error: fetchError } = await supabase
          .from("menu_items")
          .select("restaurant_id")
          .eq("id", id)
          .single();

        if (fetchError || !existing) {
          return reply
            .status(404)
            .send({ success: false, error: "Menu item not found" });
        }

        if (existing.restaurant_id !== restaurantId) {
          return reply.status(403).send({
            success: false,
            error: "Forbidden: Item does not belong to your restaurant",
          });
        }

        // 2. Perform soft delete
        const { error } = await supabase
          .from("menu_items")
          .update({ is_available: false })
          .eq("id", id);

        if (error) throw error;

        const response: ApiResponse<{ success: boolean }> = {
          success: true,
          data: { success: true },
          error: null,
        };
        return reply.send(response);
      } catch (error: any) {
        return reply.status(500).send({ success: false, error: error.message });
      }
    },
  );

  /**
   * GET /admin/restaurant/analytics
   * Query param: period: 'daily' | 'weekly' | 'monthly' (default daily).
   * Calculate date range: daily = today, weekly = last 7 days, monthly = last 30 days.
   * Query analytics_snapshots where restaurant_id = request.restaurantId and date >= rangeStart. Order by date ascending. Return array.
   */
  fastify.get<{ Querystring: { period?: "daily" | "weekly" | "monthly" } }>(
    "/analytics",
    async (request, reply) => {
      const restaurantId = request.restaurantId;
      const period = request.query.period || "daily";

      const now = new Date();
      let rangeStart: Date;

      if (period === "weekly") {
        rangeStart = new Date(now);
        rangeStart.setDate(now.getDate() - 7);
      } else if (period === "monthly") {
        rangeStart = new Date(now);
        rangeStart.setDate(now.getDate() - 30);
      } else {
        // daily = today
        rangeStart = new Date(now);
      }

      const rangeStartStr = rangeStart.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("analytics_snapshots")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("date", rangeStartStr)
        .order("date", { ascending: true });

      if (error) {
        return reply.status(500).send({ success: false, error: error.message });
      }

      const response: ApiResponse<any[]> = {
        success: true,
        data: data || [],
        error: null,
      };
      return reply.send(response);
    },
  );
}
