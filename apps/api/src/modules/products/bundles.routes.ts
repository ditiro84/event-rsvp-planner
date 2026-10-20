import { Router } from "express";
import { validateBody, validateParams } from "../../middleware/validate";
import { bundleIdParamsSchema, createBundleSchema, updateBundleSchema } from "./bundles.schema";
import * as controller from "./bundles.controller";

// Mounted at /api/events/:eventId/bundles (mergeParams to access :eventId from parent router)
const router = Router({ mergeParams: true });

router.get("/", controller.list);
router.post("/", validateBody(createBundleSchema), controller.create);
router.put("/:bundleId", validateParams(bundleIdParamsSchema), validateBody(updateBundleSchema), controller.update);
router.delete("/:bundleId", validateParams(bundleIdParamsSchema), controller.remove);

export default router;
