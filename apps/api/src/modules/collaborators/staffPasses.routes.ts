import { Router } from "express";
import { validateBody, validateParams } from "../../middleware/validate";
import { createStaffPassSchema, staffPassIdParamsSchema } from "./staffPasses.schema";
import * as controller from "./staffPasses.controller";

// Mounted at /api/events/:eventId/staff-passes (mergeParams for :eventId).
// Owner/admin only -- see staffPasses.service.ts. The no-account public
// scanning side of this feature lives in staffPasses.public.routes.ts,
// mounted separately at /api/staff.
const router = Router({ mergeParams: true });

router.get("/", controller.list);
router.post("/", validateBody(createStaffPassSchema), controller.create);
router.post("/:passId/revoke", validateParams(staffPassIdParamsSchema), controller.revoke);

export default router;
