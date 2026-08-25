import { Request, Response } from "express";
import { ok } from "../../lib/apiResponse";
import { capturePaypalTicketOrderSchema, createTicketCheckoutSchema } from "./checkout.schema";
import * as checkoutService from "./checkout.service";

export async function publicEvent(req: Request, res: Response) {
  const result = await checkoutService.getPublicTicketEvent(req.params.slug);
  return ok(res, result);
}

export async function publicCoverImage(req: Request, res: Response) {
  const { data, mimeType } = await checkoutService.getPublicTicketEventCoverImageBytes(req.params.slug);
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(data);
}

export async function publicOrder(req: Request, res: Response) {
  const order = await checkoutService.getPublicTicketOrder(req.params.orderId);
  return ok(res, { order });
}

export async function checkout(req: Request, res: Response) {
  const input = createTicketCheckoutSchema.parse(req.body);
  const result = await checkoutService.createTicketCheckoutSession(req.params.slug, input);
  return ok(res, result);
}

// Called by the frontend once the guest approves payment on PayPal's site
// and lands back on the public ticket page (see checkout.service.ts
// captureTicketPaypalCheckout).
export async function capturePaypal(req: Request, res: Response) {
  const input = capturePaypalTicketOrderSchema.parse(req.body);
  const order = await checkoutService.captureTicketPaypalCheckout(req.params.slug, input.paypalOrderId);
  return ok(res, { order });
}
