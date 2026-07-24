import { Router } from "express";
import multer from "multer";
import { validateBody, validateParams } from "../../middleware/validate";
import { createProductSchema, productIdParamsSchema, updateProductSchema } from "./products.schema";
import * as controller from "./products.controller";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Mounted at /api/events/:eventId/products (mergeParams to access :eventId from parent router)
const router = Router({ mergeParams: true });

router.get("/", controller.list);
router.post("/", validateBody(createProductSchema), controller.create);
router.put("/:productId", validateParams(productIdParamsSchema), validateBody(updateProductSchema), controller.update);
router.delete("/:productId", validateParams(productIdParamsSchema), controller.remove);
router.get("/:productId/image", validateParams(productIdParamsSchema), controller.downloadImage);
router.post("/:productId/image", validateParams(productIdParamsSchema), upload.single("file"), controller.uploadImage);

export default router;
