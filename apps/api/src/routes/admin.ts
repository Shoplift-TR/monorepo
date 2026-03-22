import { FastifyInstance } from "fastify";
import { ApiResponse } from "@shoplift/types";
import { verifyAuth, requireSuperAdmin } from "../middleware/auth.js";
import { writeAuditLog } from "../lib/audit.js";
import { supabase } from "../lib/supabase.js";

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    { preHandler: [verifyAuth, requireSuperAdmin] },
    async () => {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: "Not Implemented",
      };
      return response;
    },
  );

  fastify.post<{
    Body: { action: string; targetType: string; targetId?: string };
  }>("/audit", async (request, reply) => {
    const { action, targetType, targetId } = request.body;

    // Get user from token if present (via onRequest hook or manual check)
    // default to "system" for unauthenticated logins/actions
    let adminId = request.user?.uid || "system";

    if (adminId === "system") {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split("Bearer ")[1];
        try {
          const { data } = await supabase.auth.getUser(token);
          if (data.user) adminId = data.user.id;
        } catch {
          // ignore
        }
      }
    }

    // Fire and forget — never fail
    writeAuditLog({
      adminId,
      action: action || "UNKNOWN",
      targetType: targetType || "session",
      targetId,
      ipAddress: request.ip,
    }).catch(() => {});

    return reply.status(200).send({ success: true });
  });
}
