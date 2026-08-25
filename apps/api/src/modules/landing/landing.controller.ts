import { Request, Response } from "express";
import { created, noContent, ok } from "../../lib/apiResponse";
import { createServiceSchema, reorderServicesSchema, updateServiceSchema } from "./landing.schema";
import * as service from "./landing.service";

// --- Admin -----------------------------------------------------------------

export async function list(_req: Request, res: Response) {
  const services = await service.listAllServices();
  return ok(res, { services });
}

export async function create(req: Request, res: Response) {
  const input = createServiceSchema.parse(req.body);
  const created_ = await service.createService(input);
  return created(res, { service: created_ });
}

export async function update(req: Request, res: Response) {
  const input = updateServiceSchema.parse(req.body);
  const updated = await service.updateService(req.params.serviceId, input);
  return ok(res, { service: updated });
}

export async function remove(req: Request, res: Response) {
  await service.deleteService(req.params.serviceId);
  return noContent(res);
}

export async function reorder(req: Request, res: Response) {
  const input = reorderServicesSchema.parse(req.body);
  const services = await service.reorderServices(input);
  return ok(res, { services });
}

// --- Public ------------------------------------------------------------

export async function publicList(_req: Request, res: Response) {
  const services = await service.listActiveServices();
  return ok(res, { services });
}
