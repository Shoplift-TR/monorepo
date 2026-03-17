import { FastifyInstance } from "fastify";
import { ApiResponse } from "@shoplift/types";

import { verifyAuth } from "../middleware/auth.js";

export default async function orderRoutes(fastify: FastifyInstance) {
  fastify.get("/", { preHandler: [verifyAuth] }, async () => {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Not Implemented",
    };
    return response;
  });
}
