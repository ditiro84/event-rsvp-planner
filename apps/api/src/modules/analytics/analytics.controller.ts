import { Request, Response } from "express";
import { ok } from "../../lib/apiResponse";
import * as service from "./analytics.service";

export async function overview(req: Request, res: Response) {
  const result = await service.getAnalyticsOverview(req.userId!);
  return ok(res, result);
}
