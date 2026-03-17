import { FastifyInstance } from "fastify";
import { ApiResponse } from "@shoplift/types";

import { verifyAuth, requireSuperAdmin } from "../middleware/auth.js";

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
}
