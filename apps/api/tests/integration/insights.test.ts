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

describe("Needs Attention insights", () => {
  it("flags an unassigned VIP guest by name", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app)
      .post(`/api/events/${event.id}/guests`)
      .set(auth)
      .send({ firstName: "Helen", lastName: "Vance", rsvpStatus: "CONFIRMED", isVip: true });

    const res = await request(app).get("/api/insights").set(auth);
    expect(res.status).toBe(200);
    const vipInsight = res.body.data.insights.find((i: { title: string }) => i.title.includes("Helen Vance"));
    expect(vipInsight).toBeTruthy();
    expect(vipInsight.severity).toBe("ACTION_REQUIRED");
    expect(vipInsight.link).toBe(`/events/${event.id}/seating`);
  });

  it("rolls up non-VIP unassigned confirmed guests into one insight", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${event.id}/guests`).set(auth).send({ firstName: "A", lastName: "One", rsvpStatus: "CONFIRMED" });
    await request(app).post(`/api/events/${event.id}/guests`).set(auth).send({ firstName: "B", lastName: "Two", rsvpStatus: "CONFIRMED" });

    const res = await request(app).get("/api/insights").set(auth);
    const rollup = res.body.data.insights.find((i: { id: string }) => i.id === `${event.id}-unassigned-rollup`);
    expect(rollup).toBeTruthy();
    expect(rollup.title).toMatch(/2 confirmed guests/);
  });

  it("flags outstanding menu selections", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app)
      .post(`/api/events/${event.id}/guests`)
      .set(auth)
      .send({ firstName: "A", lastName: "One", rsvpStatus: "CONFIRMED" });

    const res = await request(app).get("/api/insights").set(auth);
    const menuInsight = res.body.data.insights.find((i: { id: string }) => i.id === `${event.id}-menu`);
    expect(menuInsight).toBeTruthy();
    expect(menuInsight.severity).toBe("UPDATE");
  });

  it("flags an approaching RSVP deadline", async () => {
    const { token } = await registerAndLogin(app);
    const soon = new Date(Date.now() + 3 * 86400000).toISOString();
    const event = await createEvent(token, { rsvpDeadline: soon });
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app).get("/api/insights").set(auth);
    const deadlineInsight = res.body.data.insights.find((i: { id: string }) => i.id === `${event.id}-deadline`);
    expect(deadlineInsight).toBeTruthy();
    expect(deadlineInsight.severity).toBe("ACTION_REQUIRED");
  });

  it("produces no insights for a fully on-track event", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app).get("/api/insights").set(auth);
    expect(res.body.data.insights).toHaveLength(0);
  });

  it("scopes to a single event via ?eventId", async () => {
    const { token } = await registerAndLogin(app);
    const event1 = await createEvent(token, { name: "Event One" });
    const event2 = await createEvent(token, { name: "Event Two" });
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${event1.id}/guests`).set(auth).send({ firstName: "A", lastName: "One", rsvpStatus: "CONFIRMED" });
    await request(app).post(`/api/events/${event2.id}/guests`).set(auth).send({ firstName: "B", lastName: "Two", rsvpStatus: "CONFIRMED" });

    const res = await request(app).get(`/api/insights?eventId=${event1.id}`).set(auth);
    expect(res.body.data.insights.every((i: { eventId: string }) => i.eventId === event1.id)).toBe(true);
  });

  it("rejects scoping to another planner's event", async () => {
    const { token } = await registerAndLogin(app);
    const planner2 = await registerAndLogin(app);
    const event = await createEvent(token);

    const res = await request(app)
      .get(`/api/insights?eventId=${event.id}`)
      .set("Authorization", `Bearer ${planner2.token}`);
    expect(res.status).toBe(404);
  });
});
