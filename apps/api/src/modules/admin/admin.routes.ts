import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import * as controller from "./admin.controller";

// Mounted at /api/admin. Every route here requires an authenticated ADMIN
// account -- planners get 403. Drill-in to a specific subscriber's event
// deliberately does NOT live here: it reuses the exact same
// /api/events/:eventId/* endpoints a planner uses, via getOwnedEvent's
// admin bypass (see events.service.ts) -- these routes only cover the
// cross-subscriber list/log views that have no owner-scoped equivalent.
const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/users", controller.listUsers);
router.get("/events", controller.listEvents);
router.get("/audit-log", controller.auditLog);
router.get("/payment-events", controller.paymentEvents);
router.get("/analytics", controller.analytics);

export default router;
