import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestApp, resetDatabase } from "../helpers/testApp";
import { registerAndLogin } from "../helpers/authHelpers";

const app = buildTestApp();

beforeEach(async () => {
  await resetDatabase();
});

async function createEventWithToken(token: string, isPublic = true) {
  const res = await request(app)
    .post("/api/events")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Boat Cruise Party", date: "2026-10-01" });
  return res.body.data.event.id as string;
}

describe("Ticket types API: access control", () => {
  it("rejects a request from a planner who doesn't own the event", async () => {
    const { token } = await registerAndLogin(app);
    const planner2 = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);

    const res = await request(app)
      .post(`/api/events/${eventId}/ticket-types`)
      .set("Authorization", `Bearer ${planner2.token}`)
      .send({ name: "General Admission", price: 20, currency: "USD" });
    expect(res.status).toBe(404);
  });
});

describe("Ticket types API: CRUD", () => {
  it("creates a ticket type with price stored in cents", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app)
      .post(`/api/events/${eventId}/ticket-types`)
      .set(auth)
      .send({ name: "General Admission", description: "Standard entry", price: 25, currency: "USD", quantityTotal: 100 });
    expect(res.status).toBe(201);
    expect(res.body.data.ticketType.price).toBe(25);
    expect(res.body.data.ticketType.quantityTotal).toBe(100);
    expect(res.body.data.ticketType.quantityRemaining).toBe(100);
    expect(res.body.data.ticketType.isActive).toBe(true);
  });

  it("defaults to unlimited quantity when none is given", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app)
      .post(`/api/events/${eventId}/ticket-types`)
      .set(auth)
      .send({ name: "General Admission", price: 20, currency: "USD" });
    expect(res.body.data.ticketType.quantityTotal).toBeNull();
    expect(res.body.data.ticketType.quantityRemaining).toBeNull();
  });

  it("rejects a minPerOrder greater than maxPerOrder", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app)
      .post(`/api/events/${eventId}/ticket-types`)
      .set(auth)
      .send({ name: "VIP", price: 50, currency: "USD", minPerOrder: 5, maxPerOrder: 2 });
    expect(res.status).toBe(400);
  });

  it("updates a ticket type", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/ticket-types`)
      .set(auth)
      .send({ name: "Early Bird", price: 15, currency: "USD" });

    const updated = await request(app)
      .put(`/api/events/${eventId}/ticket-types/${created.body.data.ticketType.id}`)
      .set(auth)
      .send({ price: 18, isActive: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data.ticketType.price).toBe(18);
    expect(updated.body.data.ticketType.isActive).toBe(false);
  });

  it("deletes a ticket type with no sales", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/ticket-types`)
      .set(auth)
      .send({ name: "Temp Tier", price: 10, currency: "USD" });

    const del = await request(app)
      .delete(`/api/events/${eventId}/ticket-types/${created.body.data.ticketType.id}`)
      .set(auth);
    expect(del.status).toBe(204);
  });

  it("reorders ticket types", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const a = await request(app).post(`/api/events/${eventId}/ticket-types`).set(auth).send({ name: "A", price: 10, currency: "USD" });
    const b = await request(app).post(`/api/events/${eventId}/ticket-types`).set(auth).send({ name: "B", price: 20, currency: "USD" });

    const reordered = await request(app)
      .post(`/api/events/${eventId}/ticket-types/reorder`)
      .set(auth)
      .send({ orderedIds: [b.body.data.ticketType.id, a.body.data.ticketType.id] });
    expect(reordered.status).toBe(200);
    expect(reordered.body.data.ticketTypes[0].name).toBe("B");
    expect(reordered.body.data.ticketTypes[1].name).toBe("A");
  });

  it("rejects reordering with an id from another event", async () => {
    const { token } = await registerAndLogin(app);
    const eventId1 = await createEventWithToken(token);
    const eventId2 = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const a = await request(app).post(`/api/events/${eventId1}/ticket-types`).set(auth).send({ name: "A", price: 10, currency: "USD" });
    const other = await request(app).post(`/api/events/${eventId2}/ticket-types`).set(auth).send({ name: "Other", price: 10, currency: "USD" });

    const res = await request(app)
      .post(`/api/events/${eventId1}/ticket-types/reorder`)
      .set(auth)
      .send({ orderedIds: [other.body.data.ticketType.id, a.body.data.ticketType.id] });
    expect(res.status).toBe(400);
  });
});
