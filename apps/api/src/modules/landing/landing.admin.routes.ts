import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { createServiceSchema, reorderServicesSchema, serviceIdParamsSchema, updateServiceSchema } from "./landing.schema";
import * as controller from "./landing.controller";

// Mounted at /api/admin/services -- lets an admin add/edit/reorder/hide the
// "Services" cards shown on the public landing page without a code deploy.
const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", controller.list);
router.post("/", validateBody(createServiceSchema), controller.create);
router.post("/reorder", validateBody(reorderServicesSchema), controller.reorder);
router.put("/:serviceId", validateParams(serviceIdParamsSchema), validateBody(updateServiceSchema), controller.update);
router.delete("/:serviceId", validateParams(serviceIdParamsSchema), controller.remove);

export default router;
