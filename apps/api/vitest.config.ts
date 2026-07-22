import { defineConfig } from "vitest/config";

// Unit tests: pure functions only, no database / Prisma client required.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    testTimeout: 10000,
  },
});
