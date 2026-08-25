import { Router } from "express";
import { validateBody, validateParams } from "../../middleware/validate";
import {
  createTicketTypeSchema,
  ticketScanSchema,
  ticketTypeIdParamsSchema,
  updateTicketTypeSchema,
} from "./ticketTypes.schema";
import * as controller from "./ticketTypes.controller";

// Mounted at /api/events/:eventId/ticket-types (mergeParams to access
// :eventId from the parent events router).
const router = Router({ mergeParams: true });

router.get("/", controller.list);
router.post("/", validateBody(createTicketTypeSchema), controller.create);
router.post("/reorder", controller.reorder);
// Door check-in scan -- looks a ticket up by its own `code` (the QR payload
// printed/shown to the buyer), separate from the ticket-type CRUD above.
// Lives here rather than a new router so ticket check-in doesn't need its
// own mount point for one endpoint.
router.post("/scan", validateBody(ticketScanSchema), controller.scan);
router.put(
  "/:ticketTypeId",
  validateParams(ticketTypeIdParamsSchema),
  validateBody(updateTicketTypeSchema),
  controller.update
);
router.delete("/:ticketTypeId", validateParams(ticketTypeIdParamsSchema), controller.remove);

export default router;
