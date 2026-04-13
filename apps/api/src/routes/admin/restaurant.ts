import { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyAuth } from "../../middleware/auth.js";
import { createOwnershipMiddleware } from "../../middleware/ownership.js";
import { db, orders, menuItems, analyticsSnapshots } from "@shoplift/db";
import { eq, and, asc, desc, inArray, gte } from "drizzle-orm";
import { writeAuditLog } from "../../lib/audit.js";

// Zod Schemas
const MenuBodySchema = z
  .object({
    name: z
      .object({
        tr: z.string().trim().min(1),
        en: z.string().trim().min(1),
      })
      .strict(),
    description: z
      .object({
        tr: z.string().trim().optional(),
        en: z.string().trim().optional(),
      })
      .strict()
      .optional(),
    price: z.number().int().nonnegative(), // INTEGER (cents)
    category: z.string().trim().min(1),
    imageUrl: z.string().url().trim().optional().or(z.literal("")),
    isAvailable: z.boolean().optional(),
    modifiers: z.array(z.any()).optional(), // TODO: stricter modifier schema later
    foodCostPercent: z.number().min(0).max(100).optional(),
  })
  .strict();

const UpdateMenuBodySchema = z
  .object({
    name: z
      .object({
        tr: z.string().trim().min(1),
        en: z.string().trim().min(1),
      })
      .strict()
      .optional(),
    description: z
      .object({
        tr: z.string().trim().optional(),
        en: z.string().trim().optional(),
      })
      .strict()
      .optional(),
    price: z.number().int().nonnegative().optional(),
    category: z.string().trim().min(1).optional(),
    is_available: z.boolean().optional(),
    modifiers: z.array(z.any()).optional(),
    image_url: z.string().url().trim().optional().or(z.literal("")),
    display_order: z.number().int().optional(),
    food_cost_percent: z.number().min(0).max(100).optional(),
  })
  .strict();

