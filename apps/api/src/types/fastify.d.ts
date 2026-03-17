declare module "fastify" {
  interface FastifyRequest {
    user?: {
      uid: string;
      email: string;
      role: string;
      restaurantId: string | null;
    };
    restaurantId?: string;
  }
}

export {};
