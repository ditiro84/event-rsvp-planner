import { Request, Response } from "express";
import { ok } from "../../lib/apiResponse";
import { capturePaypalOrderSchema, createCheckoutSchema, guestOrdersQuerySchema, updateOrderDeliverySchema } from "./orders.schema";
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

export async function paymentEvents(req: Request, res: Response) {
  const events = await ordersService.listPaymentEvents(req.userId!, req.params.eventId);
  return ok(res, { events });
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

// Called by the frontend once the guest approves payment on PayPal's site
// and lands back on our RSVP page (see orders.service.ts capturePaypalCheckout).
export async function capturePaypal(req: Request, res: Response) {
  const input = capturePaypalOrderSchema.parse(req.body);
  const order = await ordersService.capturePaypalCheckout(req.params.token, input.paypalOrderId);
  return ok(res, { order });
}

// Lets a returning guest see order(s) they've already placed for this
// event, so the frontend can offer "edit delivery details" instead of only
// a fresh checkout -- see orders.service.ts getGuestOrders.
export async function myOrders(req: Request, res: Response) {
  const { guestId } = guestOrdersQuerySchema.parse(req.query);
  const orders = await ordersService.getGuestOrders(req.params.token, guestId);
  return ok(res, { orders });
}

export async function updateDelivery(req: Request, res: Response) {
  const input = updateOrderDeliverySchema.parse(req.body);
  const order = await ordersService.updateOrderDelivery(req.params.token, req.params.orderId, input);
  return ok(res, { order });
}
