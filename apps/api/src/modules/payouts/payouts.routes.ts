import { Router } from "express";
import { validateBody, validateParams } from "../../middleware/validate";
import { connectPaypalSchema, connectPaystackSchema, connectStripeSchema, payoutAccountIdParamsSchema } from "./payouts.schema";
import * as controller from "./payouts.controller";

// Mounted at /api/events/:eventId/payouts (mergeParams to access :eventId from parent router)
const router = Router({ mergeParams: true });

router.get("/", controller.list);
router.post("/stripe/connect", validateBody(connectStripeSchema), controller.connectStripe);
router.get("/paystack/banks", controller.listPaystackBanks);
router.post("/paystack/connect", validateBody(connectPaystackSchema), controller.connectPaystack);
router.post("/paypal/connect", validateBody(connectPaypalSchema), controller.connectPaypal);
router.delete("/:payoutAccountId", validateParams(payoutAccountIdParamsSchema), controller.remove);

export default router;
