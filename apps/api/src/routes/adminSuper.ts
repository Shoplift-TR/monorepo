import { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { verifyAuth, requireSuperAdmin } from "../middleware/auth.js";
import { writeAuditLog } from "../lib/audit.js";
import {
  db,
  restaurants,
  orders,
  profiles,
  auditLogs,
  menuItems,
  adminProfiles,
} from "@shoplift/db";
import { eq, and, desc, count, sum } from "drizzle-orm";

// Zod Schemas
const OnboardRestaurantSchema = z
  .object({
    name: z.object({
      tr: z.string().min(1),
      en: z.string().min(1),
    }),
    description: z.object({
      tr: z.string().optional(),
      en: z.string().optional(),
    }),
    owner_email: z.string().email(),
    cuisine_tags: z.array(z.string()),
    commission_rate: z.number().min(0).max(1),
    maintenance_fee: z.number().min(0),
    delivery_fee: z.number().min(0).optional(),
    address: z.string().optional(),
    operating_hours: z.any().optional(),
  })
  .strict();

const UpdateRestaurantSchema = z
  .object({
    name: z.object({ tr: z.string(), en: z.string() }).optional(),
    description: z.object({ tr: z.string(), en: z.string() }).optional(),
    commission_rate: z.number().min(0).max(1).optional(),
    maintenance_fee: z.number().min(0).optional(),
    delivery_fee: z.number().min(0).optional(),
    is_active: z.boolean().optional(),
    slug: z.string().optional(),
    logo_url: z.string().url().optional(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    average_delivery_minutes: z.number().int().optional(),
    cuisine_tags: z.array(z.string()).optional(),
    restaurant_admin_email: z.string().email().optional(),
  })
  .strict();

const RefundSchema = z
  .object({
    order_id: z.string().uuid(),
    reason: z.string().min(1),
  })
  .strict();

const DisableUserSchema = z
  .object({
    reason: z.string().optional(),
  })
  .strict();

function generateSlug(name: any): string {
  const str =
    typeof name === "object" ? name.en || name.tr || "" : String(name);
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function adminSuperRoutes(fastify: FastifyInstance) {
  // Global middleware for this plugin
  fastify.addHook("preHandler", async (request, reply) => {
    await verifyAuth(request, reply);
    if (!reply.sent) {
      await requireSuperAdmin(request, reply);
    }
  });

  /**
   * GET /admin/super/overview
   */
  fastify.get<{ Querystring: { limit?: string; sort?: string } }>(
    "/overview",
    async (request: any, reply) => {
      try {
        const limitNum = Number(request.query.limit) || 10;
        const sortRecent = request.query.sort === "recent";

        const [activeCountRes, deliveredCountRes, gmvRes, recentOrders] =
          await Promise.all([
            db
              .select({ value: count() })
              .from(restaurants)
              .where(eq(restaurants.isActive, true)),
            db
              .select({ value: count() })
              .from(orders)
              .where(eq(orders.status, "DELIVERED")),
            db
              .select({ value: sum(orders.total) })
              .from(orders)
              .where(eq(orders.status, "DELIVERED")),
            sortRecent
              ? db
                  .select()
                  .from(orders)
                  .orderBy(desc(orders.createdAt))
                  .limit(limitNum)
              : Promise.resolve([]),
          ]);

        const platformGMV = Number(gmvRes[0]?.value || 0);

        return reply.send({
          success: true,
          data: {
            active_restaurants: activeCountRes[0]?.value || 0,
            total_delivered_orders: deliveredCountRes[0]?.value || 0,
            platform_gmv: platformGMV,
            recent_orders: sortRecent ? (recentOrders as any) : undefined,
          },
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch overview metrics",
          },
        });
      }
    },
  );

  /**
   * POST /admin/super/restaurants
   */
  fastify.post("/restaurants", async (request, reply) => {
    const user = request.user!;
    const validation = OnboardRestaurantSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid restaurant data",
          details: validation.error.flatten(),
        },
      });
    }

    const {
      name,
      description,
      owner_email,
      cuisine_tags,
      commission_rate,
      maintenance_fee,
      operating_hours,
      address,
      delivery_fee,
    } = validation.data;

    try {
      const ownerResult = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.email, owner_email))
        .limit(1);

      const owner = ownerResult[0];
      if (!owner) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Owner profile not found" },
        });
      }

      const restaurantResult = await db
        .insert(restaurants)
        .values({
          name,
          description,
          ownerId: owner.id,
          cuisineTags: cuisine_tags,
          commissionRate: commission_rate.toString(),
          maintenanceFee: maintenance_fee.toString(),
          operatingHours: operating_hours,
          address,
          slug: generateSlug(name),
          deliveryFee: (delivery_fee ?? 0).toString(),
          isActive: true,
          rating: "0",
          totalOrders: 0,
          totalRatings: 0,
          healthScore: 100,
          averageDeliveryMinutes: 30,
        })
        .returning();

      const restaurant = restaurantResult[0];

      await Promise.all([
        db
          .update(profiles)
          .set({ role: "restaurant_admin", restaurantId: restaurant.id })
          .where(eq(profiles.id, owner.id)),
        db
          .update(adminProfiles)
          .set({ restaurantId: restaurant.id })
          .where(eq(adminProfiles.email, owner_email)),
      ]);

      await writeAuditLog({
        adminId: user.id,
        action: "ONBOARD_RESTAURANT",
        targetType: "restaurant",
        targetId: restaurant.id,
        payload: { name: restaurant.name, owner_email },
        ipAddress: request.ip,
      });

      return reply.status(201).send({ success: true, data: restaurant });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to onboard restaurant",
        },
      });
    }
  });

  /**
   * GET /admin/super/restaurants
   */
  fastify.get("/restaurants", async (_request, reply) => {
    try {
      const allRestaurants = await db.select().from(restaurants);
      const orderCountsRes = await db
        .select({
          restaurantId: orders.restaurantId,
          count: count(),
        })
        .from(orders)
        .groupBy(orders.restaurantId);

      const countMap: Record<string, number> = {};
      orderCountsRes.forEach((c) => {
        countMap[c.restaurantId] = c.count;
      });

      const result = allRestaurants.map((r) => ({
        ...r,
        order_count: countMap[r.id] || 0,
      }));

      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch restaurants",
        },
      });
    }
  });

  /**
   * PUT /admin/super/restaurants/:id
   */
  fastify.put<{ Params: { id: string } }>(
    "/restaurants/:id",
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user!;

      const validation = UpdateRestaurantSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid update data",
            details: validation.error.flatten(),
          },
        });
      }

      const body = validation.data;

      try {
        const updateObj: any = {};
        if (body.commission_rate !== undefined)
          updateObj.commissionRate = body.commission_rate.toString();
        if (body.maintenance_fee !== undefined)
          updateObj.maintenanceFee = body.maintenance_fee.toString();
        if (body.is_active !== undefined) updateObj.isActive = body.is_active;
        if (body.name !== undefined) updateObj.name = body.name;
        if (body.description !== undefined)
          updateObj.description = body.description;
        if (body.slug !== undefined) updateObj.slug = body.slug;
        if (body.delivery_fee !== undefined)
          updateObj.deliveryFee = body.delivery_fee.toString();
        if (body.logo_url !== undefined) updateObj.logo = body.logo_url;
        if (body.address !== undefined) updateObj.address = body.address;
        if (body.lat !== undefined) updateObj.lat = body.lat.toString();
        if (body.lng !== undefined) updateObj.lng = body.lng.toString();
        if (body.average_delivery_minutes !== undefined)
          updateObj.averageDeliveryMinutes = body.average_delivery_minutes;
        if (body.cuisine_tags !== undefined)
          updateObj.cuisineTags = body.cuisine_tags;

        updateObj.updatedAt = new Date();

        const result = await db
          .update(restaurants)
          .set(updateObj)
          .where(eq(restaurants.id, id))
          .returning();

        const updated = result[0];
        if (!updated) {
          return reply.status(404).send({
            success: false,
            error: { code: "NOT_FOUND", message: "Restaurant not found" },
          });
        }

        if (body.restaurant_admin_email) {
          await Promise.all([
            db
              .update(profiles)
              .set({ restaurantId: id, role: "restaurant_admin" })
              .where(eq(profiles.email, body.restaurant_admin_email)),
            db
              .update(adminProfiles)
              .set({ restaurantId: id })
              .where(eq(adminProfiles.email, body.restaurant_admin_email)),
          ]);
        }

        await writeAuditLog({
          adminId: user.id,
          action: "UPDATE_RESTAURANT",
          targetType: "restaurant",
          targetId: id,
          payload: body,
          ipAddress: request.ip,
        });

        return reply.send({ success: true, data: updated });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to update restaurant",
          },
        });
      }
    },
  );

  /**
   * POST /admin/super/refunds
   */
  fastify.post("/refunds", async (request, reply) => {
    const user = request.user!;
    const validation = RefundSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid refund data",
          details: validation.error.flatten(),
        },
      });
    }

    const { order_id, reason } = validation.data;

    try {
      const orderResult = await db
        .select()
        .from(orders)
        .where(eq(orders.id, order_id))
        .limit(1);
      const order = orderResult[0];

      if (!order) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Order not found" },
        });
      }

      if (order.refundStatus === "issued") {
        return reply.status(409).send({
          success: false,
          error: { code: "CONFLICT", message: "Refund already issued" },
        });
      }

      await db
        .update(orders)
        .set({
          refundStatus: "issued",
          refundReason: reason,
          refundedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order_id));

      await writeAuditLog({
        adminId: user.id,
        action: "ISSUE_REFUND",
        targetType: "order",
        targetId: order_id,
        payload: { reason },
        ipAddress: request.ip,
      });

      return reply.send({ success: true, data: { orderId: order_id } });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to issue refund" },
      });
    }
  });

  /**
   * GET /admin/super/audit
   */
  fastify.get<{
    Querystring: {
      action?: string;
      admin_id?: string;
      page?: string;
      limit?: string;
    };
  }>("/audit", async (request, reply) => {
    const { action, admin_id, page = "1", limit = "50" } = request.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * limitNum;

    try {
      const filters = [];
      if (action) filters.push(eq(auditLogs.action, action));
      if (admin_id) filters.push(eq(auditLogs.adminId, admin_id));

      const logs = await db
        .select()
        .from(auditLogs)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limitNum)
        .offset(offset);

      const totalRes = await db
        .select({ value: count() })
        .from(auditLogs)
        .where(filters.length > 0 ? and(...filters) : undefined);

      return reply.send({
        success: true,
        data: {
          logs,
          total: totalRes[0]?.value || 0,
          page: pageNum,
          limit: limitNum,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch audit logs",
        },
      });
    }
  });

  /**
   * GET /admin/super/inventory
   */
  fastify.get("/inventory", async (request, reply) => {
    try {
      const [allRestaurants, allItems] = await Promise.all([
        db
          .select({ id: restaurants.id, name: restaurants.name })
          .from(restaurants),
        db
          .select({
            id: menuItems.id,
            restaurantId: menuItems.restaurantId,
            name: menuItems.name,
            isAvailable: menuItems.isAvailable,
          })
          .from(menuItems),
      ]);

      const result = allRestaurants.map((r) => {
        const rItems = allItems.filter((i) => i.restaurantId === r.id);
        const outOfStock = rItems.filter((i) => !i.isAvailable);
        return {
          restaurant_id: r.id,
          name: r.name,
          total_items: rItems.length,
          available_items: rItems.length - outOfStock.length,
          out_of_stock_items: outOfStock.length,
          items: rItems,
        };
      });

      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch inventory" },
      });
    }
  });
  /**
   * PATCH /admin/super/users/:id/disable
   */
  fastify.patch<{ Params: { id: string } }>(
    "/users/:id/disable",
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user!;
      const validation = DisableUserSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Input validation failed",
            details: validation.error.issues.map((e: z.ZodIssue) => ({
              field: e.path.join("."),
              issue: e.message,
            })),
          },
        });
      }

      try {
        const result = await db
          .update(profiles)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(profiles.id, id))
          .returning();

        const disabledUser = result[0];
        if (!disabledUser) {
          return reply.status(404).send({
            success: false,
            error: { code: "NOT_FOUND", message: "User profile not found" },
          });
        }

        await writeAuditLog({
          adminId: user.id,
          action: "DISABLE_USER",
          targetType: "user",
          targetId: id,
          payload: { reason: validation.data.reason },
          ipAddress: request.ip,
        });

        return reply.send({
          success: true,
          data: {
            user_id: id,
            is_active: false,
          },
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Failed to disable user" },
        });
      }
    },
  );
}
