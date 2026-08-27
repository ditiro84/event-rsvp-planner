import { Request, Response } from "express";
import { created, noContent, ok } from "../../lib/apiResponse";
import { inviteCollaboratorSchema } from "./collaborators.schema";
import * as service from "./collaborators.service";

export async function list(req: Request, res: Response) {
  const result = await service.listCollaborators(req.userId!, req.params.eventId);
  return ok(res, result);
}

export async function invite(req: Request, res: Response) {
  const input = inviteCollaboratorSchema.parse(req.body);
  const result = await service.inviteCollaborator(req.userId!, req.params.eventId, input.email);
  return created(res, result);
}

export async function remove(req: Request, res: Response) {
  await service.removeCollaborator(req.userId!, req.params.eventId, req.params.collaboratorId);
  return noContent(res);
}

export async function cancelInvite(req: Request, res: Response) {
  await service.cancelCollaboratorInvite(req.userId!, req.params.eventId, req.params.inviteId);
  return noContent(res);
}
