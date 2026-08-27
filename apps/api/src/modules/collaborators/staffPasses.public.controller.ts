import { Request, Response } from "express";
import { ok } from "../../lib/apiResponse";
import { staffScanGuestSchema, staffScanTicketSchema } from "./staffPasses.schema";
import * as service from "./staffPasses.service";

export async function getContext(req: Request, res: Response) {
  const { pass, event } = await service.getStaffPassContext(req.params.passToken);
  return ok(res, {
    passName: pass.name,
    eventName: event.name,
    eventDate: event.date,
    venueName: event.venueName,
  });
}

export async function scanGuest(req: Request, res: Response) {
  const input = staffScanGuestSchema.parse(req.body);
  const guest = await service.staffCheckInGuest(req.params.passToken, input.token);
  return ok(res, { guest });
}

export async function scanTicket(req: Request, res: Response) {
  const input = staffScanTicketSchema.parse(req.body);
  const result = await service.staffCheckInTicket(req.params.passToken, input.code);
  return ok(res, result);
}
