import { FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }

  interface FastifyRequest {
    user?: {
      uid: string; // legacy
      id: string; // new standardized
      email: string;
      displayName: string;
      username: string | null;
      role: string;
      restaurantId: string | null; // legacy
      restaurant_id: string | null; // new standardized
    };
    restaurantId?: string;
  }
}

export {};
