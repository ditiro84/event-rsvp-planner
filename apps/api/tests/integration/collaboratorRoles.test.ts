import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestApp, resetDatabase } from "../helpers/testApp";
import { registerAndLogin } from "../helpers/authHelpers";

const app = buildTestApp();

beforeEach(async () => {
  await resetDatabase();
});

type Role = "COORDINATOR" | "CATERER" | "DOOR_STAFF" | "VIEWER";

// Owner creates an event with one guest, then invites an already-registered
// account under the given role.
async function setup(role: Role) {
  const owner = await registerAndLogin(app, { email: `owner-${role}@example.com` });
  const member = await registerAndLogin(app, { email: `member-${role}@example.com` });
  const ownerAuth = { Authorization: `Bearer ${owner.token}` };
  const memberAuth = { Authorization: `Bearer ${member.token}` };

  const ev = await request(app).post("/api/events").set(ownerAuth).send({ name: "Gala", date: "2026-12-01" });
  const eventId = ev.body.data.event.id as string;

  const guest = await request(app)
    .post(`/api/events/${eventId}/guests`)
    .set(ownerAuth)
    .send({ firstName: "Ada", lastName: "Obi", email: "ada@example.com", phone: "+2348000000000" });
  const guestId = guest.body.data.guest.id as string;

  const invite = await request(app)
    .post(`/api/events/${eventId}/collaborators`)
    .set(ownerAuth)
    .send({ email: member.user.email, role });
  expect(invite.status).toBe(201);

  return { eventId, guestId, ownerAuth, memberAuth };
}

