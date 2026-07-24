import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateParams, validateQuery } from "../../middleware/validate";
import { listNotificationsQuerySchema, notificationIdParamsSchema } from "./notifications.schema";
import * as controller from "./notifications.controller";

// Mounted at /api/notifications
const router = Router();

router.use(requireAuth);

router.get("/", validateQuery(listNotificationsQuerySchema), controller.list);
router.put("/read-all", controller.markAllRead);
router.put("/:notificationId/read", validateParams(notificationIdParamsSchema), controller.markRead);

export default router;
