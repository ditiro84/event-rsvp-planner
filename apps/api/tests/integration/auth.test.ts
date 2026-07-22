import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestApp, resetDatabase } from "../helpers/testApp";

const app = buildTestApp();

beforeEach(async () => {
  await resetDatabase();
});

describe("POST /api/auth/register", () => {
  it("creates a new user and returns a session cookie", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("ada@example.com");
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects duplicate emails", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Ada",
      email: "dup@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/auth/register").send({
      name: "Someone Else",
      email: "dup@example.com",
      password: "password123",
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("rejects weak passwords", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Weak",
      email: "weak@example.com",
      password: "short",
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Grace Hopper",
      email: "grace@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "grace@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it("rejects incorrect passwords", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Grace Hopper",
      email: "grace2@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "grace2@example.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the current user when authenticated", async () => {
    const register = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "me@example.com",
      password: "password123",
    });
    const token = register.body.data.token;

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("me@example.com");
  });
});
