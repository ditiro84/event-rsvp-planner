import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestApp, resetDatabase } from "../helpers/testApp";
import { registerAndLogin } from "../helpers/authHelpers";

const app = buildTestApp();

beforeEach(async () => {
  await resetDatabase();
});

async function createEvent(token: string) {
  const res = await request(app)
    .post("/api/events")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Test Gala", date: "2026-11-01" });
  return res.body.data.event as { id: string; rsvpToken: string };
}

describe("Notifications", () => {
  it("notifies the planner when a guest confirms via the public RSVP link", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/rsvp/${event.rsvpToken}`).send({
      firstName: "Sarah",
      lastName: "Johnson",
      attending: "CONFIRMED",
      additionalGuestsCount: 0,
      additionalGuestNames: [],
    });

    const res = await request(app).get("/api/notifications").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(1);
    expect(res.body.data.notifications[0].type).toBe("RSVP_CONFIRMED");
    expect(res.body.data.notifications[0].title).toMatch(/Sarah Johnson/);
    expect(res.body.data.unreadCount).toBe(1);
  });

  it("notifies the planner when a guest declines", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/rsvp/${event.rsvpToken}`).send({
      firstName: "Michael",
      lastName: "Lee",
      attending: "DECLINED",
      additionalGuestsCount: 0,
      additionalGuestNames: [],
    });

    const res = await request(app).get("/api/notifications").set(auth);
    expect(res.body.data.notifications[0].type).toBe("RSVP_DECLINED");
  });

  it("does not notify for a PENDING or MAYBE response", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/rsvp/${event.rsvpToken}`).send({
      firstName: "Ana",
      lastName: "Ruiz",
      attending: "MAYBE",
      additionalGuestsCount: 0,
      additionalGuestNames: [],
    });

    const res = await request(app).get("/api/notifications").set(auth);
    expect(res.body.data.notifications).toHaveLength(0);
  });

  it("marks a single notification as read", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/rsvp/${event.rsvpToken}`).send({
      firstName: "Sarah",
      lastName: "Johnson",
      attending: "CONFIRMED",
      additionalGuestsCount: 0,
      additionalGuestNames: [],
    });

    const list = await request(app).get("/api/notifications").set(auth);
    const notificationId = list.body.data.notifications[0].id;

    const res = await request(app).put(`/api/notifications/${notificationId}/read`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.notification.read).toBe(true);

    const after = await request(app).get("/api/notifications").set(auth);
    expect(after.body.data.unreadCount).toBe(0);
  });

  it("marks all notifications as read", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/rsvp/${event.rsvpToken}`).send({
      firstName: "Sarah",
      lastName: "Johnson",
      attending: "CONFIRMED",
      additionalGuestsCount: 0,
      additionalGuestNames: [],
    });
    await request(app).post(`/api/rsvp/${event.rsvpToken}`).send({
      firstName: "Michael",
      lastName: "Lee",
      attending: "DECLINED",
      additionalGuestsCount: 0,
      additionalGuestNames: [],
    });

    const res = await request(app).put("/api/notifications/read-all").set(auth);
    expect(res.status).toBe(204);

    const after = await request(app).get("/api/notifications").set(auth);
    expect(after.body.data.unreadCount).toBe(0);
  });

  it("supports filtering to unread only", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/rsvp/${event.rsvpToken}`).send({
      firstName: "Sarah",
      lastName: "Johnson",
      attending: "CONFIRMED",
      additionalGuestsCount: 0,
      additionalGuestNames: [],
    });
    const list = await request(app).get("/api/notifications").set(auth);
    await request(app).put(`/api/notifications/${list.body.data.notifications[0].id}/read`).set(auth);

    const res = await request(app).get("/api/notifications?unreadOnly=true").set(auth);
    expect(res.body.data.notifications).toHaveLength(0);
  });

  it("rejects marking another planner's notification as read", async () => {
    const { token } = await registerAndLogin(app);
    const planner2 = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/rsvp/${event.rsvpToken}`).send({
      firstName: "Sarah",
      lastName: "Johnson",
      attending: "CONFIRMED",
      additionalGuestsCount: 0,
      additionalGuestNames: [],
    });
    const list = await request(app).get("/api/notifications").set(auth);
    const notificationId = list.body.data.notifications[0].id;

    const res = await request(app)
      .put(`/api/notifications/${notificationId}/read`)
      .set("Authorization", `Bearer ${planner2.token}`);
    expect(res.status).toBe(404);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(401);
  });
});
