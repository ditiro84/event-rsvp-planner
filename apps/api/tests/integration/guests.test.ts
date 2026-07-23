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

describe("Guests API", () => {
  it("adds a guest to an event", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);

    const res = await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Sarah", lastName: "Johnson", email: "sarah@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.data.guest.rsvpStatus).toBe("PENDING");
  });

  it("lists, filters and searches guests", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${eventId}/guests`).set(auth).send({ firstName: "Sarah", lastName: "Johnson", isVip: true });
    await request(app).post(`/api/events/${eventId}/guests`).set(auth).send({ firstName: "Mike", lastName: "Smith" });

    const all = await request(app).get(`/api/events/${eventId}/guests`).set(auth);
    expect(all.body.data.guests).toHaveLength(2);

    const vipOnly = await request(app).get(`/api/events/${eventId}/guests?vip=true`).set(auth);
    expect(vipOnly.body.data.guests).toHaveLength(1);
    expect(vipOnly.body.data.guests[0].firstName).toBe("Sarah");

    const searched = await request(app).get(`/api/events/${eventId}/guests?search=smith`).set(auth);
    expect(searched.body.data.guests).toHaveLength(1);
    expect(searched.body.data.guests[0].lastName).toBe("Smith");
  });

  it("updates a guest via the top-level /api/guests/:guestId route", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app).post(`/api/events/${eventId}/guests`).set(auth).send({ firstName: "Sarah", lastName: "Johnson" });
    const guestId = created.body.data.guest.id;

    const res = await request(app).put(`/api/guests/${guestId}`).set(auth).send({ isVip: true, rsvpStatus: "CONFIRMED" });
    expect(res.status).toBe(200);
    expect(res.body.data.guest.isVip).toBe(true);
    expect(res.body.data.guest.rsvpStatus).toBe("CONFIRMED");
  });

  it("deletes a guest", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app).post(`/api/events/${eventId}/guests`).set(auth).send({ firstName: "Sarah", lastName: "Johnson" });
    const guestId = created.body.data.guest.id;

    const del = await request(app).delete(`/api/guests/${guestId}`).set(auth);
    expect(del.status).toBe(204);

    const list = await request(app).get(`/api/events/${eventId}/guests`).set(auth);
    expect(list.body.data.guests).toHaveLength(0);
  });

  it("prevents a user from modifying another user's guest", async () => {
    const planner1 = await registerAndLogin(app);
    const planner2 = await registerAndLogin(app);
    const eventId = await createEventWithToken(planner1.token);

    const created = await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set("Authorization", `Bearer ${planner1.token}`)
      .send({ firstName: "Sarah", lastName: "Johnson" });
    const guestId = created.body.data.guest.id;

    const res = await request(app)
      .put(`/api/guests/${guestId}`)
      .set("Authorization", `Bearer ${planner2.token}`)
      .send({ isVip: true });
    expect(res.status).toBe(404);
  });

  it("imports guests from a CSV file", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const csv = "firstName,lastName,email\nJohn,Doe,john@example.com\nJane,Doe,jane@example.com\n";

    const res = await request(app)
      .post(`/api/events/${eventId}/guests/import`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(csv), "guests.csv");

    expect(res.status).toBe(201);
    expect(res.body.data.imported).toBe(2);
  });

  it("exports guests to CSV", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Sarah", lastName: "Johnson" });

    const res = await request(app)
      .get(`/api/events/${eventId}/guests/export`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("Sarah");
  });

  it("exports guests to a PDF document", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Sarah", lastName: "Johnson", additionalGuestNames: ["Plus One"] });

    const res = await request(app)
      .get(`/api/events/${eventId}/guests/export/pdf`)
      .set("Authorization", `Bearer ${token}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    // PDF magic bytes.
    expect((res.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");
  });
});

