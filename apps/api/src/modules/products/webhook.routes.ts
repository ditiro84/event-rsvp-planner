import { Router } from "express";
import express from "express";
import { ok } from "../../lib/apiResponse";
import * as ordersService from "./orders.service";

// Mounted directly in app.ts, BEFORE the global express.json() body parser,
// so this route sees the raw request body -- Stripe's signature
// verification (stripe.webhooks.constructEvent) requires the exact raw
// bytes as sent, not a re-serialized parsed-then-stringified copy.
const router = Router();

router.post("/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const result = await ordersService.handleStripeWebhook(
    req.body as Buffer,
    typeof signature === "string" ? signature : undefined
  );
  return ok(res, result);
});

export default router;
