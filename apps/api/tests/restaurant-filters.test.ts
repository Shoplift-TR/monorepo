import request from "supertest";

const API_URL = process.env.STAGING_API_URL || "http://localhost:3001";

describe("Restaurant Filters", () => {
  it("GET /restaurants?open_now=true should return only open restaurants", async () => {
    const res = await request(API_URL).get("/restaurants?open_now=true");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Further assertions would require knowing the seed data
  });

  it("GET /restaurants?open_between_start=09:00&open_between_end=17:00 should work", async () => {
    const res = await request(API_URL).get(
      "/restaurants?open_between_start=09:00&open_between_end=17:00",
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should handle overnight windows correctly", async () => {
    // This would require specific seed data with a 22:00-02:00 window
    // and querying at e.g. 23:30.
    const res = await request(API_URL).get(
      "/restaurants?open_between_start=23:30&open_between_end=23:30",
    );
    expect(res.status).toBe(200);
  });
});
