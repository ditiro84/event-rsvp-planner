import request from "supertest";
import { Express } from "express";

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
