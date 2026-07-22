import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestApp, resetDatabase } from "../helpers/testApp";
import { registerAndLogin } from "../helpers/authHelpers";

const app = buildTestApp();

beforeEach(async () => {
  await resetDatabase();
});

async function createEvent(token: string, overrides: Record<string, unknown> = {}) {
  return request(app)
    .post("/api/events")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Ada & Sam's Wedding",
      type: "WEDDING",
      date: "2026-09-12",
      venueName: "The Grand Hall",
      capacity: 120,
      ...overrides,
    });
}

describe("Events API", () => {
  it("requires authentication to list or create events", async () => {
    const listRes = await request(app).get("/api/events");
    expect(listRes.status).toBe(401);

    const createRes = await request(app).post("/api/events").send({ name: "X", date: "2026-01-01" });
    expect(createRes.status).toBe(401);
  });

  it("creates an event with a unique public RSVP token", async () => {
    const { token } = await registerAndLogin(app);
    const res = await createEvent(token);

    expect(res.status).toBe(201);
    expect(res.body.data.event.name).toBe("Ada & Sam's Wedding");
    expect(res.body.data.event.rsvpToken).toBeTruthy();
    expect(res.body.data.event.rsvpOpen).toBe(true);
  });

  it("validates required fields", async () => {
    const { token } = await registerAndLogin(app);
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("only returns events belonging to the authenticated user", async () => {
    const planner1 = await registerAndLogin(app);
    const planner2 = await registerAndLogin(app);

    await createEvent(planner1.token, { name: "Planner 1 Event" });
    await createEvent(planner2.token, { name: "Planner 2 Event" });

    const res = await request(app).get("/api/events").set("Authorization", `Bearer ${planner1.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.events).toHaveLength(1);
    expect(res.body.data.events[0].name).toBe("Planner 1 Event");
  });

  it("prevents a user from reading another user's event (404, not 403)", async () => {
    const planner1 = await registerAndLogin(app);
    const planner2 = await registerAndLogin(app);

    const created = await createEvent(planner1.token);
    const eventId = created.body.data.event.id;

    const res = await request(app)
      .get(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${planner2.token}`);

    expect(res.status).toBe(404);
  });

  it("prevents a user from updating or deleting another user's event", async () => {
    const planner1 = await registerAndLogin(app);
    const planner2 = await registerAndLogin(app);
    const created = await createEvent(planner1.token);
    const eventId = created.body.data.event.id;

    const updateRes = await request(app)
      .put(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${planner2.token}`)
      .send({ name: "Hijacked" });
    expect(updateRes.status).toBe(404);

    const deleteRes = await request(app)
      .delete(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${planner2.token}`);
    expect(deleteRes.status).toBe(404);
  });

  it("returns dashboard stats for an event", async () => {
    const { token } = await registerAndLogin(app);
    const created = await createEvent(token);
    const eventId = created.body.data.event.id;

    const res = await request(app)
      .get(`/api/events/${eventId}/dashboard`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.stats).toMatchObject({
      totalGuests: 0,
      confirmed: 0,
      declined: 0,
      pending: 0,
      maybe: 0,
      unassignedConfirmedGuests: 0,
    });
  });
});
