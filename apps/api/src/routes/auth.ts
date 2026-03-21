import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { verifyAuth } from "../middleware/auth.js";

interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
  username?: string;
  phone: string;
  preferredLanguage: "tr" | "en";
}

interface LoginBody {
  email: string;
  password: string;
}

interface OtpSendBody {
  phone: string;
}

interface OtpVerifyBody {
  phone: string;
  otp: string;
}

interface RefreshBody {
  refreshToken: string;
}

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/register
  fastify.post<{ Body: RegisterBody }>(
    "/register",
    {
      schema: {
        body: {
          type: "object",
          required: [
            "email",
            "password",
            "displayName",
            "phone",
            "preferredLanguage",
          ],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
            displayName: { type: "string", minLength: 2 },
            phone: { type: "string" },
            preferredLanguage: { type: "string", enum: ["tr", "en"] },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, displayName, phone, preferredLanguage } =
        request.body;

      try {
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              display_name: displayName,
              preferred_language: preferredLanguage,
              phone,
            },
          });

        if (authError || !authData.user) {
          request.log.error({ authError }, "Supabase register error");
          return reply.status(400).send({
            error: authError?.message || "Failed to register",
            code: authError?.code,
            status: authError?.status,
          });
        }

        const user = authData.user;

        // Profile row is created automatically via the trigger.
        // Update the phone specifically as requested.
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ phone })
          .eq("id", user.id);

        if (profileError) {
          request.log.warn({ profileError }, "Profile phone update failed");
        }

        return reply.status(201).send({
          uid: user.id,
          email,
          displayName,
        });
      } catch (error: any) {
        request.log.error(error);
        return reply
          .status(400)
          .send({ error: error.message || "Failed to register" });
      }
    },
  );

  // POST /auth/login
  fastify.post<{ Body: LoginBody }>(
    "/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.user || !data.session) {
          return reply
            .status(401)
            .send({ error: error?.message || "Invalid credentials" });
        }

        reply.setCookie("token", data.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 3600,
        });

        return reply.send({
          uid: data.user.id,
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: "Login failed" });
      }
    },
  );

  // POST /auth/otp/send
  fastify.post<{ Body: OtpSendBody }>(
    "/otp/send",
    {
      schema: {
        body: {
          type: "object",
          required: ["phone"],
          properties: {
            phone: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { phone } = request.body;
      request.log.info({ phone }, "OTP sent to phone");
      return reply.send({ success: true, message: "OTP sent (stubbed)" });
    },
  );

  // POST /auth/otp/verify
  fastify.post<{ Body: OtpVerifyBody }>(
    "/otp/verify",
    {
      schema: {
        body: {
          type: "object",
          required: ["phone", "otp"],
          properties: {
            phone: { type: "string" },
            otp: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { phone, otp } = request.body;
      request.log.info({ phone, otp }, "OTP verified");
      return reply.send({ success: true, message: "OTP verified (stubbed)" });
    },
  );

  // POST /auth/refresh
  fastify.post<{ Body: RefreshBody }>(
    "/refresh",
    {
      schema: {
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      try {
        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: refreshToken,
        });

        if (error || !data.session) {
          return reply
            .status(401)
            .send({ error: error?.message || "Invalid refresh token" });
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
        request.log.error(error);
        return reply.status(500).send({ error: "Refresh failed" });
      }
    },
  );

  // DELETE /auth/logout
  fastify.delete(
    "/logout",
    {
      preHandler: [verifyAuth],
    },
    async (request, reply) => {
      try {
        if (request.user?.uid) {
          await supabase.auth.admin.signOut(request.user.uid);
        }
        reply.clearCookie("token", { path: "/" });
        return reply.send({ success: true });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: "Logout failed" });
      }
    },
  );

  // GET /auth/me
  fastify.get(
    "/me",
    {
      preHandler: [verifyAuth],
    },
    async (request, reply) => {
      return reply.send(request.user);
    },
  );

  // PUT /auth/profile/username
  fastify.put<{ Body: { username: string } }>(
    "/profile/username",
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const { username } = request.body;
      const user = request.user!;

      // Sanitize
      const sanitized = username
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 30);

      if (sanitized.length < 3) {
        return reply.status(400).send({
          success: false,
          data: null,
          error: "Username must be at least 3 characters",
        });
      }

      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", sanitized)
        .neq("id", user.uid)
        .maybeSingle();

      if (existing) {
        return reply.status(409).send({
          success: false,
          data: null,
          error: "Username already taken",
        });
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({ username: sanitized })
        .eq("id", user.uid)
        .select()
        .single();

      if (error) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message,
        });
      }

      return reply.send({ success: true, data, error: null });
    },
  );

  // POST /auth/oauth-callback
  // Called after OAuth flow to set the httpOnly cookie from a Supabase token
  fastify.post<{ Body: { access_token: string } }>(
    "/oauth-callback",
    async (request, reply) => {
      const { access_token } = request.body;

      if (!access_token) {
        return reply.status(400).send({
          success: false,
          error: "Missing access_token",
        });
      }

      // Verify the token is valid with Supabase
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(access_token);

      if (error || !user) {
        return reply.status(401).send({
          success: false,
          error: "Invalid token",
        });
      }

      // Ensure profile exists (OAuth users may not have gone through /register)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        // Create profile for OAuth user if trigger didn't fire
        await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          display_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "User",
          role: "customer",
          preferred_language: "en",
          created_at: new Date().toISOString(),
        });
      }

      // Set the httpOnly cookie exactly like /auth/login does
      reply.setCookie("token", access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
      });

      return reply.send({ success: true });
    },
  );
}
