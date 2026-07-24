import { Request, Response } from "express";
import { created, noContent, ok } from "../../lib/apiResponse";
import { createVendorSchema, listVendorsQuerySchema, updateVendorSchema } from "./vendors.schema";
import * as service from "./vendors.service";

export async function list(req: Request, res: Response) {
  const query = listVendorsQuerySchema.parse(req.query);
  const vendors = await service.listVendors(req.userId!, req.params.eventId, query);
  return ok(res, { vendors });
}

export async function summary(req: Request, res: Response) {
  const result = await service.getVendorSummary(req.userId!, req.params.eventId);
  return ok(res, result);
}

export async function create(req: Request, res: Response) {
  const input = createVendorSchema.parse(req.body);
  const vendor = await service.createVendor(req.userId!, req.params.eventId, input);
  return created(res, { vendor });
}

export async function update(req: Request, res: Response) {
  const input = updateVendorSchema.parse(req.body);
  const vendor = await service.updateVendor(req.userId!, req.params.eventId, req.params.vendorId, input);
  return ok(res, { vendor });
}

export async function remove(req: Request, res: Response) {
  await service.deleteVendor(req.userId!, req.params.eventId, req.params.vendorId);
  return noContent(res);
}
