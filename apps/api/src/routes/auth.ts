import { FastifyInstance } from "fastify";
import { auth, db } from "../lib/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "../middleware/auth.js";

interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
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
        const userRecord = await auth.createUser({
          email,
          password,
          displayName,
          phoneNumber: phone,
        });

        await auth.setCustomUserClaims(userRecord.uid, { role: "customer" });

        const userData = {
          uid: userRecord.uid,
          email,
          phone,
          displayName,
          preferredLanguage,
          role: "customer",
          createdAt: Timestamp.now(),
          savedAddresses: [],
          paymentMethodTokens: [],
          usedPromos: [],
          lastOrderAt: null,
        };

        await db.collection("users").doc(userRecord.uid).set(userData);

        return reply.status(201).send({
          uid: userRecord.uid,
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
      const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
      const apiKey = emulatorHost
        ? "fake-api-key"
        : process.env.FIREBASE_WEB_API_KEY;

      if (!apiKey && !emulatorHost) {
        return reply
          .status(500)
          .send({
            error: "Server configuration error: FIREBASE_WEB_API_KEY missing",
          });
      }

      try {
        const baseUrl = emulatorHost
          ? `http://${emulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword`
          : "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";

        const response = await fetch(`${baseUrl}?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        });

        const data = (await response.json()) as any;

        if (!response.ok) {
          return reply
            .status(401)
            .send({ error: data.error?.message || "Invalid credentials" });
        }

        return reply.send({
          token: data.idToken,
          refreshToken: data.refreshToken,
          uid: data.localId,
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
      // TODO: Integrate Twilio API to actually send OTP
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
      const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
      const apiKey = emulatorHost
        ? "fake-api-key"
        : process.env.FIREBASE_WEB_API_KEY;

      if (!apiKey && !emulatorHost) {
        return reply
          .status(500)
          .send({
            error: "Server configuration error: FIREBASE_WEB_API_KEY missing",
          });
      }

      try {
        const baseUrl = emulatorHost
          ? `http://${emulatorHost}/securetoken.googleapis.com/v1/token`
          : "https://securetoken.googleapis.com/v1/token";

        const response = await fetch(`${baseUrl}?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }),
        });

        const data = (await response.json()) as any;

        if (!response.ok) {
          return reply
            .status(401)
            .send({ error: data.error?.message || "Invalid refresh token" });
        }

        return reply.send({
          token: data.id_token,
          refreshToken: data.refresh_token,
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
        const user = request.user as { uid: string };
        if (!user || !user.uid) {
          return reply.status(401).send({ error: "Unauthorized" });
        }
        await auth.revokeRefreshTokens(user.uid);
        return reply.send({ success: true });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: "Logout failed" });
      }
    },
  );
}
