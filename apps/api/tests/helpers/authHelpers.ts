import request from "supertest";
import { Express } from "express";
import { prisma } from "../../src/lib/prisma";

let counter = 0;

export async function registerAndLogin(app: Express, overrides: Partial<{ name: string; email: string; password: string }> = {}) {
  counter += 1;
  const payload = {
    name: overrides.name ?? "Test Planner",
    email: overrides.email ?? `planner${counter}@example.com`,
    password: overrides.password ?? "password123",
  };
  const res = await request(app).post("/api/auth/register").send(payload);
  return { token: res.body.data.token as string, user: res.body.data.user };
}

// Registers a normal planner account, then promotes it to ADMIN directly in
// the DB (mirroring how the real bootstrap migration flips a role -- there's
// no signup-time "become an admin" flow, by design) and re-logs-in so the
// returned JWT/session reflects the promoted role.
export async function registerAndLoginAsAdmin(
  app: Express,
  overrides: Partial<{ name: string; email: string; password: string }> = {}
) {
  const { user } = await registerAndLogin(app, overrides);
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: user.email, password: overrides.password ?? "password123" });
  return { token: res.body.data.token as string, user: res.body.data.user };
}
