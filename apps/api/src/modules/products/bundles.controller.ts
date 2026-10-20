import { Request, Response } from "express";
import { created, noContent, ok } from "../../lib/apiResponse";
import { createBundleSchema, updateBundleSchema } from "./bundles.schema";
import * as service from "./bundles.service";

export async function list(req: Request, res: Response) {
  const bundles = await service.listBundles(req.userId!, req.params.eventId);
  return ok(res, { bundles });
}

export async function create(req: Request, res: Response) {
  const input = createBundleSchema.parse(req.body);
  const bundle = await service.createBundle(req.userId!, req.params.eventId, input);
  return created(res, { bundle });
}

export async function update(req: Request, res: Response) {
  const input = updateBundleSchema.parse(req.body);
  const bundle = await service.updateBundle(req.userId!, req.params.eventId, req.params.bundleId, input);
  return ok(res, { bundle });
}

export async function remove(req: Request, res: Response) {
  await service.deleteBundle(req.userId!, req.params.eventId, req.params.bundleId);
  return noContent(res);
}
