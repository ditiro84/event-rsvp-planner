import { Router } from "express";
import { validateBody, validateParams } from "../../middleware/validate";
import * as controller from "./seating.controller";
import {
  assignGuestSchema,
  assignmentGuestIdParamsSchema,
  assignmentPartyMemberIdParamsSchema,
  createLayoutObjectSchema,
  createTableSchema,
  objectIdParamsSchema,
  tableIdParamsSchema,
  updateLayoutObjectSchema,
  updateLayoutSchema,
  updateTableSchema,
} from "./seating.schema";

// Mounted at /api/events/:eventId/seating (mergeParams to access :eventId from parent router)
const router = Router({ mergeParams: true });

router.get("/map", controller.getSeatingMap);

router.get("/layout", controller.getLayout);
router.put("/layout", validateBody(updateLayoutSchema), controller.updateLayout);
router.post("/layout/objects", validateBody(createLayoutObjectSchema), controller.createLayoutObject);
router.put(
  "/layout/objects/:objectId",
  validateParams(objectIdParamsSchema),
  validateBody(updateLayoutObjectSchema),
  controller.updateLayoutObject
);
router.delete("/layout/objects/:objectId", validateParams(objectIdParamsSchema), controller.deleteLayoutObject);

router.get("/tables", controller.listTables);
router.post("/tables", validateBody(createTableSchema), controller.createTable);
router.put(
  "/tables/:tableId",
  validateParams(tableIdParamsSchema),
  validateBody(updateTableSchema),
  controller.updateTable
);
router.delete("/tables/:tableId", validateParams(tableIdParamsSchema), controller.deleteTable);

router.post("/assignments", validateBody(assignGuestSchema), controller.assignGuest);
router.delete(
  "/assignments/party/:partyMemberId",
  validateParams(assignmentPartyMemberIdParamsSchema),
  controller.unassignPartyMember
);
router.delete(
  "/assignments/:guestId",
  validateParams(assignmentGuestIdParamsSchema),
  controller.unassignGuest
);

export default router;
