import { FastifyInstance } from "fastify";
import { verifyAuth, requireRestaurantAdmin } from "../../middleware/auth.js";
import { ApiResponse } from "@shoplift/types";
import { db, orders, menuItems, analyticsSnapshots } from "@shoplift/db";
import { eq, and, asc, desc, inArray, gte } from "drizzle-orm";

interface MenuBody {
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable?: boolean;
  modifiers?: any;
  foodCostPercent?: number;
}

interface UpdateMenuBody {
  name?: { tr: string; en: string };
  description?: { tr: string; en: string };
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
    const restaurantId = request.restaurantId as string;

    const result = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          inArray(orders.status, [
            "PENDING",
            "CONFIRMED",
            "PREPARING",
            "READY_FOR_PICKUP",
          ]),
        ),
      )
      .orderBy(asc(orders.createdAt));

    const response: ApiResponse<any[]> = {
      success: true,
      data: result || [],
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
    const restaurantId = request.restaurantId as string;

    const result = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId))
      .orderBy(asc(menuItems.displayOrder));

    const response: ApiResponse<any[]> = {
      success: true,
      data: result || [],
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
    const restaurantId = request.restaurantId as string;
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
      const maxOrderResult = await db
        .select({ displayOrder: menuItems.displayOrder })
        .from(menuItems)
        .where(eq(menuItems.restaurantId, restaurantId))
        .orderBy(desc(menuItems.displayOrder))
        .limit(1);

      const nextOrder = (maxOrderResult[0]?.displayOrder || 0) + 1;

      // 2. Insert into menu_items
      const result = await db
        .insert(menuItems)
        .values({
          restaurantId: restaurantId,
          name,
          description,
          price: price.toString(),
          category,
          imageUrl,
          isAvailable: isAvailable ?? true,
          modifiers: modifiers ?? [],
          foodCostPercent: foodCostPercent?.toString(),
          displayOrder: nextOrder,
        })
        .returning();

      const data = result[0];

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
      const restaurantId = request.restaurantId as string;
      const { id } = request.params;
      const updates = request.body;

      try {
        // 1. Check if item belongs to this restaurant
        const existingResult = await db
          .select({ restaurantId: menuItems.restaurantId })
          .from(menuItems)
          .where(eq(menuItems.id, id))
          .limit(1);

        const existing = existingResult[0];

        if (!existing) {
          return reply
            .status(404)
            .send({ success: false, error: "Menu item not found" });
        }

        if (existing.restaurantId !== restaurantId) {
          return reply.status(403).send({
            success: false,
            error: "Forbidden: Item does not belong to your restaurant",
          });
        }

        // 2. Perform update
        const allowedUpdates: Record<string, any> = {};
        if (updates.name !== undefined) allowedUpdates.name = updates.name;
        if (updates.description !== undefined)
          allowedUpdates.description = updates.description;
        if (updates.price !== undefined)
          allowedUpdates.price = String(updates.price);
        if (updates.category !== undefined)
          allowedUpdates.category = updates.category;
        if (updates.is_available !== undefined)
          allowedUpdates.isAvailable = updates.is_available;
        if (updates.modifiers !== undefined)
          allowedUpdates.modifiers = updates.modifiers;
        if (updates.image_url !== undefined)
          allowedUpdates.imageUrl = updates.image_url;
        if (updates.display_order !== undefined)
          allowedUpdates.displayOrder = updates.display_order;
        allowedUpdates.updatedAt = new Date();

        const result = await db
          .update(menuItems)
          .set(allowedUpdates)
          .where(eq(menuItems.id, id))
          .returning();

        const data = result[0];

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
      const restaurantId = request.restaurantId as string;
      const { id } = request.params;

      try {
        // 1. Check if item belongs to this restaurant
        const existingResult = await db
          .select({ restaurantId: menuItems.restaurantId })
          .from(menuItems)
          .where(eq(menuItems.id, id))
          .limit(1);

        const existing = existingResult[0];

        if (!existing) {
          return reply
            .status(404)
            .send({ success: false, error: "Menu item not found" });
        }

        if (existing.restaurantId !== restaurantId) {
          return reply.status(403).send({
            success: false,
            error: "Forbidden: Item does not belong to your restaurant",
          });
        }

        // 2. Perform soft delete
        await db
          .update(menuItems)
          .set({ isAvailable: false })
          .where(eq(menuItems.id, id));

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
      const restaurantId = request.restaurantId as string;
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

      const result = await db
        .select()
        .from(analyticsSnapshots)
        .where(
          and(
            eq(analyticsSnapshots.restaurantId, restaurantId),
            gte(analyticsSnapshots.date, rangeStartStr),
          ),
        )
        .orderBy(asc(analyticsSnapshots.date));

      const response: ApiResponse<any[]> = {
        success: true,
        data: result || [],
        error: null,
      };
      return reply.send(response);
    },
  );
}
