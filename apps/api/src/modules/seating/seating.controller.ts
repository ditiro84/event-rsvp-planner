import { Request, Response } from "express";
import { created, noContent, ok } from "../../lib/apiResponse";
import * as service from "./seating.service";
import {
  assignGuestSchema,
  createLayoutObjectSchema,
  createTableSchema,
  updateLayoutObjectSchema,
  updateLayoutSchema,
  updateTableSchema,
} from "./seating.schema";

// --- Layout ---------------------------------------------------------------

export async function getLayout(req: Request, res: Response) {
  const layout = await service.getOrCreateLayout(req.userId!, req.params.eventId);
  return ok(res, { layout });
}

export async function updateLayout(req: Request, res: Response) {
  const input = updateLayoutSchema.parse(req.body);
  const layout = await service.updateLayout(req.userId!, req.params.eventId, input);
  return ok(res, { layout });
}

export async function createLayoutObject(req: Request, res: Response) {
  const input = createLayoutObjectSchema.parse(req.body);
  const object = await service.createLayoutObject(req.userId!, req.params.eventId, input);
  return created(res, { object });
}

export async function updateLayoutObject(req: Request, res: Response) {
  const input = updateLayoutObjectSchema.parse(req.body);
  const object = await service.updateLayoutObject(req.userId!, req.params.eventId, req.params.objectId, input);
  return ok(res, { object });
}

export async function deleteLayoutObject(req: Request, res: Response) {
  await service.deleteLayoutObject(req.userId!, req.params.eventId, req.params.objectId);
  return noContent(res);
}

// --- Tables ----------------------------------------------------------------

export async function listTables(req: Request, res: Response) {
  const tables = await service.listTables(req.userId!, req.params.eventId);
  return ok(res, { tables });
}

export async function createTable(req: Request, res: Response) {
  const input = createTableSchema.parse(req.body);
  const table = await service.createTable(req.userId!, req.params.eventId, input);
  return created(res, { table });
}

export async function updateTable(req: Request, res: Response) {
  const input = updateTableSchema.parse(req.body);
  const result = await service.updateTable(req.userId!, req.params.eventId, req.params.tableId, input);
  return ok(res, result);
}

export async function deleteTable(req: Request, res: Response) {
  await service.deleteTable(req.userId!, req.params.eventId, req.params.tableId);
  return noContent(res);
}

// --- Seating map & assignments ---------------------------------------------

export async function getSeatingMap(req: Request, res: Response) {
  const map = await service.getSeatingMap(req.userId!, req.params.eventId);
  return ok(res, map);
}

export async function assignGuest(req: Request, res: Response) {
  const input = assignGuestSchema.parse(req.body);
  const result = await service.assignGuest(req.userId!, req.params.eventId, input);
  return created(res, result);
}

export async function unassignGuest(req: Request, res: Response) {
  await service.unassignGuest(req.userId!, req.params.eventId, req.params.guestId);
  return noContent(res);
}

export async function unassignPartyMember(req: Request, res: Response) {
  await service.unassignPartyMember(req.userId!, req.params.eventId, req.params.partyMemberId);
  return noContent(res);
}
