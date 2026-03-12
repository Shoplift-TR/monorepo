import { FastifyInstance } from "fastify";
import { ApiResponse, User } from "@shoplift/types";
import { auth, db } from "../lib/firebase.js";

interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
  phone: string;
  preferredLanguage: "tr" | "en";
}

export default async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /auth/register
   * Registers a new user with Firebase Auth and initializes their profile in Firestore.
   */
  fastify.post(
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
        request.body as RegisterBody;

      try {
        // 1. Create user in Firebase Auth
        const userRecord = await auth.createUser({
          email,
          password,
          displayName,
          phoneNumber: phone,
        });

        // 2. Set custom claims (Role-Based Access Control)
        // Custom claim structured as customer, matching invariants.md check
        await auth.setCustomUserClaims(userRecord.uid, { role: "customer" });

        // 3. Create user document in Firestore
        const userData: User = {
          uid: userRecord.uid,
          email,
          phone,
          displayName,
          savedAddresses: [],
          preferredLanguage,
          createdAt: new Date().toISOString(),
        };

        await db.collection("users").doc(userRecord.uid).set(userData);

        // 4. Generate a custom token for the client to sign in immediately
        const customToken = await auth.createCustomToken(userRecord.uid);

        const response: ApiResponse<{ token: string; user: User }> = {
          success: true,
          data: {
            token: customToken,
            user: userData,
          },
          error: null,
        };

        return reply.status(201).send(response);
      } catch (error) {
        const authError = error as { code?: string; message?: string };
        request.log.error(authError);

        let errorMessage = "Failed to register user";
        let statusCode = 500;

        if (authError.code === "auth/email-already-exists") {
          errorMessage = "This email address is already registered";
          statusCode = 400;
        } else if (authError.code === "auth/phone-number-already-exists") {
          errorMessage = "This phone number is already registered";
          statusCode = 400;
        }

        const errorResponse: ApiResponse<null> = {
          success: false,
          data: null,
          error: errorMessage,
        };

        return reply.status(statusCode).send(errorResponse);
      }
    },
  );

  fastify.get("/", async () => {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Not Implemented",
    };
    return response;
  });
}
