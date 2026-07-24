import { Router } from "express";
import { validateBody, validateParams } from "../../middleware/validate";
import { createVendorSchema, updateVendorSchema, vendorIdParamsSchema } from "./vendors.schema";
import * as controller from "./vendors.controller";

// Mounted at /api/events/:eventId/vendors (mergeParams to access :eventId from parent router)
const router = Router({ mergeParams: true });

router.get("/", controller.list);
router.get("/summary", controller.summary);
router.post("/", validateBody(createVendorSchema), controller.create);
router.put("/:vendorId", validateParams(vendorIdParamsSchema), validateBody(updateVendorSchema), controller.update);
router.delete("/:vendorId", validateParams(vendorIdParamsSchema), controller.remove);

export default router;
