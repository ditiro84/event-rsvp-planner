import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env";
import { validateBody, validateParams } from "../../middleware/validate";
import { rsvpTokenParamsSchema, submitRsvpSchema } from "./rsvp.schema";
import * as controller from "./rsvp.controller";

// Public router: no authentication. Mounted at /api/rsvp
const router = Router();

const submitRateLimit = rateLimit({
  windowMs: env.rsvpRateLimitWindowMs,
  limit: env.rsvpRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many RSVP attempts. Please try again later." } },
});

const readRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/:token", readRateLimit, validateParams(rsvpTokenParamsSchema), controller.getPublicEvent);
router.post(
  "/:token",
  submitRateLimit,
  validateParams(rsvpTokenParamsSchema),
  validateBody(submitRsvpSchema),
  controller.submit
);

export default router;
