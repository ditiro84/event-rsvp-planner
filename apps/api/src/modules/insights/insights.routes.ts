import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate";
import { listInsightsQuerySchema } from "./insights.schema";
import * as controller from "./insights.controller";

// Mounted at /api/insights
const router = Router();

router.use(requireAuth);

router.get("/", validateQuery(listInsightsQuerySchema), controller.list);

export default router;
