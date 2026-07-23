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

async function createConfirmedGuest(app: any, token: string, eventId: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post(`/api/events/${eventId}/guests`)
    .set("Authorization", `Bearer ${token}`)
    .send({ firstName: "Guest", lastName: String(Math.random()).slice(2, 8), rsvpStatus: "CONFIRMED", ...overrides });
  return res.body.data.guest.id as string;
}

describe("Seating: venue layout", () => {
  it("auto-creates a default layout on first request", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);

    const res = await request(app)
      .get(`/api/events/${eventId}/seating/layout`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.layout.name).toBe("Main Layout");
    expect(res.body.data.layout.objects).toEqual([]);
  });

  it("updates canvas settings", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app)
      .put(`/api/events/${eventId}/seating/layout`)
      .set(auth)
      .send({ canvasWidth: 2000, backgroundColor: "#ffffff" });

    expect(res.status).toBe(200);
    expect(res.body.data.layout.canvasWidth).toBe(2000);
    expect(res.body.data.layout.backgroundColor).toBe("#ffffff");
  });

  it("creates, updates and deletes decor objects", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const createRes = await request(app)
      .post(`/api/events/${eventId}/seating/layout/objects`)
      .set(auth)
      .send({ type: "STAGE", label: "Main Stage", x: 10, y: 20, width: 200, height: 80 });
    expect(createRes.status).toBe(201);
    const objectId = createRes.body.data.object.id;

    const updateRes = await request(app)
      .put(`/api/events/${eventId}/seating/layout/objects/${objectId}`)
      .set(auth)
      .send({ x: 50 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.object.x).toBe(50);

    const deleteRes = await request(app)
      .delete(`/api/events/${eventId}/seating/layout/objects/${objectId}`)
      .set(auth);
    expect(deleteRes.status).toBe(204);
  });

  it("prevents a user from touching another user's layout objects (404)", async () => {
    const planner1 = await registerAndLogin(app);
    const planner2 = await registerAndLogin(app);
    const eventId = await createEventWithToken(planner1.token);

    const createRes = await request(app)
      .post(`/api/events/${eventId}/seating/layout/objects`)
      .set("Authorization", `Bearer ${planner1.token}`)
      .send({ type: "BAR" });
    const objectId = createRes.body.data.object.id;

    const res = await request(app)
      .put(`/api/events/${eventId}/seating/layout/objects/${objectId}`)
      .set("Authorization", `Bearer ${planner2.token}`)
      .send({ x: 999 });
    expect(res.status).toBe(404);
  });
});

