import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { guestIdParamsSchema, updateGuestSchema } from "./guests.schema";
import * as controller from "./guests.controller";

// Top-level guest routes per API spec: /api/guests/:guestId
const router = Router();
router.use(requireAuth);

router.get("/:guestId", validateParams(guestIdParamsSchema), controller.getOne);
router.put("/:guestId", validateParams(guestIdParamsSchema), validateBody(updateGuestSchema), controller.update);
router.delete("/:guestId", validateParams(guestIdParamsSchema), controller.remove);

export default router;
