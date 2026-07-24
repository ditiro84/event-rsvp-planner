import "express-async-errors";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { prisma } from "./lib/prisma";

import authRoutes from "./modules/auth/auth.routes";
import eventsRoutes from "./modules/events/events.routes";
import rsvpRoutes from "./modules/rsvp/rsvp.routes";
import guestByIdRoutes from "./modules/guests/guestById.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import insightsRoutes from "./modules/insights/insights.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1); // needed for correct client IPs behind Railway/Render/Vercel proxies

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  if (!env.isTest) {
    app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));
  }

  // --- Health check -------------------------------------------------------
  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: "connected",
      });
    } catch (err) {
      res.status(503).json({
        status: "error",
        database: "disconnected",
        message: env.isProduction ? undefined : (err as Error).message,
      });
    }
  });

  // --- API routes ----------------------------------------------------------
  app.use("/api/auth", authRoutes);
  app.use("/api/events", eventsRoutes);
  app.use("/api/rsvp", rsvpRoutes);
  app.use("/api/guests", guestByIdRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/insights", insightsRoutes);
  app.use("/api/analytics", analyticsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
