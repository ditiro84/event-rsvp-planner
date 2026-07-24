import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestApp, resetDatabase } from "../helpers/testApp";
import { registerAndLogin } from "../helpers/authHelpers";

const app = buildTestApp();

beforeEach(async () => {
  await resetDatabase();
});

async function createEvent(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/api/events")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Test Gala", date: "2026-11-01", ...overrides });
  return res.body.data.event as { id: string };
}

describe("Analytics overview", () => {
  it("returns zeroed stats for a planner with no events", async () => {
    const { token } = await registerAndLogin(app);
    const res = await request(app).get("/api/analytics").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalEvents).toBe(0);
    expect(res.body.data.confirmationRate).toBe(0);
  });

  it("aggregates guest and vendor stats across events", async () => {
    const { token } = await registerAndLogin(app);
    const auth = { Authorization: `Bearer ${token}` };
    const event = await createEvent(token);

    await request(app).post(`/api/events/${event.id}/guests`).set(auth).send({ firstName: "A", lastName: "One", rsvpStatus: "CONFIRMED" });
    await request(app).post(`/api/events/${event.id}/guests`).set(auth).send({ firstName: "B", lastName: "Two", rsvpStatus: "DECLINED" });
    await request(app).post(`/api/events/${event.id}/guests`).set(auth).send({ firstName: "C", lastName: "Three", rsvpStatus: "PENDING" });
    await request(app).post(`/api/events/${event.id}/vendors`).set(auth).send({ name: "Vendor A", cost: 200, status: "BOOKED" });

    const res = await request(app).get("/api/analytics").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.totalEvents).toBe(1);
    expect(res.body.data.totalGuests).toBe(3);
    expect(res.body.data.confirmed).toBe(1);
    expect(res.body.data.declined).toBe(1);
    expect(res.body.data.pending).toBe(1);
    expect(res.body.data.confirmationRate).toBeCloseTo(1 / 3);
    expect(res.body.data.totalVendors).toBe(1);
    expect(res.body.data.vendorsBooked).toBe(1);
    expect(res.body.data.totalVendorSpend).toBe(200);
    expect(res.body.data.byEvent).toHaveLength(1);
    expect(res.body.data.byEvent[0].eventName).toBe("Test Gala");
  });

  it("only aggregates the requesting planner's own events", async () => {
    const { token } = await registerAndLogin(app);
    const planner2 = await registerAndLogin(app);
    await createEvent(token);

    const res = await request(app).get("/api/analytics").set("Authorization", `Bearer ${planner2.token}`);
    expect(res.body.data.totalEvents).toBe(0);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/analytics");
    expect(res.status).toBe(401);
  });
});
