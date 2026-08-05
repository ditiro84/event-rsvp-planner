import { z } from "zod";

export const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(100),
});

export const createCheckoutSchema = z.object({
  guestName: z.string().trim().min(1, "Name is required").max(200),
  guestEmail: z.string().trim().email("Enter a valid email"),
  guestId: z.string().trim().min(1).optional(),
  deliveryMethod: z.enum(["AT_EVENT"]).optional(),
  items: z.array(checkoutItemSchema).min(1, "Your cart is empty").max(50),
  // Which connected payout provider to route this checkout through, when
  // the event has more than one connected for the cart's currency (e.g.
  // both Stripe Connect and PayPal for USD). Omitted = use the default
  // preference order (see orders.service.ts).
  provider: z.enum(["STRIPE_CONNECT", "PAYSTACK", "PAYPAL"]).optional(),
});
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

export const rsvpTokenParamsSchema = z.object({
  token: z.string().min(1),
});

export const capturePaypalOrderSchema = z.object({
  paypalOrderId: z.string().min(1),
});
export type CapturePaypalOrderInput = z.infer<typeof capturePaypalOrderSchema>;
