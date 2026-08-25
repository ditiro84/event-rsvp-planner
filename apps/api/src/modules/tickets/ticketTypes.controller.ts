import { Request, Response } from "express";
import { created, noContent, ok } from "../../lib/apiResponse";
import { createTicketTypeSchema, reorderTicketTypesSchema, updateTicketTypeSchema } from "./ticketTypes.schema";
import * as service from "./ticketTypes.service";

export async function list(req: Request, res: Response) {
  const ticketTypes = await service.listTicketTypes(req.userId!, req.params.eventId);
  return ok(res, { ticketTypes });
}

export async function create(req: Request, res: Response) {
  const input = createTicketTypeSchema.parse(req.body);
  const ticketType = await service.createTicketType(req.userId!, req.params.eventId, input);
  return created(res, { ticketType });
}

export async function update(req: Request, res: Response) {
  const input = updateTicketTypeSchema.parse(req.body);
  const ticketType = await service.updateTicketType(req.userId!, req.params.eventId, req.params.ticketTypeId, input);
  return ok(res, { ticketType });
}

export async function remove(req: Request, res: Response) {
  await service.deleteTicketType(req.userId!, req.params.eventId, req.params.ticketTypeId);
  return noContent(res);
}

export async function reorder(req: Request, res: Response) {
  const input = reorderTicketTypesSchema.parse(req.body);
  const ticketTypes = await service.reorderTicketTypes(req.userId!, req.params.eventId, input.orderedIds);
  return ok(res, { ticketTypes });
}
