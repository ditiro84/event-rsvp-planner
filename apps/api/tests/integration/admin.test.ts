import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestApp, prisma, resetDatabase } from "../helpers/testApp";
import { registerAndLogin, registerAndLoginAsAdmin } from "../helpers/authHelpers";

const app = buildTestApp();

beforeEach(async () => {
  await resetDatabase();
});

async function createEventWithToken(token: string, name = "Subscriber Event") {
  const res = await request(app)
    .post("/api/events")
    .set("Authorization", `Bearer ${token}`)
    .send({ name, date: "2026-10-01" });
  return res.body.data.event.id as string;
}

describe("Admin access control", () => {
  it("rejects a regular planner from every /api/admin route", async () => {
    const { token } = await registerAndLogin(app);
    const auth = { Authorization: `Bearer ${token}` };

    expect((await request(app).get("/api/admin/users").set(auth)).status).toBe(403);
    expect((await request(app).get("/api/admin/events").set(auth)).status).toBe(403);
    expect((await request(app).get("/api/admin/audit-log").set(auth)).status).toBe(403);
    expect((await request(app).get("/api/admin/payment-events").set(auth)).status).toBe(403);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
  });

  it("still 404s a planner trying to view another planner's event directly", async () => {
    const { token: ownerToken } = await registerAndLogin(app);
    const { token: otherToken } = await registerAndLogin(app);
    const eventId = await createEventWithToken(ownerToken);

    const res = await request(app)
      .get(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});

describe("Admin subscriber/event browser", () => {
  it("lists every subscriber account with role and event count", async () => {
    const { user: admin, token: adminToken } = await registerAndLoginAsAdmin(app);
    const { user: planner, token: plannerToken } = await registerAndLogin(app);
    await createEventWithToken(plannerToken);

    const res = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const emails = res.body.data.users.map((u: { email: string }) => u.email);
    expect(emails).toEqual(expect.arrayContaining([admin.email, planner.email]));
    const adminRow = res.body.data.users.find((u: { email: string }) => u.email === admin.email);
    expect(adminRow.role).toBe("ADMIN");
    const plannerRow = res.body.data.users.find((u: { email: string }) => u.email === planner.email);
    expect(plannerRow.role).toBe("PLANNER");
    expect(plannerRow.eventCount).toBe(1);
  });

  it("lists every event across all subscribers with owner info", async () => {
    const { token: adminToken } = await registerAndLoginAsAdmin(app);
    const { token: plannerToken, user: planner } = await registerAndLogin(app);
    await createEventWithToken(plannerToken, "Priya's Wedding");

    const res = await request(app).get("/api/admin/events").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.events).toHaveLength(1);
    expect(res.body.data.events[0].name).toBe("Priya's Wedding");
    expect(res.body.data.events[0].owner.email).toBe(planner.email);
  });
});

describe("Admin drill-in to a subscriber's event", () => {
  it("lets an admin read and edit a subscriber's event they don't own", async () => {
    const { token: adminToken } = await registerAndLoginAsAdmin(app);
    const { token: plannerToken } = await registerAndLogin(app);
    const eventId = await createEventWithToken(plannerToken);
    const adminAuth = { Authorization: `Bearer ${adminToken}` };

    const read = await request(app).get(`/api/events/${eventId}`).set(adminAuth);
    expect(read.status).toBe(200);

    const addGuest = await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set(adminAuth)
      .send({ firstName: "Support", lastName: "Added" });
    expect(addGuest.status).toBe(201);
  });

  it("records an audit log entry for the admin's mutation, visible via /api/admin/audit-log", async () => {
    const { token: adminToken, user: admin } = await registerAndLoginAsAdmin(app);
    const { token: plannerToken } = await registerAndLogin(app);
    const eventId = await createEventWithToken(plannerToken, "Audited Event");
    const adminAuth = { Authorization: `Bearer ${adminToken}` };

    await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set(adminAuth)
      .send({ firstName: "Support", lastName: "Added" });

    const log = await request(app).get("/api/admin/audit-log").set(adminAuth);
    expect(log.status).toBe(200);
    expect(log.body.data.entries).toHaveLength(1);
    expect(log.body.data.entries[0].adminEmail).toBe(admin.email);
    expect(log.body.data.entries[0].eventName).toBe("Audited Event");
    expect(log.body.data.entries[0].summary).toBe("Created guest");
  });

  it("does not log a planner acting on their own event as an admin action", async () => {
    const { token: adminToken } = await registerAndLoginAsAdmin(app);
    const eventId = await createEventWithToken(adminToken, "Admin's Own Event");
    const adminAuth = { Authorization: `Bearer ${adminToken}` };

    await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set(adminAuth)
      .send({ firstName: "Self", lastName: "Service" });

    const log = await request(app).get("/api/admin/audit-log").set(adminAuth);
    expect(log.body.data.entries).toHaveLength(0);
  });

  it("blocks an admin from deleting a subscriber's event (blocklist)", async () => {
    const { token: adminToken } = await registerAndLoginAsAdmin(app);
    const { token: plannerToken } = await registerAndLogin(app);
    const eventId = await createEventWithToken(plannerToken);

    const del = await request(app)
      .delete(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(del.status).toBe(404);

    // Confirm it's actually still there for the owner.
    const stillThere = await request(app)
      .get(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${plannerToken}`);
    expect(stillThere.status).toBe(200);
  });

  it("blocks an admin from connecting a subscriber's Stripe payout account (blocklist)", async () => {
    const { token: adminToken } = await registerAndLoginAsAdmin(app);
    const { token: plannerToken } = await registerAndLogin(app);
    const eventId = await createEventWithToken(plannerToken);

    const res = await request(app)
      .post(`/api/events/${eventId}/payouts/stripe/connect`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ currency: "USD" });
    expect(res.status).toBe(404);
  });
});

describe("Admin payment event logs", () => {
  it("lists payment attempts (success and failure) for dispute evidence, filterable by status", async () => {
    const { token: adminToken } = await registerAndLoginAsAdmin(app);
    const { token: plannerToken } = await registerAndLogin(app);
    const eventId = await createEventWithToken(plannerToken, "Paid Event");

    await prisma.paymentEvent.create({
      data: {
        eventId,
        provider: "STRIPE_CONNECT",
        type: "checkout.session.completed",
        status: "SUCCESS",
        amountCents: 5000,
        currency: "USD",
        rawPayload: "{}",
      },
    });
    await prisma.paymentEvent.create({
      data: {
        eventId,
        provider: "PAYSTACK",
        type: "charge.failed",
        status: "FAILED",
        message: "Insufficient funds",
        rawPayload: "{}",
      },
    });

    const all = await request(app).get("/api/admin/payment-events").set("Authorization", `Bearer ${adminToken}`);
    expect(all.status).toBe(200);
    expect(all.body.data.entries).toHaveLength(2);

    const failedOnly = await request(app)
      .get("/api/admin/payment-events?status=FAILED")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(failedOnly.body.data.entries).toHaveLength(1);
    expect(failedOnly.body.data.entries[0].message).toBe("Insufficient funds");
    expect(failedOnly.body.data.entries[0].eventName).toBe("Paid Event");
  });
});
