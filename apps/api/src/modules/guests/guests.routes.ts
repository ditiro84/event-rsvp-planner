import { Router } from "express";
import multer from "multer";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate";
import { createGuestSchema, guestIdParamsSchema, listGuestsQuerySchema, updateGuestSchema } from "./guests.schema";
import * as controller from "./guests.controller";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Mounted at /api/events/:eventId/guests (mergeParams to access :eventId from parent router)
const router = Router({ mergeParams: true });

router.get("/", validateQuery(listGuestsQuerySchema), controller.list);
router.post("/", validateBody(createGuestSchema), controller.create);
router.post("/import", upload.single("file"), controller.importCsv);
router.get("/export", controller.exportCsv);
router.get("/export/pdf", controller.exportPdf);
router.get("/:guestId", validateParams(guestIdParamsSchema), controller.getOne);
router.put("/:guestId", validateParams(guestIdParamsSchema), validateBody(updateGuestSchema), controller.update);
router.delete("/:guestId", validateParams(guestIdParamsSchema), controller.remove);
router.post("/:guestId/checkin", validateParams(guestIdParamsSchema), controller.checkIn);
router.delete("/:guestId/checkin", validateParams(guestIdParamsSchema), controller.checkOut);

export default router;
