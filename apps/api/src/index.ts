import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rawBody from "fastify-raw-body";
import { rateLimiterPlugin } from "./middleware/rateLimiter.js";
import { auth } from "./lib/firebase.js";
import { registerRoutes } from "./routes/index.js";
import { ApiResponse } from "@shoplift/types";

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
  origin: process.env.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:3000"],
  credentials: true,
});

await server.register(helmet);

// Global Authentication Hook (Populates request.user if token is present)
// This is required for the rate limiter to identify users on campus networks.
server.addHook("onRequest", async (request) => {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await auth.verifyIdToken(token);
      request.user = decodedToken;
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
