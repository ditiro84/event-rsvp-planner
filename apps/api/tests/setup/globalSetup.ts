import path from "path";
import fs from "fs";
import { execSync } from "child_process";

// Vitest globalSetup: spins up a throwaway local Postgres instance (no Docker
// or system Postgres install required) using the `embedded-postgres` package,
// applies Prisma migrations, and writes .env.test so config/env.ts picks it up.
//
// This lets `npm test` work identically on a laptop, in this sandbox, and in
// CI without needing a separate database service to be provisioned first.

const DB_PORT = 55432;
const DATA_DIR = path.resolve(__dirname, "../../.pgdata-test");
const ENV_TEST_PATH = path.resolve(__dirname, "../../.env.test");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pg: any;

export async function setup() {
  // If a DATABASE_URL is already provided (e.g. a Postgres service container
  // in CI, or a developer's own local Postgres), use it directly instead of
  // provisioning a throwaway instance.
  if (process.env.DATABASE_URL) {
    execSync("npx prisma migrate deploy", {
      cwd: path.resolve(__dirname, "../../"),
      stdio: "inherit",
      env: { ...process.env },
    });
    process.env.NODE_ENV = "test";
    return;
  }

  const { default: EmbeddedPostgres } = await import("embedded-postgres");

  if (fs.existsSync(DATA_DIR)) {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: DB_PORT,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase("eventapp_test");

  const databaseUrl = `postgresql://postgres:postgres@localhost:${DB_PORT}/eventapp_test?schema=public`;

  fs.writeFileSync(
    ENV_TEST_PATH,
    [
      `DATABASE_URL="${databaseUrl}"`,
      `NODE_ENV=test`,
      `JWT_SECRET=test-only-secret`,
      `JWT_EXPIRES_IN=1h`,
      `COOKIE_NAME=event_rsvp_token`,
      `CORS_ORIGINS=http://localhost:5173`,
      `PUBLIC_APP_URL=http://localhost:5173`,
      `RSVP_RATE_LIMIT_MAX=1000`,
      `RSVP_RATE_LIMIT_WINDOW_MS=900000`,
      "",
    ].join("\n")
  );

  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../../"),
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  process.env.DATABASE_URL = databaseUrl;
  process.env.NODE_ENV = "test";
}

export async function teardown() {
  if (!pg) return; // nothing to tear down when using an externally-provided DATABASE_URL
  if (pg) {
    await pg.stop();
  }
  if (fs.existsSync(ENV_TEST_PATH)) {
    fs.rmSync(ENV_TEST_PATH);
  }
  if (fs.existsSync(DATA_DIR)) {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
}
