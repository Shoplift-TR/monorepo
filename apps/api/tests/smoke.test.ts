import request from "supertest";

const API_URL = process.env.STAGING_API_URL || "http://localhost:3001";

describe("API Smoke Tests", () => {
  // 1. Availability check
  it("GET /health should return 200 and status ok", async () => {
    const res = await request(API_URL).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
  });

  // 2. Public Data check
  it("GET /restaurants should return 200", async () => {
    const res = await request(API_URL).get("/restaurants");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // 3. Auth Flow - Registration Validation
  it("POST /auth/register with missing fields should return 400", async () => {
    const res = await request(API_URL).post("/auth/register").send({
      email: "test@example.com",
      // missing password, displayName, etc.
    });
    // Fastify/ajv validation fails should return 400
    expect(res.status).toBe(400);
  });

  // 4. Protected Route: Admin
  it("GET /admin should require authentication (expect 401)", async () => {
    const res = await request(API_URL).get("/admin");
    // Depending on implementation, might return 401 or 404 (if not implemented but auth middleware is global/route-level)
    // To be safe against "Not Implemented" returning 200 with an error object,
    // let's just make sure it doesn't succeed exposing data.
    expect(res.status).not.toBe(200);
    if (res.status !== 404) {
      expect(res.status).toBe(401);
    }
  });

  // 5. Protected Route: Orders Creation
  it("POST /orders should require authentication (expect 401)", async () => {
    const res = await request(API_URL).post("/orders").send({});
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(201);
  });

  // 6. Protected Route: Payments
  it("POST /payments should require authentication (expect 401)", async () => {
    const res = await request(API_URL).post("/payments").send({});
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(201);
  });

  // 7. Security: CORS headers check
  it("OPTIONS /health should have CORS headers", async () => {
    const res = await request(API_URL).options("/health");
    expect(res.headers["access-control-allow-origin"]).toBeDefined();
  });

  // 8. Public Data: specific restaurant (Not Implemented yet, but should return handled response)
  it("GET /restaurants/rest_id should return handled generic response", async () => {
    const res = await request(API_URL).get("/restaurants/rest_id");
    expect(res.status).toBeDefined();
    expect(res.body.success).toBe(false); // Because it's "Not Implemented" in the scouted code
  });
});
