import { Request, Response } from "express";
import { created, noContent, ok } from "../../lib/apiResponse";
import { BadRequestError } from "../../lib/errors";
import { createEventSchema, updateEventSchema } from "./events.schema";
import * as service from "./events.service";
import * as cardService from "./invitationCard.service";

export async function list(req: Request, res: Response) {
  const events = await service.listEvents(req.userId!);
  return ok(res, { events });
}

export async function create(req: Request, res: Response) {
  const input = createEventSchema.parse(req.body);
  const event = await service.createEvent(req.userId!, input);
  return created(res, { event });
}

export async function getOne(req: Request, res: Response) {
  const event = await service.getOwnedEvent(req.userId!, req.params.eventId);
  return ok(res, { event });
}

export async function update(req: Request, res: Response) {
  const input = updateEventSchema.parse(req.body);
  const event = await service.updateEvent(req.userId!, req.params.eventId, input);
  return ok(res, { event });
}

export async function remove(req: Request, res: Response) {
  await service.deleteEvent(req.userId!, req.params.eventId);
  return noContent(res);
}

export async function dashboard(req: Request, res: Response) {
  const result = await service.getEventDashboard(req.userId!, req.params.eventId);
  return ok(res, result);
}

export async function getInvitationCardMeta(req: Request, res: Response) {
  const card = await cardService.getInvitationCardMeta(req.userId!, req.params.eventId);
  return ok(res, { card });
}

export async function uploadInvitationCard(req: Request, res: Response) {
  if (!req.file) {
    throw new BadRequestError("No file uploaded (field name: file)");
  }
  const card = await cardService.uploadInvitationCard(req.userId!, req.params.eventId, {
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    originalname: req.file.originalname,
    size: req.file.size,
  });
  return ok(res, { card });
}

export async function downloadInvitationCard(req: Request, res: Response) {
  const card = await cardService.getInvitationCardFile(req.userId!, req.params.eventId);
  res.setHeader("Content-Type", card.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${card.fileName}"`);
  return res.status(200).send(card.data);
}

export async function deleteInvitationCard(req: Request, res: Response) {
  await cardService.deleteInvitationCard(req.userId!, req.params.eventId);
  return noContent(res);
}