describe("Guests API: check-in", () => {
  it("checks a guest in and back out", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set(auth)
      .send({ firstName: "Sarah", lastName: "Johnson", rsvpStatus: "CONFIRMED" });
    const guestId = created.body.data.guest.id;

    const checkInRes = await request(app).post(`/api/events/${eventId}/guests/${guestId}/checkin`).set(auth);
    expect(checkInRes.status).toBe(200);
    expect(checkInRes.body.data.guest.checkedIn).toBe(true);
    expect(checkInRes.body.data.guest.checkedInAt).toBeTruthy();

    const listRes = await request(app).get(`/api/events/${eventId}/guests`).set(auth).query({ checkedIn: "true" });
    expect(listRes.body.data.guests.map((g: any) => g.id)).toContain(guestId);

    const checkOutRes = await request(app).delete(`/api/events/${eventId}/guests/${guestId}/checkin`).set(auth);
    expect(checkOutRes.status).toBe(200);
    expect(checkOutRes.body.data.guest.checkedIn).toBe(false);
    expect(checkOutRes.body.data.guest.checkedInAt).toBeFalsy();
  });

  it("reflects checked-in count on the event dashboard", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set(auth)
      .send({ firstName: "Sarah", lastName: "Johnson", rsvpStatus: "CONFIRMED" });
    const guestId = created.body.data.guest.id;
    await request(app).post(`/api/events/${eventId}/guests/${guestId}/checkin`).set(auth);

    const dashRes = await request(app).get(`/api/events/${eventId}/dashboard`).set(auth);
    expect(dashRes.body.data.stats.checkedIn).toBe(1);
  });

  it("rejects checking in a guest from another planner's event", async () => {
    const { token } = await registerAndLogin(app);
    const planner2 = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set(auth)
      .send({ firstName: "Sarah", lastName: "Johnson", rsvpStatus: "CONFIRMED" });
    const guestId = created.body.data.guest.id;

    const res = await request(app)
      .post(`/api/events/${eventId}/guests/${guestId}/checkin`)
      .set("Authorization", `Bearer ${planner2.token}`);
    expect(res.status).toBe(404);
  });
});

describe("Guests API: invites", () => {
  it("generates a stable personalized invite link and QR code", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set(auth)
      .send({ firstName: "Sarah", lastName: "Johnson" });
    const guestId = created.body.data.guest.id;

    const first = await request(app).get(`/api/events/${eventId}/guests/${guestId}/invite`).set(auth);
    expect(first.status).toBe(200);
    expect(first.body.data.url).toContain("/rsvp/invite/");
    expect(first.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(first.body.data.sentAt).toBeFalsy();

    // Calling it again returns the same link (stable token), not a new one.
    const second = await request(app).get(`/api/events/${eventId}/guests/${guestId}/invite`).set(auth);
    expect(second.body.data.url).toBe(first.body.data.url);
  });

  it("records that an invite was sent via WhatsApp (tap-to-send flow)", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set(auth)
      .send({ firstName: "Sarah", lastName: "Johnson", phone: "+15551234567" });
    const guestId = created.body.data.guest.id;

    const res = await request(app)
      .post(`/api/events/${eventId}/guests/${guestId}/invite/mark-sent`)
      .set(auth)
      .send({ channel: "whatsapp" });
    expect(res.status).toBe(200);
    expect(res.body.data.invitation.channel).toBe("whatsapp");
    expect(res.body.data.invitation.sentAt).toBeTruthy();

    const linkRes = await request(app).get(`/api/events/${eventId}/guests/${guestId}/invite`).set(auth);
    expect(linkRes.body.data.channel).toBe("whatsapp");
  });

  it("returns a clear error sending an invite email when Resend isn't configured", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set(auth)
      .send({ firstName: "Sarah", lastName: "Johnson", email: "sarah@example.com" });
    const guestId = created.body.data.guest.id;

    const res = await request(app).post(`/api/events/${eventId}/guests/${guestId}/invite/email`).set(auth);
    // In CI/test, RESEND_API_KEY is intentionally unset -- this should fail
    // with a clear, actionable message rather than crashing.
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/isn't configured/i);
  });

  it("rejects fetching another planner's guest invite link", async () => {
    const { token } = await registerAndLogin(app);
    const planner2 = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set(auth)
      .send({ firstName: "Sarah", lastName: "Johnson" });
    const guestId = created.body.data.guest.id;

    const res = await request(app)
      .get(`/api/events/${eventId}/guests/${guestId}/invite`)
      .set("Authorization", `Bearer ${planner2.token}`);
    expect(res.status).toBe(404);
  });
});
