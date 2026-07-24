import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import * as controller from "./analytics.controller";

// Mounted at /api/analytics
const router = Router();

router.use(requireAuth);

router.get("/", controller.overview);

export default router;
