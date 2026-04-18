import { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyAuth } from "../../middleware/auth.js";
import { supabase } from "../../lib/supabase.js";
import { db, orders, menuItems, analyticsSnapshots } from "@shoplift/db";
import { eq, and, asc, desc, inArray, gte } from "drizzle-orm";
import { writeAuditLog } from "../../lib/audit.js";
import crypto from "crypto";

const ImageValueSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (value) => {
      if (!value) return true;
      if (value.startsWith("blob:") || value.startsWith("data:")) {
        return false;
      }

      try {
        const parsed = new URL(value);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          return true;
        }
      } catch {
        // Not an absolute URL; allow safe storage-relative paths
      }

      return /^[a-zA-Z0-9/_\-.]+$/.test(value);
    },
    { message: "Invalid input" },
  );

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
    imageUrl: ImageValueSchema,
    image_url: ImageValueSchema,
    isAvailable: z.boolean().optional(),
    is_available: z.boolean().optional(),
    modifiers: z.array(z.any()).optional(), // TODO: stricter modifier schema later
    foodCostPercent: z.number().min(0).max(100).optional(),
    food_cost_percent: z.number().min(0).max(100).optional(),
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
    isAvailable: z.boolean().optional(),
    is_available: z.boolean().optional(),
    modifiers: z.array(z.any()).optional(),
    imageUrl: ImageValueSchema,
    image_url: ImageValueSchema,
    displayOrder: z.number().int().optional(),
    display_order: z.number().int().optional(),
    foodCostPercent: z.number().min(0).max(100).optional(),
    food_cost_percent: z.number().min(0).max(100).optional(),
  })
  .strict();

const UploadMenuImageSchema = z
  .object({
    imageDataUrl: z.string().min(1),
  })
  .strict();

export default async function restaurantAdminRoutes(fastify: FastifyInstance) {
  // All routes in this plugin require restaurant admin access and ownership verification
  fastify.addHook("preHandler", async (request, reply) => {
    await verifyAuth(request, reply);
  });

  /**
   * GET /admin/restaurant/orders
   */
  fastify.get("/orders", async (request, reply) => {
    const restaurantId = request.user!.restaurantId;

    if (!restaurantId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "User not associated with a restaurant",
        },
      });
    }

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
    const restaurantId = request.user!.restaurantId;

    if (!restaurantId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "User not associated with a restaurant",
        },
      });
    }

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
    const restaurantId = request.user!.restaurantId;
    const user = request.user!;

    if (!restaurantId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "User not associated with a restaurant",
        },
      });
    }

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
      image_url,
      isAvailable,
      is_available,
      modifiers,
      foodCostPercent,
      food_cost_percent,
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
          imageUrl: imageUrl ?? image_url,
          isAvailable: isAvailable ?? is_available ?? true,
          modifiers: modifiers ?? [],
          foodCostPercent: (foodCostPercent ?? food_cost_percent)?.toString(),
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
   * POST /admin/restaurant/menu/upload-image
   */
  fastify.post("/menu/upload-image", async (request, reply) => {
    const user = request.user!;

    if (
      !user.role ||
      !["restaurant_admin", "super_admin"].includes(user.role)
    ) {
      return reply.status(403).send({
        success: false,
        error: { code: "FORBIDDEN", message: "Not authorized" },
      });
    }

    const validation = UploadMenuImageSchema.safeParse(request.body);
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

    const { imageDataUrl } = validation.data;
    const match = imageDataUrl.match(
      /^data:(image\/(png|jpeg|webp));base64,(.+)$/i,
    );

    if (!match) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid image payload",
        },
      });
    }

    const mimeType = match[1].toLowerCase();
    const base64 = match[3];
    const imageBuffer = Buffer.from(base64, "base64");
    const extension =
      mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
    const fileName = `menu_${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("menu-images")
      .upload(fileName, imageBuffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      request.log.error(uploadError);
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to upload image",
        },
      });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("menu-images").getPublicUrl(fileName);

    return reply.send({
      success: true,
      data: { url: publicUrl, path: fileName },
    });
  });

  /**
   * PUT /admin/restaurant/menu/items/:id
   */
  fastify.put("/menu/items/:id", async (request, reply) => {
    const restaurantId = request.user!.restaurantId;
    const user = request.user!;
    const { id } = request.params as { id: string };

    if (!restaurantId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "User not associated with a restaurant",
        },
      });
    }

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
        .select({
          restaurantId: menuItems.restaurantId,
          imageUrl: menuItems.imageUrl,
        })
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
      if (updates.isAvailable !== undefined)
        allowedUpdates.isAvailable = updates.isAvailable;
      if (updates.is_available !== undefined)
        allowedUpdates.isAvailable = updates.is_available;
      if (updates.modifiers !== undefined)
        allowedUpdates.modifiers = updates.modifiers;
      if (updates.imageUrl !== undefined)
        allowedUpdates.imageUrl = updates.imageUrl;
      if (updates.image_url !== undefined)
        allowedUpdates.imageUrl = updates.image_url;
      if (updates.displayOrder !== undefined)
        allowedUpdates.displayOrder = updates.displayOrder;
      if (updates.display_order !== undefined)
        allowedUpdates.displayOrder = updates.display_order;
      if (updates.foodCostPercent !== undefined)
        allowedUpdates.foodCostPercent = String(updates.foodCostPercent);
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
    const restaurantId = request.user!.restaurantId;
    const user = request.user!;
    const { id } = request.params as { id: string };

    if (!restaurantId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "User not associated with a restaurant",
        },
      });
    }

    try {
      const existingResult = await db
        .select({
          restaurantId: menuItems.restaurantId,
          imageUrl: menuItems.imageUrl,
        })
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

      // Best-effort storage cleanup for menu-images public URLs
      if (existing.imageUrl) {
        try {
          const marker = "/storage/v1/object/public/menu-images/";
          const markerIndex = existing.imageUrl.indexOf(marker);
          if (markerIndex >= 0) {
            const objectPath = decodeURIComponent(
              existing.imageUrl.slice(markerIndex + marker.length),
            );
            if (objectPath) {
              await supabase.storage.from("menu-images").remove([objectPath]);
            }
          }
        } catch {
          // Ignore storage cleanup failures; DB deletion remains the source of truth.
        }
      }

      await db.delete(menuItems).where(eq(menuItems.id, id));

      await writeAuditLog({
        adminId: user.id,
        action: "DELETE_MENU_ITEM",
        targetType: "menu_item",
        targetId: id,
        ipAddress: request.ip,
      });

      return reply.send({ success: true, data: { status: "deleted" } });
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
      const restaurantId = request.user!.restaurantId;

      if (!restaurantId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "User not associated with a restaurant",
          },
        });
      }
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
