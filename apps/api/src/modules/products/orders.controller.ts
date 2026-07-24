import { Request, Response } from "express";
import { ok } from "../../lib/apiResponse";
import { createCheckoutSchema } from "./orders.schema";
import * as ordersService from "./orders.service";
import * as productsService from "./products.service";

export async function list(req: Request, res: Response) {
  const orders = await ordersService.listOrders(req.userId!, req.params.eventId);
  return ok(res, { orders });
}

export async function summary(req: Request, res: Response) {
  const result = await ordersService.getOrdersSummary(req.userId!, req.params.eventId);
  return ok(res, result);
}

// --- Public (guest-facing shop) ----------------------------------------------

export async function publicListProducts(req: Request, res: Response) {
  const result = await productsService.listPublicProducts(req.params.token);
  return ok(res, result);
}

export async function publicProductImage(req: Request, res: Response) {
  const { data, mimeType } = await productsService.getProductImageBytes(req.params.productId);
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(data);
}

export async function checkout(req: Request, res: Response) {
  const input = createCheckoutSchema.parse(req.body);
  const result = await ordersService.createCheckoutSession(req.params.token, input);
  return ok(res, result);
}
