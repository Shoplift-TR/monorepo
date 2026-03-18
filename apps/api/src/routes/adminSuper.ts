import { FastifyInstance, FastifyRequest } from "fastify";
import { supabase } from "../lib/supabase.js";
import { verifyAuth, requireSuperAdmin } from "../middleware/auth.js";
import {
  ApiResponse,
  AdminOverviewResponse,
  OnboardRestaurantBody,
  RefundBody,
  Order,
} from "@shoplift/types";

export default async function adminSuperRoutes(fastify: FastifyInstance) {
  // GET /admin/super/overview
  fastify.get<{ Querystring: { limit?: string; sort?: string } }>(
    "/overview",
    { preHandler: [verifyAuth, requireSuperAdmin] },
    async (request: any, reply) => {
      try {
        const limit = Number(request.query.limit) || 10;
        const sortRecent = request.query.sort === "recent";

        const queries: any[] = [
          supabase
            .from("restaurants")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true),
          supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("status", "DELIVERED"),
          supabase.from("orders").select("total").eq("status", "DELIVERED"),
        ];

        if (sortRecent) {
          queries.push(
            supabase
              .from("orders")
              .select(
                "id, restaurantName:restaurant_name, customerName:customer_name, total, status, createdAt:created_at",
              )
              .order("created_at", { ascending: false })
              .limit(limit),
          );
        }

        const results = await Promise.all(queries);
        const [
          activeRestaurantsResult,
          deliveredOrdersResult,
          gmvResult,
          recentOrdersResult,
        ] = results;

        if (activeRestaurantsResult.error) throw activeRestaurantsResult.error;
        if (deliveredOrdersResult.error) throw deliveredOrdersResult.error;
        if (gmvResult.error) throw gmvResult.error;
        if (sortRecent && recentOrdersResult?.error)
          throw recentOrdersResult.error;

        const platformGMV = (gmvResult.data || []).reduce(
          (acc: number, curr: any) => acc + (Number(curr.total) || 0),
          0,
        );

        const response: ApiResponse<AdminOverviewResponse> = {
          success: true,
          data: {
            active_restaurants: activeRestaurantsResult.count || 0,
            total_delivered_orders: deliveredOrdersResult.count || 0,
            platform_gmv: platformGMV,
            recent_orders: sortRecent
              ? (recentOrdersResult.data as Order[])
              : undefined,
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

      // 2. Look up owner
      const { data: owner, error: ownerError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", owner_email)
        .single();

      if (ownerError || !owner) {
        return reply.status(404).send({
          success: false,
          data: null,
          error: "Owner profile not found",
        });
      }

      // 3. Insert restaurant
      const { data: restaurant, error: restaurantError } = await supabase
        .from("restaurants")
        .insert({
          name,
          description,
          owner_id: owner.id,
          cuisine_tags: cuisine_tags,
          commission_rate,
          maintenance_fee,
          operating_hours,
          location: `POINT(${location.lng} ${location.lat})`,
          address,
          is_active: true,
          rating: 0,
          total_orders: 0,
          total_ratings: 0,
          health_score: 100,
          average_delivery_minutes: 30,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (restaurantError) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: restaurantError.message,
        });
      }

      // 4. Update owner role
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          role: "restaurant_admin",
          restaurant_id: restaurant.id,
        })
        .eq("id", owner.id);

      if (profileError) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: profileError.message,
        });
      }

      const response: ApiResponse<any> = {
        success: true,
        data: restaurant,
        error: null,
      };
      return reply.status(201).send(response);
    },
  );

  // GET /admin/super/restaurants
  fastify.get(
    "/restaurants",
    { preHandler: [verifyAuth, requireSuperAdmin] },
    async (_request, reply) => {
      // 1. Fetch all restaurants
      const { data: restaurants, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*");

      if (restaurantError) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: restaurantError.message,
        });
      }

      // 2. Fetch all order restaurant_ids to aggregate
      // TODO: This will become slow as orders grow. Consider using a Supabase RPC with COUNT/GROUP BY
      // or a separate stats counter table for each restaurant.
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("restaurant_id");

      if (ordersError) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: ordersError.message,
        });
      }

      const orderCounts = orders.reduce(
        (acc: Record<string, number>, order: any) => {
          const rid = order.restaurant_id;
          acc[rid] = (acc[rid] || 0) + 1;
          return acc;
        },
        {},
      );

      const result = restaurants.map((r: any) => {
        const row = r as Record<string, any>;
        return {
          ...row,
          order_count: orderCounts[row.id] || 0,
        };
      });

      const response: ApiResponse<any[]> = {
        success: true,
        data: result,
        error: null,
      };
      return reply.send(response);
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

      const updateObj: any = {};
      if (body.commission_rate !== undefined)
        updateObj.commission_rate = body.commission_rate;
      if (body.maintenance_fee !== undefined)
        updateObj.maintenance_fee = body.maintenance_fee;
      if (body.is_active !== undefined) updateObj.is_active = body.is_active;
      if (body.name !== undefined) updateObj.name = body.name;
      if (body.description !== undefined)
        updateObj.description = body.description;

      const { data, error } = await supabase
        .from("restaurants")
        .update(updateObj)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return reply.status(404).send({
            success: false,
            data: null,
            error: "Restaurant not found",
          });
        }
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message,
        });
      }

      const response: ApiResponse<any> = {
        success: true,
        data,
        error: null,
      };
      return reply.send(response);
    },
  );

  // GET /admin/super/users/:id
  fastify.get<{ Params: { id: string } }>(
    "/users/:id",
    { preHandler: [verifyAuth, requireSuperAdmin] },
    async (request: any, reply) => {
      const { id } = request.params;

      const [profileResult, authResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.auth.admin.getUserById(id),
      ]);

      if (profileResult.error || !profileResult.data) {
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
        ...profileResult.data,
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
    },
  );

  // POST /admin/super/refunds
  fastify.post<{ Body: RefundBody }>(
    "/refunds",
    { preHandler: [verifyAuth, requireSuperAdmin] },
    async (request: any, reply) => {
      const { order_id, reason } = request.body;

      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .single();

      if (fetchError || !order) {
        return reply.status(404).send({
          success: false,
          data: null,
          error: "Order not found",
        });
      }

      if (order.refund_status === "issued") {
        return reply.status(409).send({
          success: false,
          data: null,
          error: "Refund already issued for this order",
        });
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          refund_status: "issued",
          refund_reason: reason,
          refunded_at: new Date().toISOString(),
        })
        .eq("id", order_id);

      if (updateError) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: updateError.message,
        });
      }

      const response: ApiResponse<any> = {
        success: true,
        data: { success: true, orderId: order_id },
        error: null,
      };
      return reply.send(response);
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

      let query = supabase
        .from("audit_logs")
        .select(
          `
          *,
          admin:admin_profiles(display_name, email)
        `,
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (action) query = query.eq("action", action);
      if (admin_id) query = query.eq("admin_id", admin_id);

      const { data, count, error } = await query;

      if (error) {
        return reply.status(500).send({ success: false, error: error.message });
      }

      return reply.send({
        success: true,
        data: { logs: data, total: count, page: pageNum, limit: limitNum },
      });
    },
  );

  // GET /admin/super/inventory
  fastify.get(
    "/inventory",
    { preHandler: [verifyAuth, requireSuperAdmin] },
    async (request: any, reply) => {
      const { data: restaurants, error: restsError } = await supabase
        .from("restaurants")
        .select("id, name");

      if (restsError)
        return reply
          .status(500)
          .send({ success: false, error: restsError.message });

      const { data: items, error: itemsError } = await supabase
        .from("menu_items")
        .select("id, restaurant_id, name, is_available");

      if (itemsError)
        return reply
          .status(500)
          .send({ success: false, error: itemsError.message });

      const result = restaurants.map((r) => {
        const rItems = items.filter((i) => i.restaurant_id === r.id);
        const outOfStock = rItems.filter((i) => !i.is_available);
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
    },
  );
}
