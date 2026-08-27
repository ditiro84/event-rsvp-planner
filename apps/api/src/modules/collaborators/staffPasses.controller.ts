import { Request, Response } from "express";
import { created, ok } from "../../lib/apiResponse";
import { createStaffPassSchema } from "./staffPasses.schema";
import * as service from "./staffPasses.service";

export async function list(req: Request, res: Response) {
  const passes = await service.listStaffPasses(req.userId!, req.params.eventId);
  return ok(res, { passes });
}

export async function create(req: Request, res: Response) {
  const input = createStaffPassSchema.parse(req.body);
  const pass = await service.createStaffPass(req.userId!, req.params.eventId, input.name);
  return created(res, { pass });
}

export async function revoke(req: Request, res: Response) {
  const pass = await service.revokeStaffPass(req.userId!, req.params.eventId, req.params.passId);
  return ok(res, { pass });
}
