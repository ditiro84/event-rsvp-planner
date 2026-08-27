import { Router } from "express";
import { validateBody, validateParams } from "../../middleware/validate";
import { collaboratorIdParamsSchema, collaboratorInviteIdParamsSchema, inviteCollaboratorSchema } from "./collaborators.schema";
import * as controller from "./collaborators.controller";

// Mounted at /api/events/:eventId/collaborators (mergeParams for :eventId).
// Owner/admin only -- see collaborators.service.ts.
const router = Router({ mergeParams: true });

router.get("/", controller.list);
router.post("/", validateBody(inviteCollaboratorSchema), controller.invite);
router.delete("/:collaboratorId", validateParams(collaboratorIdParamsSchema), controller.remove);
router.delete("/invites/:inviteId", validateParams(collaboratorInviteIdParamsSchema), controller.cancelInvite);

export default router;
