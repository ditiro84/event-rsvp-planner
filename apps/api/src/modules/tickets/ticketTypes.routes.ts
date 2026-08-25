import { Router } from "express";
import { validateBody, validateParams } from "../../middleware/validate";
import { createTicketTypeSchema, ticketTypeIdParamsSchema, updateTicketTypeSchema } from "./ticketTypes.schema";
import * as controller from "./ticketTypes.controller";

// Mounted at /api/events/:eventId/ticket-types (mergeParams to access
// :eventId from the parent events router).
const router = Router({ mergeParams: true });

router.get("/", controller.list);
router.post("/", validateBody(createTicketTypeSchema), controller.create);
router.post("/reorder", controller.reorder);
router.put(
  "/:ticketTypeId",
  validateParams(ticketTypeIdParamsSchema),
  validateBody(updateTicketTypeSchema),
  controller.update
);
router.delete("/:ticketTypeId", validateParams(ticketTypeIdParamsSchema), controller.remove);

export default router;
