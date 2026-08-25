import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validateBody, validateParams } from "../../middleware/validate";
import {
  capturePaypalTicketOrderSchema,
  createTicketCheckoutSchema,
  publicSlugParamsSchema,
  ticketOrderIdParamsSchema,
} from "./checkout.schema";
import * as controller from "./checkout.controller";

// Public, unauthenticated router (mirrors shop.routes.ts): anyone reaches
// this via the event's publicSlug to browse and buy tickets -- no rsvpToken
// or login involved. Mounted at /api/tickets
const router = Router();

const readRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const checkoutRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many checkout attempts. Please try again later." } },
});

router.get("/events/:slug", readRateLimit, validateParams(publicSlugParamsSchema), controller.publicEvent);
router.get(
  "/events/:slug/cover-image",
  readRateLimit,
  validateParams(publicSlugParamsSchema),
  controller.publicCoverImage
);
router.get("/orders/:orderId", readRateLimit, validateParams(ticketOrderIdParamsSchema), controller.publicOrder);
router.post(
  "/events/:slug/checkout",
  checkoutRateLimit,
  validateParams(publicSlugParamsSchema),
  validateBody(createTicketCheckoutSchema),
  controller.checkout
);
router.post(
  "/events/:slug/checkout/paypal/capture",
  checkoutRateLimit,
  validateParams(publicSlugParamsSchema),
  validateBody(capturePaypalTicketOrderSchema),
  controller.capturePaypal
);

export default router;
