import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validateParams } from "../../middleware/validate";
import { articleSlugParamsSchema } from "./articles.schema";
import * as controller from "./articles.controller";

// Public, unauthenticated router -- backs the /articles blog and the landing
// page's article teasers. Mounted at /api/articles.
const router = Router();

const readRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/", readRateLimit, controller.publicList);
router.get("/:slug", readRateLimit, validateParams(articleSlugParamsSchema), controller.publicGetBySlug);
router.get(
  "/:slug/cover-image",
  readRateLimit,
  validateParams(articleSlugParamsSchema),
  controller.publicCoverImage
);

export default router;
