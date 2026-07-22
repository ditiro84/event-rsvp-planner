import { Request, Response } from "express";
import { created, noContent, ok } from "../../lib/apiResponse";
import { BadRequestError } from "../../lib/errors";
import { createGuestSchema, listGuestsQuerySchema, updateGuestSchema } from "./guests.schema";
import * as service from "./guests.service";
import { guestsToCsv, parseGuestsCsv } from "./guests.csv";

export async function list(req: Request, res: Response) {
  const query = listGuestsQuerySchema.parse(req.query);
  const guests = await service.listGuests(req.userId!, req.params.eventId, query);
  return ok(res, { guests });
}

export async function create(req: Request, res: Response) {
  const input = createGuestSchema.parse(req.body);
  const guest = await service.createGuest(req.userId!, req.params.eventId, input);
  return created(res, { guest });
}

export async function getOne(req: Request, res: Response) {
  const guest = await service.getOwnedGuest(req.userId!, req.params.guestId);
  return ok(res, { guest });
}

export async function update(req: Request, res: Response) {
  const input = updateGuestSchema.parse(req.body);
  const guest = await service.updateGuest(req.userId!, req.params.guestId, input);
  return ok(res, { guest });
}

export async function remove(req: Request, res: Response) {
  await service.deleteGuest(req.userId!, req.params.guestId);
  return noContent(res);
}

export async function importCsv(req: Request, res: Response) {
  if (!req.file) {
    throw new BadRequestError("No CSV file uploaded (field name: file)");
  }
  const rows = parseGuestsCsv(req.file.buffer);
  const guests = await service.bulkCreateGuests(req.userId!, req.params.eventId, rows);
  return created(res, { imported: guests.length, guests });
}

export async function exportCsv(req: Request, res: Response) {
  const guests = await service.getGuestsForExport(req.userId!, req.params.eventId);
  const csv = guestsToCsv(guests);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="guests-${req.params.eventId}.csv"`);
  return res.status(200).send(csv);
}
