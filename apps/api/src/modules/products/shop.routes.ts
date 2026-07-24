import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validateBody, validateParams } from "../../middleware/validate";
import { createCheckoutSchema, rsvpTokenParamsSchema } from "./orders.schema";
import { productIdParamsSchema } from "./products.schema";
import * as controller from "./orders.controller";

// Public, unauthenticated router (mirrors rsvp.routes.ts): guests reach this
// via the event's rsvpToken to browse the shop and start a checkout.
// Mounted at /api/shop
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

router.get("/:token/products", readRateLimit, validateParams(rsvpTokenParamsSchema), controller.publicListProducts);
router.get(
  "/products/:productId/image",
  readRateLimit,
  validateParams(productIdParamsSchema.pick({ productId: true })),
  controller.publicProductImage
);
router.post("/:token/checkout", checkoutRateLimit, validateParams(rsvpTokenParamsSchema), validateBody(createCheckoutSchema), controller.checkout);

export default router;
