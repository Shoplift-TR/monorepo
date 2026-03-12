import { DecodedIdToken } from "firebase-admin/auth";

declare module "fastify" {
  interface FastifyRequest {
    user?: DecodedIdToken;
  }
}
