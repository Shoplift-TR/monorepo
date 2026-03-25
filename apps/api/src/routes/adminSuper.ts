import { FastifyInstance, FastifyRequest } from "fastify";
import { supabase } from "../lib/supabase.js";
import { verifyAuth, requireSuperAdmin } from "../middleware/auth.js";
import {
  ApiResponse,
  AdminOverviewResponse,
  OnboardRestaurantBody,
  RefundBody,
  Order as OrderType,
} from "@shoplift/types";
import {
  db,
  restaurants,
  orders,
  profiles,
  auditLogs,
  menuItems,
  adminProfiles,
} from "@shoplift/db";
import { eq, and, desc, count, sum, sql } from "drizzle-orm";

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
  // GET /admin/super/overview
  fastify.get<{ Querystring: { limit?: string; sort?: string } }>(
    "/overview",
    { preHandler: [verifyAuth, requireSuperAdmin] },
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

        const response: ApiResponse<AdminOverviewResponse> = {
          success: true,
          data: {
            active_restaurants: activeCountRes[0]?.value || 0,
            total_delivered_orders: deliveredCountRes[0]?.value || 0,
            platform_gmv: platformGMV,
            recent_orders: sortRecent ? (recentOrders as any) : undefined,
          },
          error: null,
        };
        return reply.send(response);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message || "Failed to fetch overview metrics",
        });
      }
    },
  );

  // POST /admin/super/restaurants
  fastify.post<{ Body: OnboardRestaurantBody }>(
    "/restaurants",
    { preHandler: [verifyAuth, requireSuperAdmin] },
    async (request: any, reply) => {
      const {
        name,
        description,
        owner_email,
        cuisine_tags,
        commission_rate,
        maintenance_fee,
        operating_hours,
        location,
        address,
        delivery_fee,
      } = request.body;

      if (commission_rate < 0 || commission_rate > 1) {
        return reply.status(400).send({
          success: false,
          data: null,
          error: "commission_rate must be between 0 and 1",
        });
      }
      if (maintenance_fee < 0) {
        return reply.status(400).send({
          success: false,
          data: null,
          error: "maintenance_fee must be >= 0",
        });
      }

      try {
        // 2. Look up owner
        const ownerResult = await db
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.email, owner_email))
          .limit(1);

        const owner = ownerResult[0];

        if (!owner) {
          return reply.status(404).send({
            success: false,
            data: null,
            error: "Owner profile not found",
          });
        }

        // 3. Insert restaurant
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
            deliveryFee: (request.body.delivery_fee ?? 0).toString(),
            isActive: true,
            rating: "0",
            totalOrders: 0,
            totalRatings: 0,
            healthScore: 100,
            averageDeliveryMinutes: 30,
          })
          .returning();

        const restaurant = restaurantResult[0];

        // 4. Update owner role
        await db
          .update(profiles)
          .set({
            role: "restaurant_admin",
            restaurantId: restaurant.id,
          })
          .where(eq(profiles.id, owner.id));

        // Update admin_profiles if the user exists there
        await db
          .update(adminProfiles)
          .set({ restaurantId: restaurant.id })
          .where(eq(adminProfiles.email, owner_email));

        const response: ApiResponse<any> = {
          success: true,
          data: restaurant,
          error: null,
        };
        return reply.status(201).send(response);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message || "Failed to onboard restaurant",
        });
      }
    },
  );

  // GET /admin/super/restaurants
  fastify.get(
    "/restaurants",
    { preHandler: [verifyAuth, requireSuperAdmin] },
    async (_request, reply) => {
      try {
        // 1. Fetch all restaurants
        const allRestaurants = await db.select().from(restaurants);

        // 2. Fetch all order counts
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

        const response: ApiResponse<any[]> = {
          success: true,
          data: result,
          error: null,
        };
        return reply.send(response);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message || "Failed to fetch restaurants",
        });
      }
    },
  );

  // PUT /admin/super/restaurants/:id
  fastify.put<{ Params: { id: string }; Body: any }>(
    "/restaurants/:id",
    { preHandler: [verifyAuth, requireSuperAdmin] },
    async (request: any, reply) => {
      const { id } = request.params;
      const body = request.body as any;

      if (body.commission_rate !== undefined) {
        if (body.commission_rate < 0 || body.commission_rate > 1) {
          return reply.status(400).send({
            success: false,
            data: null,
            error: "commission_rate must be 0-1",
          });
        }
      }

      if (body.maintenance_fee !== undefined && body.maintenance_fee < 0) {
        return reply.status(400).send({
          success: false,
          data: null,
          error: "maintenance_fee must be >= 0",
        });
      }

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

        if (body.slug !== undefined)
          updateObj.slug = body.slug
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        if (body.delivery_fee !== undefined)
          updateObj.deliveryFee = body.delivery_fee.toString();
        if (body.logo !== undefined) updateObj.logo = body.logo;
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

        const data = result[0];

        if (body.restaurant_admin_email) {
          await db
            .update(profiles)
            .set({ restaurantId: id, role: "restaurant_admin" })
            .where(eq(profiles.email, body.restaurant_admin_email));

          await db
            .update(adminProfiles)
            .set({ restaurantId: id })
            .where(eq(adminProfiles.email, body.restaurant_admin_email));
        }

        if (!data) {
          return reply.status(404).send({
            success: false,
            data: null,
            error: "Restaurant not found",
          });
        }

        const response: ApiResponse<any> = {
          success: true,
          data,
          error: null,
        };
        return reply.send(response);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message || "Failed to update restaurant",
        });
      }
    },
  );

  // GET /admin/super/users/:id
  fastify.get<{ Params: { id: string } }>(
    "/users/:id",
    { preHandler: [verifyAuth, requireSuperAdmin] },
    async (request: any, reply) => {
      const { id } = request.params;

      try {
        const [profileResult, authResult] = await Promise.all([
          db.select().from(profiles).where(eq(profiles.id, id)).limit(1),
          supabase.auth.admin.getUserById(id),
        ]);

        const profile = profileResult[0];

        if (!profile) {
          return reply.status(404).send({
            success: false,
            data: null,
            error: "User profile not found",
          });
        }

        const authUser = authResult.data.user;
        if (!authUser) {
          return reply.status(404).send({
            success: false,
            data: null,
            error: "Auth user not found",
          });
        }

        const merged = {
          ...profile,
          auth: {
            email: authUser.email,
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at,
            app_metadata: authUser.app_metadata,
            user_metadata: authUser.user_metadata,
          },
        };

        const response: ApiResponse<any> = {
          success: true,
          data: merged,
          error: null,
        };
        return reply.send(response);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message || "Failed to fetch user",
        });
      }
    },
  );

  // POST /admin/super/refunds
  fastify.post<{ Body: RefundBody }>(
    "/refunds",
    { preHandler: [verifyAuth, requireSuperAdmin] },
    async (request: any, reply) => {
      const { order_id, reason } = request.body;

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
            data: null,
            error: "Order not found",
          });
        }

        if (order.refundStatus === "issued") {
          return reply.status(409).send({
            success: false,
            data: null,
            error: "Refund already issued for this order",
          });
        }

        await db
          .update(orders)
          .set({
            refundStatus: "issued",
            refundReason: reason,
            refundedAt: new Date(),
          })
          .where(eq(orders.id, order_id));

        const response: ApiResponse<any> = {
          success: true,
          data: { success: true, orderId: order_id },
          error: null,
        };
        return reply.send(response);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message || "Failed to issue refund",
        });
      }
    },
  );

  // GET /admin/super/audit
  fastify.get<{
    Querystring: {
      action?: string;
      admin_id?: string;
      page?: string;
      limit?: string;
    };
  }>(
    "/audit",
    { preHandler: [verifyAuth, requireSuperAdmin] },
    async (request: any, reply) => {
      const { action, admin_id, page = "1", limit = "50" } = request.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      try {
        const logs = await db
          .select()
          .from(auditLogs)
          .where(
            and(
              action ? eq(auditLogs.action, action) : undefined,
              admin_id ? eq(auditLogs.adminId, admin_id) : undefined,
            ),
          )
          .orderBy(desc(auditLogs.createdAt))
          .limit(limitNum)
          .offset(offset);

        const totalRes = await db
          .select({ value: count() })
          .from(auditLogs)
          .where(
            and(
              action ? eq(auditLogs.action, action) : undefined,
              admin_id ? eq(auditLogs.adminId, admin_id) : undefined,
            ),
          );

        const total = totalRes[0]?.value || 0;

        return reply.send({
          success: true,
          data: { logs, total, page: pageNum, limit: limitNum },
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message || "Failed to fetch audit logs",
        });
      }
    },
  );

  // GET /admin/super/inventory
  fastify.get(
    "/inventory",
    { preHandler: [verifyAuth, requireSuperAdmin] },
    async (request: any, reply) => {
      try {
        const allRestaurants = await db
          .select({ id: restaurants.id, name: restaurants.name })
          .from(restaurants);

        const allItems = await db
          .select({
            id: menuItems.id,
            restaurantId: menuItems.restaurantId,
            name: menuItems.name,
            isAvailable: menuItems.isAvailable,
          })
          .from(menuItems);

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
          data: null,
          error: error.message || "Failed to fetch inventory",
        });
      }
    },
  );
}
