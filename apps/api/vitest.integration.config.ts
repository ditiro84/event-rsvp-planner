import { defineConfig } from "vitest/config";

// Integration tests: spin up a real local Postgres and exercise the Express
// API + Prisma Client end-to-end. Requires `npx prisma generate` to have been
// run first (needs network access to download Prisma's query engine).
export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/setup/globalSetup.ts"],
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 60000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
