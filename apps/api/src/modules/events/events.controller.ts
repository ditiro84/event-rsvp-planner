import { Request, Response } from "express";
import { created, noContent, ok } from "../../lib/apiResponse";
import { BadRequestError } from "../../lib/errors";
import { createEventSchema, updateEventSchema } from "./events.schema";
import * as service from "./events.service";
import * as cardService from "./invitationCard.service";

// Every response below carries a raw Prisma Event row -- strip the cover
// image bytes out and expose a boolean instead (same hasImage/hasCoverImage
// convention as Product/Article) so a plain event list or update response
// never inlines a base64 image into the JSON payload.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeEvent(event: any) {
  const { coverImageData, coverImageMimeType, ...rest } = event;
  return { ...rest, hasCoverImage: !!coverImageMimeType };
}

export async function list(req: Request, res: Response) {
  const events = await service.listEvents(req.userId!);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ok(res, { events: events.map((e: any) => sanitizeEvent(e)) });
}

export async function create(req: Request, res: Response) {
  const input = createEventSchema.parse(req.body);
  const event = await service.createEvent(req.userId!, input);
  return created(res, { event: sanitizeEvent(event) });
}

export async function getOne(req: Request, res: Response) {
  const event = await service.getOwnedEventOrCollaborator(req.userId!, req.params.eventId);
  // Real EventCollaborator membership, not just "isn't the owner" -- an
  // admin viewing this event via the support-mode bypass isn't the owner
  // either, but shouldn't be labeled a collaborator (see
  // isUserEventCollaborator's note in events.service.ts).
  const isCollaborator =
    event.userId !== req.userId ? await service.isUserEventCollaborator(req.userId!, event.id) : false;
  return ok(res, { event: { ...sanitizeEvent(event), isCollaborator } });
}

export async function update(req: Request, res: Response) {
  const input = updateEventSchema.parse(req.body);
  const event = await service.updateEvent(req.userId!, req.params.eventId, input);
  return ok(res, { event: sanitizeEvent(event) });
}

export async function uploadCoverImage(req: Request, res: Response) {
  if (!req.file) throw new BadRequestError("No image file was uploaded");
  const event = await service.uploadEventCoverImage(req.userId!, req.params.eventId, req.file);
  return ok(res, { event: sanitizeEvent(event) });
}

export async function downloadCoverImage(req: Request, res: Response) {
  await service.getOwnedEventOrCollaborator(req.userId!, req.params.eventId);
  const { data, mimeType } = await service.getEventCoverImageBytes(req.params.eventId);
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "private, max-age=300");
  res.send(data);
}

export async function remove(req: Request, res: Response) {
  await service.deleteEvent(req.userId!, req.params.eventId);
  return noContent(res);
}

export async function dashboard(req: Request, res: Response) {
  const result = await service.getEventDashboard(req.userId!, req.params.eventId);
  return ok(res, { ...result, event: sanitizeEvent(result.event) });
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
