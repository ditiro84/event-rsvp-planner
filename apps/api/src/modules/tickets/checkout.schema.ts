import { z } from "zod";

export const ticketCheckoutItemSchema = z.object({
  ticketTypeId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(100),
});

export const createTicketCheckoutSchema = z.object({
  buyerName: z.string().trim().min(1, "Name is required").max(200),
  buyerEmail: z.string().trim().email("Enter a valid email"),
  items: z.array(ticketCheckoutItemSchema).min(1, "Your cart is empty").max(50),
  // Which connected payout provider to route this checkout through, when
  // the event has more than one connected for the cart's currency -- same
  // convention as merchandise checkout (see orders.schema.ts).
  provider: z.enum(["STRIPE_CONNECT", "PAYSTACK", "PAYPAL"]).optional(),
});
export type CreateTicketCheckoutInput = z.infer<typeof createTicketCheckoutSchema>;

export const publicSlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const capturePaypalTicketOrderSchema = z.object({
  paypalOrderId: z.string().min(1),
});
export type CapturePaypalTicketOrderInput = z.infer<typeof capturePaypalTicketOrderSchema>;

export const ticketOrderIdParamsSchema = z.object({
  orderId: z.string().min(1),
});