describe("Seating: tables", () => {
  it("creates a table with auto-generated seats matching capacity", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);

    const res = await request(app)
      .post(`/api/events/${eventId}/seating/tables`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Table 1", shape: "ROUND", capacity: 8, x: 100, y: 100 });

    expect(res.status).toBe(201);
    expect(res.body.data.table.seats).toHaveLength(8);
    expect(res.body.data.table.seats.map((s: any) => s.seatNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("grows seats when capacity increases", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/seating/tables`)
      .set(auth)
      .send({ name: "Table 1", capacity: 4 });
    const tableId = created.body.data.table.id;

    const res = await request(app)
      .put(`/api/events/${eventId}/seating/tables/${tableId}`)
      .set(auth)
      .send({ capacity: 6 });

    expect(res.status).toBe(200);
    expect(res.body.data.table.seats).toHaveLength(6);
  });

  it("shrinks seats when capacity decreases and unassigns bumped guests", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/seating/tables`)
      .set(auth)
      .send({ name: "Table 1", capacity: 4 });
    const tableId = created.body.data.table.id;

    // Fill all 4 seats.
    const guestIds: string[] = [];
    for (let i = 0; i < 4; i++) {
      guestIds.push(await createConfirmedGuest(app, token, eventId));
    }
    for (const guestId of guestIds) {
      const r = await request(app).post(`/api/events/${eventId}/seating/assignments`).set(auth).send({ guestId, tableId });
      expect(r.status).toBe(201);
    }

    const res = await request(app)
      .put(`/api/events/${eventId}/seating/tables/${tableId}`)
      .set(auth)
      .send({ capacity: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.table.seats).toHaveLength(2);
    expect(res.body.data.unassignedGuestNames.length).toBe(2);

    const mapRes = await request(app).get(`/api/events/${eventId}/seating/map`).set(auth);
    expect(mapRes.body.data.unassignedGuests).toHaveLength(2);
  });

  it("deletes a table and its seats/assignments", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/seating/tables`)
      .set(auth)
      .send({ name: "Table 1", capacity: 2 });
    const tableId = created.body.data.table.id;

    const res = await request(app).delete(`/api/events/${eventId}/seating/tables/${tableId}`).set(auth);
    expect(res.status).toBe(204);

    const listRes = await request(app).get(`/api/events/${eventId}/seating/tables`).set(auth);
    expect(listRes.body.data.tables).toHaveLength(0);
  });
});

describe("Seating: guest assignments", () => {
  it("counts a guest's plus-ones toward table capacity, not just the primary guest", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const table = await request(app)
      .post(`/api/events/${eventId}/seating/tables`)
      .set(auth)
      .send({ name: "Table 1", capacity: 2 });
    const tableId = table.body.data.table.id;

    // A guest who brought one unnamed plus-one needs 2 of this table's 2 seats.
    const guestId = await createConfirmedGuest(app, token, eventId, { additionalGuestsCount: 1 });

    const res = await request(app)
      .post(`/api/events/${eventId}/seating/assignments`)
      .set(auth)
      .send({ guestId, tableId });

    expect(res.status).toBe(201);
    expect(res.body.data.partySize).toBe(2);

    // The table is now full (1 physical seat marker used, but headcount is 2/2) --
    // a second solo guest should be rejected.
    const secondGuestId = await createConfirmedGuest(app, token, eventId);
    const secondRes = await request(app)
      .post(`/api/events/${eventId}/seating/assignments`)
      .set(auth)
      .send({ guestId: secondGuestId, tableId });
    expect(secondRes.status).toBe(409);

    const mapRes = await request(app).get(`/api/events/${eventId}/seating/map`).set(auth);
    const seatedTable = mapRes.body.data.tables.find((t: any) => t.id === tableId);
    const occupiedHeadcount = seatedTable.seats.reduce(
      (sum: number, s: any) => (s.assignment ? sum + 1 + s.assignment.guest.additionalGuestsCount : sum),
      0
    );
    expect(occupiedHeadcount).toBe(2);
  });

  it("rejects a party that doesn't fit even though a single seat is free", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const table = await request(app)
      .post(`/api/events/${eventId}/seating/tables`)
      .set(auth)
      .send({ name: "Table 1", capacity: 3 });
    const tableId = table.body.data.table.id;

    // Fill 2 of 3 seats with solo guests, leaving exactly 1 free seat.
    const soloA = await createConfirmedGuest(app, token, eventId);
    const soloB = await createConfirmedGuest(app, token, eventId);
    await request(app).post(`/api/events/${eventId}/seating/assignments`).set(auth).send({ guestId: soloA, tableId });
    await request(app).post(`/api/events/${eventId}/seating/assignments`).set(auth).send({ guestId: soloB, tableId });

    // A guest + 1 plus-one needs 2 seats but only 1 remains.
    const partyGuestId = await createConfirmedGuest(app, token, eventId, { additionalGuestsCount: 1 });
    const res = await request(app)
      .post(`/api/events/${eventId}/seating/assignments`)
      .set(auth)
      .send({ guestId: partyGuestId, tableId });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/party of 2/i);
  });

  it("assigns a confirmed guest to the next free seat at a table", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const table = await request(app)
      .post(`/api/events/${eventId}/seating/tables`)
      .set(auth)
      .send({ name: "Table 1", capacity: 4 });
    const tableId = table.body.data.table.id;
    const guestId = await createConfirmedGuest(app, token, eventId);

    const res = await request(app)
      .post(`/api/events/${eventId}/seating/assignments`)
      .set(auth)
      .send({ guestId, tableId });

    expect(res.status).toBe(201);
    expect(res.body.data.assignment.tableId).toBe(tableId);
    expect(res.body.data.assignment.seatId).toBeTruthy();
  });

  it("rejects assignment once the table is full", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const table = await request(app)
      .post(`/api/events/${eventId}/seating/tables`)
      .set(auth)
      .send({ name: "Table 1", capacity: 1 });
    const tableId = table.body.data.table.id;

    const guest1 = await createConfirmedGuest(app, token, eventId);
    const guest2 = await createConfirmedGuest(app, token, eventId);

    const first = await request(app).post(`/api/events/${eventId}/seating/assignments`).set(auth).send({ guestId: guest1, tableId });
    expect(first.status).toBe(201);

    const second = await request(app).post(`/api/events/${eventId}/seating/assignments`).set(auth).send({ guestId: guest2, tableId });
    expect(second.status).toBe(409);
  });

  it("allows overriding capacity explicitly", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const table = await request(app)
      .post(`/api/events/${eventId}/seating/tables`)
      .set(auth)
      .send({ name: "Table 1", capacity: 1 });
    const tableId = table.body.data.table.id;

    const guest1 = await createConfirmedGuest(app, token, eventId);
    const guest2 = await createConfirmedGuest(app, token, eventId);

    await request(app).post(`/api/events/${eventId}/seating/assignments`).set(auth).send({ guestId: guest1, tableId });
    const res = await request(app)
      .post(`/api/events/${eventId}/seating/assignments`)
      .set(auth)
      .send({ guestId: guest2, tableId, overrideCapacity: true });

    expect(res.status).toBe(201);
    expect(res.body.data.warning).toMatch(/over capacity/i);
  });

  it("moves a guest between tables (clearing the previous seat)", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const tableA = await request(app).post(`/api/events/${eventId}/seating/tables`).set(auth).send({ name: "A", capacity: 2 });
    const tableB = await request(app).post(`/api/events/${eventId}/seating/tables`).set(auth).send({ name: "B", capacity: 2 });
    const guestId = await createConfirmedGuest(app, token, eventId);

    await request(app).post(`/api/events/${eventId}/seating/assignments`).set(auth).send({ guestId, tableId: tableA.body.data.table.id });
    const moveRes = await request(app)
      .post(`/api/events/${eventId}/seating/assignments`)
      .set(auth)
      .send({ guestId, tableId: tableB.body.data.table.id });

    expect(moveRes.status).toBe(201);
    expect(moveRes.body.data.assignment.tableId).toBe(tableB.body.data.table.id);

    const mapRes = await request(app).get(`/api/events/${eventId}/seating/map`).set(auth);
    const tableAResult = mapRes.body.data.tables.find((t: any) => t.id === tableA.body.data.table.id);
    const assignedAtA = tableAResult.seats.filter((s: any) => s.assignment).length;
    expect(assignedAtA).toBe(0);
  });

  it("unassigns a seated guest", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const table = await request(app).post(`/api/events/${eventId}/seating/tables`).set(auth).send({ name: "A", capacity: 2 });
    const guestId = await createConfirmedGuest(app, token, eventId);
    await request(app).post(`/api/events/${eventId}/seating/assignments`).set(auth).send({ guestId, tableId: table.body.data.table.id });

    const res = await request(app).delete(`/api/events/${eventId}/seating/assignments/${guestId}`).set(auth);
    expect(res.status).toBe(204);

    const mapRes = await request(app).get(`/api/events/${eventId}/seating/map`).set(auth);
    expect(mapRes.body.data.unassignedGuests.map((g: any) => g.id)).toContain(guestId);
  });

  it("lists unassigned confirmed guests on the seating map", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await createConfirmedGuest(app, token, eventId);
    await createConfirmedGuest(app, token, eventId);

    const res = await request(app).get(`/api/events/${eventId}/seating/map`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.unassignedGuests).toHaveLength(2);
    expect(res.body.data.tables).toEqual([]);
  });
});
