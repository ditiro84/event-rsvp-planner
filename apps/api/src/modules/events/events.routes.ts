import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { auditAdminEventActions } from "../../middleware/auditAdminEventActions";
import { createEventSchema, eventIdParamsSchema, updateEventSchema } from "./events.schema";
import * as controller from "./events.controller";
import guestsRouter from "../guests/guests.routes";
import seatingRouter from "../seating/seating.routes";
import vendorsRouter from "../vendors/vendors.routes";
import productsRouter from "../products/products.routes";
import ordersRouter from "../products/orders.routes";
import payoutsRouter from "../payouts/payouts.routes";
import ticketTypesRouter from "../tickets/ticketTypes.routes";
import collaboratorsRouter from "../collaborators/collaborators.routes";
import staffPassesRouter from "../collaborators/staffPasses.routes";
import * as rsvpController from "../rsvp/rsvp.controller";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const router = Router();

router.use(requireAuth);
// Prefix-matches "/:eventId" and everything under it (guests, seating,
// vendors, products, orders, payouts, dashboard, invitation-card) -- see
// auditAdminEventActions.ts. Registered before those routes so it runs
// first for every one of them.
router.use("/:eventId", auditAdminEventActions());

router.get("/", controller.list);
router.post("/", validateBody(createEventSchema), controller.create);
router.get("/:eventId", validateParams(eventIdParamsSchema), controller.getOne);
router.put("/:eventId", validateParams(eventIdParamsSchema), validateBody(updateEventSchema), controller.update);
router.delete("/:eventId", validateParams(eventIdParamsSchema), controller.remove);
router.get("/:eventId/dashboard", validateParams(eventIdParamsSchema), controller.dashboard);
router.get("/:eventId/rsvp", validateParams(eventIdParamsSchema), rsvpController.dashboard);

router.get("/:eventId/invitation-card", validateParams(eventIdParamsSchema), controller.getInvitationCardMeta);
router.get("/:eventId/invitation-card/file", validateParams(eventIdParamsSchema), controller.downloadInvitationCard);
router.post(
  "/:eventId/invitation-card",
  validateParams(eventIdParamsSchema),
  upload.single("file"),
  controller.uploadInvitationCard
);
router.delete("/:eventId/invitation-card", validateParams(eventIdParamsSchema), controller.deleteInvitationCard);

// Public ticket listing cover image (bytes-in-postgres, same pattern as
// invitation cards above and Product/Article images).
router.get("/:eventId/cover-image", validateParams(eventIdParamsSchema), controller.downloadCoverImage);
router.post(
  "/:eventId/cover-image",
  validateParams(eventIdParamsSchema),
  upload.single("file"),
  controller.uploadCoverImage
);

// Nested guest routes: /api/events/:eventId/guests
router.use("/:eventId/guests", validateParams(eventIdParamsSchema), guestsRouter);

// Nested seating routes: /api/events/:eventId/seating
router.use("/:eventId/seating", validateParams(eventIdParamsSchema), seatingRouter);

// Nested vendor routes: /api/events/:eventId/vendors
router.use("/:eventId/vendors", validateParams(eventIdParamsSchema), vendorsRouter);

// Nested merchandise routes: /api/events/:eventId/products, /api/events/:eventId/orders
router.use("/:eventId/products", validateParams(eventIdParamsSchema), productsRouter);
router.use("/:eventId/orders", validateParams(eventIdParamsSchema), ordersRouter);

// Nested payout account routes: /api/events/:eventId/payouts
router.use("/:eventId/payouts", validateParams(eventIdParamsSchema), payoutsRouter);

// Nested ticket type routes: /api/events/:eventId/ticket-types
router.use("/:eventId/ticket-types", validateParams(eventIdParamsSchema), ticketTypesRouter);

// Nested staff routes: /api/events/:eventId/collaborators, /api/events/:eventId/staff-passes
// -- owner/admin only, see collaborators.service.ts / staffPasses.service.ts.
router.use("/:eventId/collaborators", validateParams(eventIdParamsSchema), collaboratorsRouter);
router.use("/:eventId/staff-passes", validateParams(eventIdParamsSchema), staffPassesRouter);

export default router;
