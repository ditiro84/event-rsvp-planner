import { Request, Response } from "express";
import { created, noContent, ok } from "../../lib/apiResponse";
import { createEventSchema, updateEventSchema } from "./events.schema";
import * as service from "./events.service";

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
