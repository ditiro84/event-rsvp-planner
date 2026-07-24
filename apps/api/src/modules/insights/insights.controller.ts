import { Request, Response } from "express";
import { ok } from "../../lib/apiResponse";
import { listInsightsQuerySchema } from "./insights.schema";
import * as service from "./insights.service";

export async function list(req: Request, res: Response) {
  const query = listInsightsQuerySchema.parse(req.query);
  const insights = await service.listInsights(req.userId!, query.eventId);
  return ok(res, { insights });
}
