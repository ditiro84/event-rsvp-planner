import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { createEventSchema, eventIdParamsSchema, updateEventSchema } from "./events.schema";
import * as controller from "./events.controller";
import guestsRouter from "../guests/guests.routes";
import seatingRouter from "../seating/seating.routes";
import * as rsvpController from "../rsvp/rsvp.controller";

const router = Router();

router.use(requireAuth);

router.get("/", controller.list);
router.post("/", validateBody(createEventSchema), controller.create);
router.get("/:eventId", validateParams(eventIdParamsSchema), controller.getOne);
router.put("/:eventId", validateParams(eventIdParamsSchema), validateBody(updateEventSchema), controller.update);
router.delete("/:eventId", validateParams(eventIdParamsSchema), controller.remove);
router.get("/:eventId/dashboard", validateParams(eventIdParamsSchema), controller.dashboard);
router.get("/:eventId/rsvp", validateParams(eventIdParamsSchema), rsvpController.dashboard);

// Nested guest routes: /api/events/:eventId/guests
router.use("/:eventId/guests", validateParams(eventIdParamsSchema), guestsRouter);

// Nested seating routes: /api/events/:eventId/seating
router.use("/:eventId/seating", validateParams(eventIdParamsSchema), seatingRouter);

export default router;
