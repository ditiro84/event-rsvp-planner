import { Request, Response } from "express";
import { created, noContent, ok } from "../../lib/apiResponse";
import { BadRequestError } from "../../lib/errors";
import { createProductSchema, updateProductSchema } from "./products.schema";
import * as service from "./products.service";

export async function list(req: Request, res: Response) {
  const products = await service.listProducts(req.userId!, req.params.eventId);
  return ok(res, { products });
}

export async function create(req: Request, res: Response) {
  const input = createProductSchema.parse(req.body);
  const product = await service.createProduct(req.userId!, req.params.eventId, input);
  return created(res, { product });
}

export async function update(req: Request, res: Response) {
  const input = updateProductSchema.parse(req.body);
  const product = await service.updateProduct(req.userId!, req.params.eventId, req.params.productId, input);
  return ok(res, { product });
}

export async function remove(req: Request, res: Response) {
  await service.deleteProduct(req.userId!, req.params.eventId, req.params.productId);
  return noContent(res);
}

export async function uploadImage(req: Request, res: Response) {
  if (!req.file) throw new BadRequestError("No image file was uploaded");
  const product = await service.uploadProductImage(req.userId!, req.params.eventId, req.params.productId, req.file);
  return ok(res, { product });
}

export async function downloadImage(req: Request, res: Response) {
  await service.getOwnedProduct(req.userId!, req.params.eventId, req.params.productId);
  const { data, mimeType } = await service.getProductImageBytes(req.params.productId);
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "private, max-age=300");
  res.send(data);
}
