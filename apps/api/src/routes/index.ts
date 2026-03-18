import { FastifyInstance } from "fastify";
import authRoutes from "./auth.js";
import restaurantRoutes from "./restaurants.js";
import orderRoutes from "./orders.js";
import paymentRoutes from "./payments.js";
import adminRoutes from "./admin.js";
import restaurantAdminRoutes from "./admin/restaurant.js";
import supportRoutes from "./supportTickets.js";
import trackingRoutes from "./tracking.js";
import promoRoutes from "./promos.js";
import adminSuperRoutes from "./adminSuper.js";

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(authRoutes, { prefix: "/auth" });
  await fastify.register(restaurantRoutes, { prefix: "/restaurants" });
  await fastify.register(orderRoutes, { prefix: "/orders" });
  await fastify.register(paymentRoutes, { prefix: "/payments" });
  await fastify.register(adminRoutes, { prefix: "/admin" });
  await fastify.register(restaurantAdminRoutes, {
    prefix: "/admin/restaurant",
  });
  await fastify.register(supportRoutes, { prefix: "/support" });
  await fastify.register(trackingRoutes, { prefix: "/tracking" });

  await fastify.register(promoRoutes, { prefix: "/promos" });
  await fastify.register(adminSuperRoutes, { prefix: "/admin/super" });
}
