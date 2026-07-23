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

describe("Public RSVP flow", () => {
  it("returns public event details for a valid token without exposing guest data", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);

    const res = await request(app).get(`/api/rsvp/${event.rsvpToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.event.name).toBe("Test Gala");
    expect(res.body.data.event.rsvpOpen).toBe(true);
    // Must not leak internal fields like the owning userId
    expect(res.body.data.event.userId).toBeUndefined();
  });

  it("returns 404 for an invalid token", async () => {
    const res = await request(app).get("/api/rsvp/not-a-real-token");
    expect(res.status).toBe(404);
  });

  it("creates a new guest record when an un-invited guest submits an RSVP (open invite)", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);

    const res = await request(app).post(`/api/rsvp/${event.rsvpToken}`).send({
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah@example.com",
      attending: "CONFIRMED",
      additionalGuestsCount: 1,
      additionalGuestNames: ["Michael Johnson"],
      mealPreference: "Vegetarian",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.guest.rsvpStatus).toBe("CONFIRMED");

    const dashboard = await request(app)
      .get(`/api/events/${event.id}/dashboard`)
      .set("Authorization", `Bearer ${token}`);
    expect(dashboard.body.data.stats.confirmed).toBe(1);
    expect(dashboard.body.data.stats.totalGuests).toBe(1);
  });

  it("updates an existing invited guest's RSVP status by matching email", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);

    const invited = await request(app)
      .post(`/api/events/${event.id}/guests`)
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Sarah", lastName: "Johnson", email: "sarah@example.com" });
    const guestId = invited.body.data.guest.id;

    await request(app).post(`/api/rsvp/${event.rsvpToken}`).send({
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah@example.com",
      attending: "DECLINED",
    });

    const check = await request(app)
      .get(`/api/guests/${guestId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(check.body.data.guest.rsvpStatus).toBe("DECLINED");

    // No duplicate guest should have been created
    const list = await request(app)
      .get(`/api/events/${event.id}/guests`)
      .set("Authorization", `Bearer ${token}`);
    expect(list.body.data.guests).toHaveLength(1);
  });

  it("rejects submissions once RSVPs are closed", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);

    await request(app)
      .put(`/api/events/${event.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ rsvpOpen: false });

    const res = await request(app).post(`/api/rsvp/${event.rsvpToken}`).send({
      firstName: "Late",
      lastName: "Guest",
      attending: "CONFIRMED",
    });

    expect(res.status).toBe(400);
  });

  it("validates that accompanying guest names cannot exceed the declared count", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);

    const res = await request(app).post(`/api/rsvp/${event.rsvpToken}`).send({
      firstName: "Sarah",
      lastName: "Johnson",
      attending: "CONFIRMED",
      additionalGuestsCount: 0,
      additionalGuestNames: ["Someone Extra"],
    });

    expect(res.status).toBe(400);
  });

  it("shows non-responders in the planner RSVP dashboard", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${event.id}/guests`).set(auth).send({ firstName: "Not", lastName: "Responded" });

    const res = await request(app).get(`/api/events/${event.id}/rsvp`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.nonResponders).toHaveLength(1);
    expect(res.body.data.stats.pending).toBe(1);
  });
});

describe("Personalized invite RSVP flow", () => {
  it("prefills guest details from a personalized invitation token", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    const guest = await request(app)
      .post(`/api/events/${event.id}/guests`)
      .set(auth)
      .send({ firstName: "Sarah", lastName: "Johnson", email: "sarah@example.com" });
    const guestId = guest.body.data.guest.id;

    const linkRes = await request(app).get(`/api/events/${event.id}/guests/${guestId}/invite`).set(auth);
    expect(linkRes.status).toBe(200);
    expect(linkRes.body.data.url).toContain("/rsvp/invite/");
    expect(linkRes.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    const invitationToken = linkRes.body.data.url.split("/rsvp/invite/")[1];

    const prefillRes = await request(app).get(`/api/rsvp/invite/${invitationToken}`);
    expect(prefillRes.status).toBe(200);
    expect(prefillRes.body.data.event.name).toBe("Test Gala");
    expect(prefillRes.body.data.guestPrefill).toEqual({
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah@example.com",
      phone: null,
    });
  });

  it("submits an RSVP via invitation token directly against the known guest, without name/email matching", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    const guest = await request(app)
      .post(`/api/events/${event.id}/guests`)
      .set(auth)
      .send({ firstName: "Sarah", lastName: "Johnson" });
    const guestId = guest.body.data.guest.id;

    const linkRes = await request(app).get(`/api/events/${event.id}/guests/${guestId}/invite`).set(auth);
    const invitationToken = linkRes.body.data.url.split("/rsvp/invite/")[1];

    const submitRes = await request(app).post(`/api/rsvp/invite/${invitationToken}`).send({
      firstName: "Sarah",
      lastName: "Johnson-Smith",
      attending: "CONFIRMED",
      additionalGuestsCount: 1,
      additionalGuestNames: ["Plus One"],
    });
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.guest.id).toBe(guestId);

    const guestsRes = await request(app).get(`/api/events/${event.id}/guests`).set(auth);
    expect(guestsRes.body.data.guests).toHaveLength(1);
    expect(guestsRes.body.data.guests[0].lastName).toBe("Johnson-Smith");
    expect(guestsRes.body.data.guests[0].rsvpStatus).toBe("CONFIRMED");
  });

  it("returns 404 for an invalid invitation token", async () => {
    const res = await request(app).get("/api/rsvp/invite/not-a-real-token");
    expect(res.status).toBe(404);
  });

  it("rejects an invite-token submission once RSVPs are closed", async () => {
    const { token } = await registerAndLogin(app);
    const event = await createEvent(token);
    const auth = { Authorization: `Bearer ${token}` };

    const guest = await request(app)
      .post(`/api/events/${event.id}/guests`)
      .set(auth)
      .send({ firstName: "Sarah", lastName: "Johnson" });
    const guestId = guest.body.data.guest.id;
    const linkRes = await request(app).get(`/api/events/${event.id}/guests/${guestId}/invite`).set(auth);
    const invitationToken = linkRes.body.data.url.split("/rsvp/invite/")[1];

    await request(app).put(`/api/events/${event.id}`).set(auth).send({ rsvpOpen: false });

    const res = await request(app)
      .post(`/api/rsvp/invite/${invitationToken}`)
      .send({ firstName: "Sarah", lastName: "Johnson", attending: "CONFIRMED" });
    expect(res.status).toBe(400);
  });
});
