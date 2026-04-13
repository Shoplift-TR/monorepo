import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { ApiResponse } from "@shoplift/types";

/**
 * Rate limiting strategy as per .agent/invariants.md and feedback:
 * - Unauthenticated: by IP
 * - Authenticated: by User ID
 * - Sensitive (/payments, /admin): both IP and User ID
 */

const LIMITS = {
  PUBLIC_BROWSE: { points: 200, duration: 60 },
  PUBLIC_DEFAULT: { points: 100, duration: 60 },
  AUTH_LOGIN: { points: 5, duration: 15 * 60 }, // 5 per 15 min
  AUTH_REGISTER: { points: 3, duration: 60 * 60 }, // 3 per hour
  AUTH_OTP: { points: 10, duration: 30 * 60 }, // 10 per 30 min
  PRIVATE: { points: 500, duration: 3600 },
  SENSITIVE_IP: { points: 20, duration: 60 },
  SENSITIVE_USER: { points: 500, duration: 3600 },
};

const publicBrowseLimiter = new RateLimiterMemory(LIMITS.PUBLIC_BROWSE);
const publicDefaultLimiter = new RateLimiterMemory(LIMITS.PUBLIC_DEFAULT);
const loginLimiter = new RateLimiterMemory(LIMITS.AUTH_LOGIN);
const registerLimiter = new RateLimiterMemory(LIMITS.AUTH_REGISTER);
const otpLimiter = new RateLimiterMemory(LIMITS.AUTH_OTP);
const privateLimiter = new RateLimiterMemory(LIMITS.PRIVATE);
const sensitiveIpLimiter = new RateLimiterMemory(LIMITS.SENSITIVE_IP);
const sensitiveUserLimiter = new RateLimiterMemory(LIMITS.SENSITIVE_USER);

export const rateLimiterPlugin = async (fastify: FastifyInstance) => {
  fastify.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ip = request.ip;
      const userId = request.user?.uid;
      const path = request.url;
      const method = request.method;

      try {
        // 1. Auth specialized routes
        if (path.startsWith("/auth/register") && method === "POST") {
          await registerLimiter.consume(ip);
          return;
        }
        if (path.startsWith("/auth/login") && method === "POST") {
          const email = (request.body as any)?.email;
          const key = email ? `${ip}::${email}` : ip;
          await loginLimiter.consume(key);
          return;
        }
        if (path.startsWith("/auth/otp") && method === "POST") {
          const email = (request.body as any)?.email;
          if (email) {
            await otpLimiter.consume(email);
          } else {
            // fallback to IP if email not provided (unlikely given schema)
            await otpLimiter.consume(ip);
          }
          return;
        }

        // 2. Sensitive routes (/payments/*, /admin/*)
        if (path.startsWith("/payments") || path.startsWith("/admin")) {
          await sensitiveIpLimiter.consume(ip);
          if (userId) {
            await sensitiveUserLimiter.consume(userId);
          }
          return;
        }

        // 3. Browsing routes (Public)
        if (
          method === "GET" &&
          (path.startsWith("/restaurants") || path.includes("/menu"))
        ) {
          return await publicBrowseLimiter.consume(ip);
        }

        // 4. Authenticated routes (Private)
        if (userId) {
          return await privateLimiter.consume(userId);
        }

        // 5. Default Public
        await publicDefaultLimiter.consume(ip);
      } catch (rejRes) {
        const errorResponse: ApiResponse<null> = {
          success: false,
          data: null,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
          },
        };

        const retryAfter =
          Math.round(
            ((rejRes as Record<string, any>).msBeforeNext as number) / 1000,
          ) || 60;

        reply.status(429).header("Retry-After", retryAfter).send(errorResponse);
      }
    },
  );
};
