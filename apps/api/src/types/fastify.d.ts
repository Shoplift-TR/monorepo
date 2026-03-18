declare module "fastify" {
  interface FastifyRequest {
    user?: {
      uid: string;
      email: string;
      displayName: string;
      role: string;
      restaurantId: string | null;
    };
    restaurantId?: string;
  }
}

export {};