export default async function restaurantAdminRoutes(fastify: FastifyInstance) {
  // All routes in this plugin require restaurant admin access and ownership verification
  fastify.addHook("preHandler", async (request, reply) => {
    await verifyAuth(request, reply);
    if (!reply.sent) {
      await createOwnershipMiddleware("restaurant_id")(request, reply);
    }
  });

  /**
   * GET /admin/restaurant/orders
   */
  fastify.get("/orders", async (request, reply) => {
    const { restaurant_id: restaurantId } = request.params as {
      restaurant_id: string;
    };

    try {
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

      return reply.send({ success: true, data: result });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch orders" },
      });
    }
  });

  /**
   * GET /admin/restaurant/menu
   */
  fastify.get("/menu", async (request, reply) => {
    const { restaurant_id: restaurantId } = request.params as {
      restaurant_id: string;
    };

    try {
      const result = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.restaurantId, restaurantId))
        .orderBy(asc(menuItems.displayOrder));

      return reply.send({ success: true, data: result });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch menu" },
      });
    }
  });

  /**
   * POST /admin/restaurant/menu/items
   */
  fastify.post("/menu/items", async (request, reply) => {
    const { restaurant_id: restaurantId } = request.params as {
      restaurant_id: string;
    };
    const user = request.user!;

    const validation = MenuBodySchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input validation failed",
          details: validation.error.issues.map((e) => ({
            field: e.path.join("."),
            issue: e.message,
          })),
        },
      });
    }

    const {
      name,
      description,
      price,
      category,
      imageUrl,
      isAvailable,
      modifiers,
      foodCostPercent,
    } = validation.data;

    try {
      const maxOrderResult = await db
        .select({ displayOrder: menuItems.displayOrder })
        .from(menuItems)
        .where(eq(menuItems.restaurantId, restaurantId))
        .orderBy(desc(menuItems.displayOrder))
        .limit(1);

      const nextOrder = (maxOrderResult[0]?.displayOrder || 0) + 1;

      const result = await db
        .insert(menuItems)
        .values({
          restaurantId: restaurantId,
          name,
          description,
          price, // Now an integer in cents
          category,
          imageUrl,
          isAvailable: isAvailable ?? true,
          modifiers: modifiers ?? [],
          foodCostPercent: foodCostPercent?.toString(),
          displayOrder: nextOrder,
        })
        .returning();

      const newItem = result[0];

      await writeAuditLog({
        adminId: user.id,
        action: "CREATE_MENU_ITEM",
        targetType: "menu_item",
        targetId: newItem.id,
        payload: { name: newItem.name },
        ipAddress: request.ip,
      });

      return reply.status(201).send({ success: true, data: newItem });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create menu item",
        },
      });
    }
  });

  /**
   * PUT /admin/restaurant/menu/items/:id
   */
  fastify.put("/menu/items/:id", async (request, reply) => {
    const { restaurant_id: restaurantId } = request.params as {
      restaurant_id: string;
    };
    const user = request.user!;
    const { id } = request.params as { id: string };

    const validation = UpdateMenuBodySchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input validation failed",
          details: validation.error.issues.map((e) => ({
            field: e.path.join("."),
            issue: e.message,
          })),
        },
      });
    }

    const updates = validation.data;

    try {
      const existingResult = await db
        .select({ restaurantId: menuItems.restaurantId })
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1);

      const existing = existingResult[0];

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Menu item not found" },
        });
      }

      if (existing.restaurantId !== restaurantId) {
        request.log.warn(
          { userId: user.uid, restaurantId, targetId: id },
          "Security event: Forbidden menu item update attempt",
        );
        return reply.status(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Item does not belong to your restaurant",
          },
        });
      }

      const allowedUpdates: Record<string, any> = {};
      if (updates.name !== undefined) allowedUpdates.name = updates.name;
      if (updates.description !== undefined)
        allowedUpdates.description = updates.description;
      if (updates.price !== undefined) allowedUpdates.price = updates.price;
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
      if (updates.food_cost_percent !== undefined)
        allowedUpdates.foodCostPercent = String(updates.food_cost_percent);
      allowedUpdates.updatedAt = new Date();

      const result = await db
        .update(menuItems)
        .set(allowedUpdates)
        .where(eq(menuItems.id, id))
        .returning();

      const updatedItem = result[0];

      await writeAuditLog({
        adminId: user.id,
        action: "UPDATE_MENU_ITEM",
        targetType: "menu_item",
        targetId: id,
        payload: updates,
        ipAddress: request.ip,
      });

      return reply.send({ success: true, data: updatedItem });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update menu item",
        },
      });
    }
  });

  /**
   * DELETE /admin/restaurant/menu/items/:id
   */
  fastify.delete("/menu/items/:id", async (request, reply) => {
    const { restaurant_id: restaurantId } = request.params as {
      restaurant_id: string;
    };
    const user = request.user!;
    const { id } = request.params as { id: string };

    try {
      const existingResult = await db
        .select({ restaurantId: menuItems.restaurantId })
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1);

      const existing = existingResult[0];

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Menu item not found" },
        });
      }

      if (existing.restaurantId !== restaurantId) {
        request.log.warn(
          { userId: user.uid, restaurantId, targetId: id },
          "Security event: Forbidden menu item delete attempt",
        );
        return reply.status(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Item does not belong to your restaurant",
          },
        });
      }

      await db
        .update(menuItems)
        .set({ isAvailable: false, updatedAt: new Date() })
        .where(eq(menuItems.id, id));

      await writeAuditLog({
        adminId: user.id,
        action: "DELETE_MENU_ITEM",
        targetType: "menu_item",
        targetId: id,
        ipAddress: request.ip,
      });

      return reply.send({ success: true, data: { status: "soft-deleted" } });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to delete menu item",
        },
      });
    }
  });

  /**
   * GET /admin/restaurant/analytics
   */
  fastify.get<{ Querystring: { period?: "daily" | "weekly" | "monthly" } }>(
    "/analytics",
    async (request, reply) => {
      const { restaurant_id: restaurantId } = request.params as {
        restaurant_id: string;
      };
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
        rangeStart = new Date(now);
      }

      const rangeStartStr = rangeStart.toISOString().split("T")[0];

      try {
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

        return reply.send({ success: true, data: result || [] });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch analytics",
          },
        });
      }
    },
  );
}
