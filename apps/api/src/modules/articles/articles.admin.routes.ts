import { Router } from "express";
import multer from "multer";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { articleIdParamsSchema, createArticleSchema, updateArticleSchema } from "./articles.schema";
import * as controller from "./articles.controller";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Mounted at /api/admin/articles -- every route here requires ADMIN, same
// gating as the rest of /api/admin (see admin.routes.ts).
const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", controller.list);
router.post("/", validateBody(createArticleSchema), controller.create);
router.get("/:articleId", validateParams(articleIdParamsSchema), controller.getOne);
router.put("/:articleId", validateParams(articleIdParamsSchema), validateBody(updateArticleSchema), controller.update);
router.delete("/:articleId", validateParams(articleIdParamsSchema), controller.remove);
router.post("/:articleId/publish", validateParams(articleIdParamsSchema), controller.publish);
router.post("/:articleId/unpublish", validateParams(articleIdParamsSchema), controller.unpublish);
router.get("/:articleId/cover-image", validateParams(articleIdParamsSchema), controller.downloadCoverImage);
router.post(
  "/:articleId/cover-image",
  validateParams(articleIdParamsSchema),
  upload.single("file"),
  controller.uploadCoverImage
);

export default router;
