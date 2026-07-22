import dotenv from "dotenv";
import path from "path";

// In test runs, tests/setup/globalSetup.ts writes a .env.test file pointing
// at an ephemeral local Postgres instance before any test file is imported.
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path: path.resolve(__dirname, "../../", envFile) });
dotenv.config(); // fallback: also load .env for anything not overridden above

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET", process.env.NODE_ENV === "test" ? "test-secret" : undefined),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  cookieName: process.env.COOKIE_NAME ?? "event_rsvp_token",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:5173",
  rsvpRateLimitMax: Number(process.env.RSVP_RATE_LIMIT_MAX ?? 20),
  rsvpRateLimitWindowMs: Number(process.env.RSVP_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
};
