import { Router } from "express";
import * as controller from "./orders.controller";

// Mounted at /api/events/:eventId/orders (mergeParams to access :eventId from parent router)
const router = Router({ mergeParams: true });

router.get("/", controller.list);
router.get("/summary", controller.summary);

export default router;
