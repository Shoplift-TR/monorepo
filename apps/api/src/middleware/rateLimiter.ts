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
  PUBLIC_BROWSE: { points: 200, duration: 60 }, // GET /restaurants, /menu
  PUBLIC_DEFAULT: { points: 100, duration: 60 }, // all other unauthenticated
  AUTH_LOGIN: { points: 10, duration: 900 }, // 10 per 15 min
  AUTH_REGISTER: { points: 5, duration: 3600 }, // 5 per hour
  AUTH_OTP: { points: 3, duration: 600 }, // 3 per 10 min
  PRIVATE: { points: 200, duration: 3600 }, // authenticated endpoints per hour
  SENSITIVE_IP: { points: 10, duration: 60 }, // /payments/* /admin/* by IP
  SENSITIVE_USER: { points: 200, duration: 3600 }, // /admin/* by user per hour
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
          return await registerLimiter.consume(ip);
        }
        if (path.startsWith("/auth/login") && method === "POST") {
          return await loginLimiter.consume(ip);
        }
        if (path.startsWith("/auth/otp") && method === "POST") {
          return await otpLimiter.consume(ip);
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
          error: "Too many requests. Please try again later.",
        };

        reply
          .status(429)
          .header(
            "Retry-After",
            Math.round(
              ((rejRes as Record<string, any>).msBeforeNext as number) / 1000,
            ) || 60,
          )
          .send(errorResponse);
      }
    },
  );
};
