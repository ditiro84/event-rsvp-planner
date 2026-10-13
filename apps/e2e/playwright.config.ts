import { defineConfig, devices } from "@playwright/test";
import path from "path";

// Monorepo root -- webServer commands run from here so `npm run ... --workspace=apps/api`
// / `--workspace=apps/web` resolve the same way they do for a developer running
// things by hand (see the root package.json scripts).
const REPO_ROOT = path.resolve(__dirname, "../..");

const WEB_URL = "http://localhost:5173";
const API_HEALTH_URL = "http://localhost:4000/health";

export default defineConfig({
  testDir: "./tests",
  // These specs share one running API + Postgres database rather than
  // resetting between tests (unlike apps/api's Vitest integration suite),
  // so each spec creates its own planner/event/guests with unique emails --
  // safe to run serially or in parallel, but keep workers modest to avoid
  // hammering a dev Postgres instance.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // Requires a reachable Postgres -- see apps/e2e/README.md. `npm run
  // prisma:migrate:deploy --workspace=apps/api` runs synchronously before
  // `dev:api` starts listening, so Playwright's own readiness check against
  // /health (which itself pings the DB) only ever sees a fully-migrated API.
  webServer: [
    {
      command: "npm run prisma:migrate:deploy --workspace=apps/api && npm run dev:api",
      cwd: REPO_ROOT,
      url: API_HEALTH_URL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "npm run dev:web",
      cwd: REPO_ROOT,
      url: WEB_URL,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
