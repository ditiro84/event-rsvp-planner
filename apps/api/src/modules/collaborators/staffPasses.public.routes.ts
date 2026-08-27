import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validateBody, validateParams } from "../../middleware/validate";
import { staffPassTokenParamsSchema, staffScanGuestSchema, staffScanTicketSchema } from "./staffPasses.schema";
import * as controller from "./staffPasses.public.controller";

// Public router: no authentication, just a revocable pass token in the URL
// (see EventStaffPass in schema.prisma). Mounted at /api/staff.
const router = Router();

const readRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const scanRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/:passToken", readRateLimit, validateParams(staffPassTokenParamsSchema), controller.getContext);
router.post(
  "/:passToken/scan-guest",
  scanRateLimit,
  validateParams(staffPassTokenParamsSchema),
  validateBody(staffScanGuestSchema),
  controller.scanGuest
);
router.post(
  "/:passToken/scan-ticket",
  scanRateLimit,
  validateParams(staffPassTokenParamsSchema),
  validateBody(staffScanTicketSchema),
  controller.scanTicket
);

export default router;
