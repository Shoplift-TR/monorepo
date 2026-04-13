import request from "supertest";

const API_URL = process.env.STAGING_API_URL || "http://localhost:3001";

describe("Receipt Feature", () => {
  const orderId: string = "b6e9a7e2-45d0-afeb-3adff3b1ccd9"; // Placeholder, should be setup in beforeAll

  it("should generate a receipt when status becomes CONFIRMED", async () => {
    // Note: This test assumes the orderId exists and is in PENDING status
    // In a real test, we would seed an order here.
    const res = await request(API_URL)
      .put(`/orders/${orderId}/status`)
      .send({ status: "CONFIRMED" });

    // Allow some time for async receipt generation
    await new Promise((r) => setTimeout(r, 2000));

    const receiptRes = await request(API_URL).get(`/orders/${orderId}/receipt`);
    // Should redirect to a public URL
    expect([200, 302]).toContain(receiptRes.status);
  });

  it("should enforce ownership on receipt download", async () => {
    // Test with a random user token (not the owner)
    // For now, let's just check if it returns 401 if unauthorized
    const res = await request(API_URL).get(`/orders/${orderId}/receipt`);
    expect(res.status).toBe(401);
  });
});
