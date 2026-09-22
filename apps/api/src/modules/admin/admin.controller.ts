import { Request, Response } from "express";
import { ok } from "../../lib/apiResponse";
import { auditLogQuerySchema, editSubscriberSchema, emailEventsQuerySchema, paymentEventsQuerySchema } from "./admin.schema";
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

export async function emailEvents(req: Request, res: Response) {
  const query = emailEventsQuerySchema.parse(req.query);
  const entries = await service.getEmailEvents(query);
  return ok(res, { entries });
}

export async function analytics(_req: Request, res: Response) {
  const data = await service.getPlatformAnalytics();
  return ok(res, data);
}


export async function editSubscriber(req: Request, res: Response) {
  const input = editSubscriberSchema.parse(req.body);
  const user = await service.editSubscriber(req.userId as string, req.params.userId, input);
  return ok(res, { user });
}

export async function archiveSubscriber(req: Request, res: Response) {
  await service.archiveSubscriber(req.userId as string, req.params.userId);
  return ok(res, { archived: true });
}

export async function restoreSubscriber(req: Request, res: Response) {
  await service.restoreSubscriber(req.userId as string, req.params.userId);
  return ok(res, { restored: true });
}

export async function deleteSubscriber(req: Request, res: Response) {
  await service.hardDeleteSubscriber(req.userId as string, req.params.userId);
  return ok(res, { deleted: true });
}
