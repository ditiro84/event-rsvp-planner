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
router.get("/wristbands/pdf", controller.exportWristbandsPdf);
router.get("/:guestId", validateParams(guestIdParamsSchema), controller.getOne);
router.put("/:guestId", validateParams(guestIdParamsSchema), validateBody(updateGuestSchema), controller.update);
router.delete("/:guestId", validateParams(guestIdParamsSchema), controller.remove);
router.post("/:guestId/checkin", validateParams(guestIdParamsSchema), controller.checkIn);
router.delete("/:guestId/checkin", validateParams(guestIdParamsSchema), controller.checkOut);

// Door check-in via QR/wristband scan -- looks the guest up by their
// invitation token rather than a known :guestId, so it's mounted at the
// collection level, not nested under a specific guest.
router.post("/checkin/scan", controller.checkInScan);

router.get("/:guestId/invite", validateParams(guestIdParamsSchema), controller.getInviteLink);
router.post("/:guestId/invite/mark-sent", validateParams(guestIdParamsSchema), controller.markInviteSent);
router.post("/:guestId/invite/email", validateParams(guestIdParamsSchema), controller.sendInviteEmail);
router.post("/invites/send-email", controller.bulkSendInviteEmails);

export default router;
