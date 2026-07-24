import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestApp, resetDatabase } from "../helpers/testApp";
import { registerAndLogin } from "../helpers/authHelpers";

const app = buildTestApp();

beforeEach(async () => {
  await resetDatabase();
});

async function createEventWithToken(token: string) {
  const res = await request(app)
    .post("/api/events")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Test Event", date: "2026-10-01" });
  return res.body.data.event.id as string;
}

describe("Vendors", () => {
  it("creates a vendor with a cost and rounds cents correctly", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app)
      .post(`/api/events/${eventId}/vendors`)
      .set(auth)
      .send({ name: "Elegant Catering Co.", category: "CATERING", cost: 2500.5 });

    expect(res.status).toBe(201);
    expect(res.body.data.vendor.name).toBe("Elegant Catering Co.");
    expect(res.body.data.vendor.category).toBe("CATERING");
    expect(res.body.data.vendor.status).toBe("CONTACTED");
    expect(res.body.data.vendor.cost).toBe(2500.5);
  });

  it("lists vendors for an event, filtered by status", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${eventId}/vendors`).set(auth).send({ name: "Vendor A", status: "BOOKED" });
    await request(app).post(`/api/events/${eventId}/vendors`).set(auth).send({ name: "Vendor B", status: "CONTACTED" });

    const res = await request(app).get(`/api/events/${eventId}/vendors?status=BOOKED`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.vendors).toHaveLength(1);
    expect(res.body.data.vendors[0].name).toBe("Vendor A");
  });

  it("updates vendor status and generates a notification", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/vendors`)
      .set(auth)
      .send({ name: "Bright Blooms Florist", category: "FLORAL" });
    const vendorId = created.body.data.vendor.id;

    const updated = await request(app)
      .put(`/api/events/${eventId}/vendors/${vendorId}`)
      .set(auth)
      .send({ status: "BOOKED" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.vendor.status).toBe("BOOKED");

    const notifications = await request(app).get("/api/notifications").set(auth);
    expect(notifications.body.data.notifications).toHaveLength(1);
    expect(notifications.body.data.notifications[0].type).toBe("VENDOR_STATUS_CHANGED");
    expect(notifications.body.data.unreadCount).toBe(1);
  });

  it("does not notify when updating a vendor without changing status", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/vendors`)
      .set(auth)
      .send({ name: "DJ Nova" });
    const vendorId = created.body.data.vendor.id;

    await request(app).put(`/api/events/${eventId}/vendors/${vendorId}`).set(auth).send({ notes: "Confirmed set list" });

    const notifications = await request(app).get("/api/notifications").set(auth);
    expect(notifications.body.data.notifications).toHaveLength(0);
  });

  it("deletes a vendor", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app).post(`/api/events/${eventId}/vendors`).set(auth).send({ name: "Vendor C" });
    const vendorId = created.body.data.vendor.id;

    const del = await request(app).delete(`/api/events/${eventId}/vendors/${vendorId}`).set(auth);
    expect(del.status).toBe(204);

    const list = await request(app).get(`/api/events/${eventId}/vendors`).set(auth);
    expect(list.body.data.vendors).toHaveLength(0);
  });

  it("rejects access to another planner's vendors", async () => {
    const { token } = await registerAndLogin(app);
    const planner2 = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${eventId}/vendors`).set(auth).send({ name: "Vendor A" });

    const res = await request(app)
      .get(`/api/events/${eventId}/vendors`)
      .set("Authorization", `Bearer ${planner2.token}`);
    expect(res.status).toBe(404);
  });

  it("returns a vendor cost summary for an event", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${eventId}/vendors`).set(auth).send({ name: "Vendor A", cost: 1000, status: "BOOKED" });
    await request(app).post(`/api/events/${eventId}/vendors`).set(auth).send({ name: "Vendor B", cost: 500, status: "CONTACTED" });

    const res = await request(app).get(`/api/events/${eventId}/vendors/summary`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.totalVendors).toBe(2);
    expect(res.body.data.bookedCount).toBe(1);
    expect(res.body.data.totalCost).toBe(1500);
  });
});
