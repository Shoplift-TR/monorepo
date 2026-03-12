import { FastifyInstance } from "fastify";
import { ApiResponse } from "@shoplift/types";

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.get("/", async () => {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Not Implemented",
    };
    return response;
  });
}
