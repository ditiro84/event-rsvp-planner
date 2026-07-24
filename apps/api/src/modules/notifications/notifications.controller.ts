import { Request, Response } from "express";
import { noContent, ok } from "../../lib/apiResponse";
import { listNotificationsQuerySchema } from "./notifications.schema";
import * as service from "./notifications.service";

export async function list(req: Request, res: Response) {
  const query = listNotificationsQuerySchema.parse(req.query);
  const result = await service.listNotifications(req.userId!, query);
  return ok(res, result);
}

export async function markRead(req: Request, res: Response) {
  const notification = await service.markRead(req.userId!, req.params.notificationId);
  return ok(res, { notification });
}

export async function markAllRead(req: Request, res: Response) {
  await service.markAllRead(req.userId!);
  return noContent(res);
}
