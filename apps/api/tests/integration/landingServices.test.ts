import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestApp, resetDatabase } from "../helpers/testApp";
import { registerAndLogin, registerAndLoginAsAdmin } from "../helpers/authHelpers";

const app = buildTestApp();

beforeEach(async () => {
  await resetDatabase();
});

describe("Landing services: admin access control", () => {
  it("rejects a regular planner", async () => {
    const { token } = await registerAndLogin(app);
    const res = await request(app)
      .post("/api/admin/services")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "New thing", description: "desc", icon: "Sparkles" });
    expect(res.status).toBe(403);
  });
});

describe("Landing services: admin CRUD", () => {
  it("creates a service and rejects an icon outside the fixed set", async () => {
    const { token } = await registerAndLoginAsAdmin(app);
    const auth = { Authorization: `Bearer ${token}` };

    const ok = await request(app).post("/api/admin/services").set(auth).send({ title: "Live Streaming", description: "Stream your event", icon: "Camera" });
    expect(ok.status).toBe(201);
    expect(ok.body.data.service.isActive).toBe(true);

    const bad = await request(app)
      .post("/api/admin/services")
      .set(auth)
      .send({ title: "Bad Icon", description: "desc", icon: "<script>alert(1)</script>" });
    expect(bad.status).toBe(400);
  });

  it("updates and can hide a service without deleting it", async () => {
    const { token } = await registerAndLoginAsAdmin(app);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app).post("/api/admin/services").set(auth).send({ title: "Beta", description: "desc", icon: "Star" });
    const updated = await request(app)
      .put(`/api/admin/services/${created.body.data.service.id}`)
      .set(auth)
      .send({ isActive: false });

    expect(updated.body.data.service.isActive).toBe(false);

    const publicList = await request(app).get("/api/landing/services");
    expect(publicList.body.data.services.find((s: { id: string }) => s.id === created.body.data.service.id)).toBeUndefined();
  });

  it("deletes a service", async () => {
    const { token } = await registerAndLoginAsAdmin(app);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app).post("/api/admin/services").set(auth).send({ title: "Temp", description: "desc", icon: "Gift" });
    const del = await request(app).delete(`/api/admin/services/${created.body.data.service.id}`).set(auth);
    expect(del.status).toBe(204);
  });

  it("reorders services and the new order is reflected publicly", async () => {
    const { token } = await registerAndLoginAsAdmin(app);
    const auth = { Authorization: `Bearer ${token}` };

    const a = await request(app).post("/api/admin/services").set(auth).send({ title: "A", description: "d", icon: "Star" });
    const b = await request(app).post("/api/admin/services").set(auth).send({ title: "B", description: "d", icon: "Star" });

    await request(app)
      .post("/api/admin/services/reorder")
      .set(auth)
      .send({ orderedIds: [b.body.data.service.id, a.body.data.service.id] });

    const publicList = await request(app).get("/api/landing/services");
    expect(publicList.body.data.services[0].title).toBe("B");
    expect(publicList.body.data.services[1].title).toBe("A");
  });
});

describe("Landing services: public visibility", () => {
  it("only returns active services, ordered by sortOrder", async () => {
    const { token } = await registerAndLoginAsAdmin(app);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post("/api/admin/services").set(auth).send({ title: "Visible", description: "d", icon: "Star", isActive: true });
    await request(app).post("/api/admin/services").set(auth).send({ title: "Hidden", description: "d", icon: "Star", isActive: false });

    const res = await request(app).get("/api/landing/services");
    expect(res.status).toBe(200);
    expect(res.body.data.services).toHaveLength(1);
    expect(res.body.data.services[0].title).toBe("Visible");
  });
});
