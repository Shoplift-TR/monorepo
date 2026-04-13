import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rawBody from "fastify-raw-body";
import cookie from "@fastify/cookie";
import { setupRBACMiddleware } from "./middleware/rbac.js";
import { rateLimiterPlugin } from "./middleware/rateLimiter.js";
import { supabase } from "./lib/supabase.js";
import { registerRoutes } from "./routes/index.js";
import { ApiResponse } from "@shoplift/types";
import { db, profiles } from "@shoplift/db";
import { eq } from "drizzle-orm";

const server = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === "development"
        ? { target: "pino-pretty" }
        : undefined,
  },
});

// Correct order of registration: rawBody -> cors -> helmet
await server.register(rawBody, {
  field: "rawBody",
  global: false, // only on specific routes like webhooks
  encoding: false,
  runFirst: true,
});

await server.register(cors, {
  origin: process.env.ALLOWED_ORIGINS?.split(",") ?? [
    "http://localhost:3000",
    "http://localhost:3002",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
});

await server.register(helmet);

await server.register(cookie);
await setupRBACMiddleware(server);

// Global Authentication Hook (Populates request.user if token is present)
// This is required for the rate limiter to identify users on campus networks.
server.addHook("onRequest", async (request) => {
  const authHeader = request.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split("Bearer ")[1];
  } else if (request.cookies.token) {
    token = request.cookies.token;
  }

  if (token) {
    try {
      const { data } = await supabase.auth.getUser(token);
      if (data.user) {
        // Fetch profile to populate full request.user object
        const profileResult = await db
          .select()
          .from(profiles)
          .where(eq(profiles.id, data.user.id))
          .limit(1);

        const profile = profileResult[0];

        if (profile) {
          request.user = {
            uid: data.user.id,
            id: data.user.id,
            email: data.user.email ?? "",
            displayName: profile.displayName || "Customer",
            username: profile.username || null,
            role: profile.role,
            restaurantId: profile.restaurantId ?? null,
            restaurant_id: profile.restaurantId ?? null,
          };
        }
      }
    } catch (_error) {
      // Ignore token errors here; protected routes will handle it in preHandler
    }
  }
});

await server.register(rateLimiterPlugin);
await server.register(registerRoutes);

// Health check fully implemented
server.get("/health", async () => {
  const healthData = {
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    version: process.env.npm_package_version || "0.0.1",
  };

  const response: ApiResponse<typeof healthData> = {
    success: true,
    data: healthData,
    error: null,
  };

  return response;
});

// Start
const start = async () => {
  try {
    await server.listen({
      port: Number(process.env.PORT) || 3001,
      host: "0.0.0.0",
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
