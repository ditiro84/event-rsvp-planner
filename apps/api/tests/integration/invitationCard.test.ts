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

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

describe("Invitation card API", () => {
  it("has no card by default", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app).get(`/api/events/${eventId}/invitation-card`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.card).toBeNull();
  });

  it("uploads, retrieves, and downloads a PNG invitation card", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const uploadRes = await request(app)
      .post(`/api/events/${eventId}/invitation-card`)
      .set(auth)
      .attach("file", PNG_BYTES, "card.png");

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.data.card.fileName).toBe("card.png");
    expect(uploadRes.body.data.card.mimeType).toBe("image/png");
    expect(uploadRes.body.data.card.size).toBe(PNG_BYTES.length);

    const metaRes = await request(app).get(`/api/events/${eventId}/invitation-card`).set(auth);
    expect(metaRes.body.data.card.fileName).toBe("card.png");

    const fileRes = await request(app).get(`/api/events/${eventId}/invitation-card/file`).set(auth).buffer(true);
    expect(fileRes.status).toBe(200);
    expect(fileRes.headers["content-type"]).toContain("image/png");
    expect(Buffer.compare(fileRes.body, PNG_BYTES)).toBe(0);
  });

  it("replaces an existing card on re-upload", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${eventId}/invitation-card`).set(auth).attach("file", PNG_BYTES, "first.png");
    const second = await request(app)
      .post(`/api/events/${eventId}/invitation-card`)
      .set(auth)
      .attach("file", PNG_BYTES, "second.png");

    expect(second.status).toBe(200);

    const metaRes = await request(app).get(`/api/events/${eventId}/invitation-card`).set(auth);
    expect(metaRes.body.data.card.fileName).toBe("second.png");
  });

  it("rejects a disallowed file type", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app)
      .post(`/api/events/${eventId}/invitation-card`)
      .set(auth)
      .attach("file", Buffer.from("not a real card"), { filename: "card.txt", contentType: "text/plain" });

    expect(res.status).toBe(400);
  });

  it("deletes an invitation card", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${eventId}/invitation-card`).set(auth).attach("file", PNG_BYTES, "card.png");
    const del = await request(app).delete(`/api/events/${eventId}/invitation-card`).set(auth);
    expect(del.status).toBe(204);

    const metaRes = await request(app).get(`/api/events/${eventId}/invitation-card`).set(auth);
    expect(metaRes.body.data.card).toBeNull();
  });

  it("prevents another planner from uploading, viewing, or deleting a card on someone else's event", async () => {
    const owner = await registerAndLogin(app);
    const other = await registerAndLogin(app);
    const eventId = await createEventWithToken(owner.token);
    const otherAuth = { Authorization: `Bearer ${other.token}` };

    const upload = await request(app)
      .post(`/api/events/${eventId}/invitation-card`)
      .set(otherAuth)
      .attach("file", PNG_BYTES, "card.png");
    expect(upload.status).toBe(404);

    const meta = await request(app).get(`/api/events/${eventId}/invitation-card`).set(otherAuth);
    expect(meta.status).toBe(404);

    const del = await request(app).delete(`/api/events/${eventId}/invitation-card`).set(otherAuth);
    expect(del.status).toBe(404);
  });

  it("serves the card publicly via the event's RSVP token, and flags hasInvitationCard on the public event", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const eventRes = await request(app).get(`/api/events/${eventId}`).set(auth);
    const rsvpToken = eventRes.body.data.event.rsvpToken as string;

    const beforeUpload = await request(app).get(`/api/rsvp/${rsvpToken}`);
    expect(beforeUpload.body.data.event.hasInvitationCard).toBe(false);

    await request(app).post(`/api/events/${eventId}/invitation-card`).set(auth).attach("file", PNG_BYTES, "card.png");

    const afterUpload = await request(app).get(`/api/rsvp/${rsvpToken}`);
    expect(afterUpload.body.data.event.hasInvitationCard).toBe(true);

    const fileRes = await request(app).get(`/api/rsvp/${rsvpToken}/invitation-card`).buffer(true);
    expect(fileRes.status).toBe(200);
    expect(fileRes.headers["content-type"]).toContain("image/png");
    expect(Buffer.compare(fileRes.body, PNG_BYTES)).toBe(0);
  });

  it("serves the card publicly via a personalized invitation token, and flags it on the invite link + prefill", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const guestRes = await request(app)
      .post(`/api/events/${eventId}/guests`)
      .set(auth)
      .send({ firstName: "Sarah", lastName: "Johnson", email: "sarah@example.com" });
    const guestId = guestRes.body.data.guest.id as string;

    const linkBefore = await request(app).get(`/api/events/${eventId}/guests/${guestId}/invite`).set(auth);
    expect(linkBefore.body.data.hasInvitationCard).toBe(false);
    const invitationToken = (linkBefore.body.data.url as string).split("/rsvp/invite/")[1];

    await request(app).post(`/api/events/${eventId}/invitation-card`).set(auth).attach("file", PNG_BYTES, "card.png");

    const linkAfter = await request(app).get(`/api/events/${eventId}/guests/${guestId}/invite`).set(auth);
    expect(linkAfter.body.data.hasInvitationCard).toBe(true);

    const prefillRes = await request(app).get(`/api/rsvp/invite/${invitationToken}`);
    expect(prefillRes.body.data.event.hasInvitationCard).toBe(true);

    const fileRes = await request(app).get(`/api/rsvp/invite/${invitationToken}/invitation-card`).buffer(true);
    expect(fileRes.status).toBe(200);
    expect(Buffer.compare(fileRes.body, PNG_BYTES)).toBe(0);
  });

  it("returns 404 for a card request on an event with no card uploaded", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const eventRes = await request(app).get(`/api/events/${eventId}`).set(auth);
    const rsvpToken = eventRes.body.data.event.rsvpToken as string;

    const res = await request(app).get(`/api/rsvp/${rsvpToken}/invitation-card`);
    expect(res.status).toBe(404);
  });
});