describe("Collaborator roles", () => {
  it("defaults an invite with no role to coordinator, which keeps full day-to-day access", async () => {
    const owner = await registerAndLogin(app);
    const member = await registerAndLogin(app);
    const ownerAuth = { Authorization: `Bearer ${owner.token}` };
    const ev = await request(app).post("/api/events").set(ownerAuth).send({ name: "Party", date: "2026-12-01" });
    const eventId = ev.body.data.event.id as string;

    const invite = await request(app)
      .post(`/api/events/${eventId}/collaborators`)
      .set(ownerAuth)
      .send({ email: member.user.email });
    expect(invite.status).toBe(201);
    expect(invite.body.data.collaborator.role).toBe("COORDINATOR");

    const memberAuth = { Authorization: `Bearer ${member.token}` };
    expect((await request(app).get(`/api/events/${eventId}/vendors`).set(memberAuth)).status).toBe(200);
    expect((await request(app).get(`/api/events/${eventId}/guests`).set(memberAuth)).status).toBe(200);
  });

  it("never lets a collaborator reach payouts or team management, whatever the role", async () => {
    const { eventId, memberAuth } = await setup("COORDINATOR");
    expect((await request(app).get(`/api/events/${eventId}/payouts`).set(memberAuth)).status).toBe(403);
    expect((await request(app).get(`/api/events/${eventId}/collaborators`).set(memberAuth)).status).toBe(403);
    expect((await request(app).delete(`/api/events/${eventId}`).set(memberAuth)).status).toBe(403);
  });

  it("caterer sees guests without contact details and seating, but no money or invites", async () => {
    const { eventId, guestId, memberAuth } = await setup("CATERER");

    const list = await request(app).get(`/api/events/${eventId}/guests`).set(memberAuth);
    expect(list.status).toBe(200);
    expect(list.body.data.guests[0].firstName).toBe("Ada");
    expect(list.body.data.guests[0].email).toBeNull();
    expect(list.body.data.guests[0].phone).toBeNull();

    expect((await request(app).get(`/api/events/${eventId}/seating/map`).set(memberAuth)).status).toBe(200);
    expect((await request(app).get(`/api/events/${eventId}/vendors`).set(memberAuth)).status).toBe(403);
    expect((await request(app).get(`/api/events/${eventId}/orders`).set(memberAuth)).status).toBe(403);
    expect((await request(app).get(`/api/events/${eventId}/guests/export`).set(memberAuth)).status).toBe(403);
    expect((await request(app).get(`/api/events/${eventId}/guests/${guestId}/invite`).set(memberAuth)).status).toBe(403);
    expect(
      (await request(app).post(`/api/events/${eventId}/guests`).set(memberAuth).send({ firstName: "X", lastName: "Y" })).status
    ).toBe(403);
  });

  it("door staff can check a guest in (with contact details hidden) but not edit anything", async () => {
    const { eventId, guestId, memberAuth, ownerAuth } = await setup("DOOR_STAFF");

    const checkIn = await request(app).post(`/api/events/${eventId}/guests/${guestId}/checkin`).set(memberAuth);
    expect(checkIn.status).toBe(200);
    expect(checkIn.body.data.guest.checkedIn).toBe(true);
    expect(checkIn.body.data.guest.email).toBeNull();

    const ownerView = await request(app).get(`/api/events/${eventId}/guests`).set(ownerAuth);
    expect(ownerView.body.data.guests[0].email).toBe("ada@example.com");

    expect(
      (await request(app).post(`/api/events/${eventId}/guests`).set(memberAuth).send({ firstName: "X", lastName: "Y" })).status
    ).toBe(403);
    expect((await request(app).get(`/api/events/${eventId}/seating/map`).set(memberAuth)).status).toBe(403);
  });

  it("viewer can read guests, RSVPs and seating but cannot change or see money", async () => {
    const { eventId, guestId, memberAuth } = await setup("VIEWER");

    expect((await request(app).get(`/api/events/${eventId}/guests`).set(memberAuth)).status).toBe(200);
    expect((await request(app).get(`/api/events/${eventId}/rsvp`).set(memberAuth)).status).toBe(200);
    expect((await request(app).get(`/api/events/${eventId}/seating/map`).set(memberAuth)).status).toBe(200);

    expect((await request(app).post(`/api/events/${eventId}/guests/${guestId}/checkin`).set(memberAuth)).status).toBe(403);
    expect((await request(app).put(`/api/events/${eventId}`).set(memberAuth).send({ name: "Renamed" })).status).toBe(403);
    expect((await request(app).get(`/api/events/${eventId}/vendors`).set(memberAuth)).status).toBe(403);
    expect((await request(app).get(`/api/events/${eventId}/ticket-types`).set(memberAuth)).status).toBe(403);
  });

  it("returns the role and capabilities on the event so the app can adapt", async () => {
    const { eventId, memberAuth } = await setup("CATERER");
    const res = await request(app).get(`/api/events/${eventId}`).set(memberAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.event.isCollaborator).toBe(true);
    expect(res.body.data.event.collaboratorRole).toBe("CATERER");
    expect(res.body.data.event.capabilities).toContain("seating:read");
    expect(res.body.data.event.capabilities).not.toContain("vendors:read");
  });

  it("lets the owner change a collaborator's role, and the change applies immediately", async () => {
    const { eventId, ownerAuth, memberAuth } = await setup("VIEWER");
    expect((await request(app).get(`/api/events/${eventId}/vendors`).set(memberAuth)).status).toBe(403);

    const list = await request(app).get(`/api/events/${eventId}/collaborators`).set(ownerAuth);
    const collaboratorId = list.body.data.collaborators[0].id as string;

    const update = await request(app)
      .put(`/api/events/${eventId}/collaborators/${collaboratorId}`)
      .set(ownerAuth)
      .send({ role: "COORDINATOR" });
    expect(update.status).toBe(200);
    expect(update.body.data.collaborator.role).toBe("COORDINATOR");
    expect((await request(app).get(`/api/events/${eventId}/vendors`).set(memberAuth)).status).toBe(200);
  });

  it("applies the invited role when a not-yet-registered person signs up", async () => {
    const owner = await registerAndLogin(app);
    const ownerAuth = { Authorization: `Bearer ${owner.token}` };
    const ev = await request(app).post("/api/events").set(ownerAuth).send({ name: "Gala", date: "2026-12-01" });
    const eventId = ev.body.data.event.id as string;

    const invite = await request(app)
      .post(`/api/events/${eventId}/collaborators`)
      .set(ownerAuth)
      .send({ email: "newcaterer@example.com", role: "CATERER" });
    expect(invite.status).toBe(201);
    expect(invite.body.data.pendingInvite.role).toBe("CATERER");

    const member = await registerAndLogin(app, { email: "newcaterer@example.com" });
    const res = await request(app).get(`/api/events/${eventId}`).set({ Authorization: `Bearer ${member.token}` });
    expect(res.body.data.event.collaboratorRole).toBe("CATERER");
  });

  it("rejects an invalid role", async () => {
    const owner = await registerAndLogin(app);
    const ownerAuth = { Authorization: `Bearer ${owner.token}` };
    const ev = await request(app).post("/api/events").set(ownerAuth).send({ name: "Gala", date: "2026-12-01" });
    const res = await request(app)
      .post(`/api/events/${ev.body.data.event.id}/collaborators`)
      .set(ownerAuth)
      .send({ email: "x@example.com", role: "OWNER" });
    expect(res.status).toBe(400);
  });
});
