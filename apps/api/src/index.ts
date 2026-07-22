// Use plain console.log for the earliest boot markers (before pino/anything
// else is guaranteed to exist) so a crash during module load or startup is
// never silent in the platform's logs.
console.log("[boot] index.ts starting");

process.on("uncaughtException", (err) => {
  console.error("[boot] uncaughtException:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[boot] unhandledRejection:", reason);
  process.exit(1);
});

console.log("[boot] loading app modules...");
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
console.log("[boot] app modules loaded");

console.log(`[boot] creating express app (NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT})`);
const app = createApp();
console.log("[boot] express app created, calling listen()...");

// Bind explicitly to 0.0.0.0 -- some container platforms only route health
// checks over IPv4, and Node's default (no host given) can end up IPv6-only
// in certain base images, causing the health check to silently never connect.
const server = app.listen(env.port, "0.0.0.0", () => {
  console.log(`[boot] listen() callback fired`);
  logger.info(`API listening on 0.0.0.0:${env.port} (${env.nodeEnv})`);
});

server.on("error", (err) => {
  console.error("[boot] server.listen() error:", err);
  process.exit(1);
});

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force-exit if graceful shutdown hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
