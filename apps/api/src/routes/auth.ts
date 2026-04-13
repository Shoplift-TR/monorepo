import { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { verifyAuth } from "../middleware/auth.js";
import { db, profiles, auditLogs } from "@shoplift/db";
import { eq, and, ne, ilike } from "drizzle-orm";
import { ApiResponse } from "@shoplift/types";

// Zod Schemas for Validation
const RegisterSchema = z
  .object({
    email: z.string().email().max(255).trim(),
    password: z.string().min(8).max(128),
    name: z.string().min(2).max(100).trim(),
    phone: z.string().optional(),
  })
  .strict();

const LoginSchema = z
  .object({
    email: z.string().email().max(255).trim(),
    password: z.string().min(8).max(128),
  })
  .strict();

const OtpSendSchema = z
  .object({
    phone: z.string(),
  })
  .strict();

const OtpVerifySchema = z
  .object({
    phone: z.string(),
    otp: z.string(),
  })
  .strict();

const RefreshSchema = z
  .object({
    refreshToken: z.string(),
  })
  .strict();

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/register
  fastify.post("/register", async (request, reply) => {
    const validation = RegisterSchema.safeParse(request.body);
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

    const { email, password, name, phone } = validation.data;

    try {
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            display_name: name,
            phone,
          },
        });

      if (authError || !authData.user) {
        if (authError?.message?.includes("already exists")) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "EMAIL_ALREADY_EXISTS",
              message: "An account with this email already exists",
            },
          });
        }
        request.log.error(
          { authError, email },
          "Registration failed security event",
        );
        return reply.status(400).send({
          success: false,
          error: {
            code: "REGISTRATION_FAILED",
            message: "Failed to create account. Please try again.",
          },
        });
      }

      const user = authData.user;

      // Ensure profile exists (it should be created by trigger, but we'll update it)
      await db
        .update(profiles)
        .set({ phone, displayName: name })
        .where(eq(profiles.id, user.id));

      return reply.status(201).send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: email,
            name: name,
            role: "user",
            created_at: user.created_at,
          },
        },
      });
    } catch (error: any) {
      request.log.error({ error, email }, "Critical registration error");
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  });

  // POST /auth/login
  fastify.post("/login", async (request, reply) => {
    const validation = LoginSchema.safeParse(request.body);
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

    const { email, password } = validation.data;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user || !data.session) {
        request.log.warn(
          { email, error: error?.message },
          "Failed login attempt security event",
        );

        // Log failed login to audit_logs
        try {
          await db.insert(auditLogs).values({
            adminId: undefined, // omit field so DB stores NULL for unauthenticated failures
            action: "LOGIN_FAILURE",
            payload: { email, reason: error?.message || "Invalid credentials" },
            ipAddress: request.ip,
          });
        } catch (e) {
          request.log.error(e, "Failed to persist audit log");
        }

        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        });
      }

      // Fetch profile to check is_active
      const profileResult = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, data.user.id))
        .limit(1);

      const profile = profileResult[0];

      if (profile && profile.isActive === false) {
        request.log.warn(
          { email, userId: data.user.id },
          "Login attempt for disabled account",
        );
        await supabase.auth.signOut(); // Ensure session is destroyed if possible
        return reply.status(403).send({
          success: false,
          error: {
            code: "ACCOUNT_DISABLED",
            message: "This account has been disabled",
          },
        });
      }

      request.log.info(
        { email, userId: data.user.id },
        "Successful login security event",
      );

      reply.setCookie("token", data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600 * 24, // 24 hours
      });

      return reply.send({
        success: true,
        data: {
          access_token: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email,
            role: profile?.role || "user",
            restaurant_id: profile?.restaurantId || null,
          },
        },
      });
    } catch (error: any) {
      request.log.error(
        { error, email },
        "Critical login error security event",
      );
      return reply.status(401).send({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }
  });

  // POST /auth/otp/send
  fastify.post("/otp/send", async (request, reply) => {
    const validation = OtpSendSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid phone number" },
      });
    }

    const { phone } = validation.data;
    request.log.info({ phone }, "OTP sent security event (stubbed)");
    return reply.send({ success: true, message: "OTP sent (stubbed)" });
  });

  // POST /auth/otp/verify
  fastify.post("/otp/verify", async (request, reply) => {
    const validation = OtpVerifySchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid OTP payload" },
      });
    }

    const { phone, otp } = validation.data;
    request.log.info({ phone, otp }, "OTP verified security event");
    return reply.send({ success: true, message: "OTP verified (stubbed)" });
  });

  // POST /auth/refresh
  fastify.post("/refresh", async (request, reply) => {
    const validation = RefreshSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid refresh token" },
      });
    }

    const { refreshToken } = validation.data;

    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "REFRESH_FAILED",
            message: "Invalid refresh token",
          },
        });
      }

      reply.setCookie("token", data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
      });

      return reply.send({
        success: true,
      });
    } catch (error: any) {
      request.log.error(error, "Refresh session failure");
      return reply.status(401).send({
        success: false,
        error: {
          code: "REFRESH_FAILED",
          message: "Invalid refresh token",
        },
      });
    }
  });

  // POST /auth/logout
  fastify.post(
    "/logout",
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        const cookieToken = request.cookies.token;
        const token = authHeader?.split("Bearer ")[1] || cookieToken;

        if (token) {
          try {
            await supabase.auth.admin.signOut(request.user!.uid);
            request.log.info(
              { userId: request.user!.uid },
              "User logged out security event",
            );
          } catch (_error) {
            // Ignore error
          }
        }

        reply.clearCookie("token", {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });

        return reply.send({
          success: true,
          data: {},
        });
      } catch (error: any) {
        request.log.error(error, "Logout processing error");
        reply.clearCookie("token", { path: "/" });
        return reply.send({
          success: true,
          data: {},
        });
      }
    },
  );

  // GET /auth/me
  fastify.get("/me", { preHandler: [verifyAuth] }, async (request, reply) => {
    return reply.send({
      success: true,
      data: request.user,
    });
  });

  // PUT /auth/profile/username
  fastify.put(
    "/profile/username",
    {
      preHandler: [verifyAuth],
      schema: {
        body: {
          type: "object",
          required: ["username"],
          properties: {
            username: { type: "string", minLength: 3, maxLength: 30 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { username } = request.body as { username: string };
      const user = request.user!;

      const sanitized = username
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 30);

      if (sanitized.length < 3) {
        const errorResponse: ApiResponse<null> = {
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Username must be at least 3 characters",
          },
        };
        return reply.status(400).send(errorResponse);
      }

      try {
        const existingResult = await db
          .select({ id: profiles.id })
          .from(profiles)
          .where(
            and(ilike(profiles.username, sanitized), ne(profiles.id, user.id)),
          )
          .limit(1);

        if (existingResult.length > 0) {
          return reply.status(409).send({
            success: false,
            error: { code: "CONFLICT", message: "Username already taken" },
          });
        }

        const updatedResult = await db
          .update(profiles)
          .set({ username: sanitized })
          .where(eq(profiles.id, user.id))
          .returning();

        return reply.send({ success: true, data: updatedResult[0] });
      } catch (error: any) {
        request.log.error(error, "Username update error");
        return reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to update username",
          },
        });
      }
    },
  );

  // POST /auth/oauth-callback
  fastify.post("/oauth-callback", async (request, reply) => {
    const { access_token } = request.body as { access_token: string };

    if (!access_token) {
      return reply.status(400).send({
        success: false,
        error: { code: "MISSING_TOKEN", message: "Missing access token" },
      });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(access_token);

    if (error || !user) {
      return reply.status(401).send({
        success: false,
        error: { code: "INVALID_TOKEN", message: "Invalid token" },
      });
    }

    try {
      const profileResult = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);

      if (!profileResult[0]) {
        await db.insert(profiles).values({
          id: user.id,
          email: user.email || "",
          displayName:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "User",
          role: "customer",
          preferredLanguage: "en",
        });
      }

      reply.setCookie("token", access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
      });

      return reply.send({ success: true });
    } catch (error: any) {
      request.log.error(error, "OAuth callback error");
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to process OAuth callback",
        },
      });
    }
  });
}
