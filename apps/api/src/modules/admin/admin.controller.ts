import { Request, Response } from "express";
import { ok } from "../../lib/apiResponse";
import { auditLogQuerySchema, paymentEventsQuerySchema } from "./admin.schema";
import * as service from "./admin.service";

export async function listUsers(_req: Request, res: Response) {
  const users = await service.listAllUsers();
  return ok(res, { users });
}

export async function listEvents(_req: Request, res: Response) {
  const events = await service.listAllEvents();
  return ok(res, { events });
}

export async function auditLog(req: Request, res: Response) {
  const query = auditLogQuerySchema.parse(req.query);
  const entries = await service.getAuditLog(query);
  return ok(res, { entries });
}

export async function paymentEvents(req: Request, res: Response) {
  const query = paymentEventsQuerySchema.parse(req.query);
  const entries = await service.getPaymentEvents(query);
  return ok(res, { entries });
}
