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
});
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

export const rsvpTokenParamsSchema = z.object({
  token: z.string().min(1),
});
