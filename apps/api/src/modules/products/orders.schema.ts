import { z } from "zod";

export const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(100),
  // Guest-entered size for this line item (e.g. "M", "42") -- see
  // OrderItem.selectedSize in schema.prisma for why this is per-item rather
  // than per-product.
  selectedSize: z.string().trim().max(50).optional(),
});

// Address fields are only required when deliveryMethod is SHIPPING -- see
// the superRefine below. shippingAddressLine2 stays optional either way
// (apartment/suite number, not every address has one).
export const createCheckoutSchema = z
  .object({
    guestName: z.string().trim().min(1, "Name is required").max(200),
    guestEmail: z.string().trim().email("Enter a valid email"),
    guestId: z.string().trim().min(1).optional(),
    deliveryMethod: z.enum(["AT_EVENT", "SHIPPING"]).optional(),
    shippingAddressLine1: z.string().trim().min(1).max(200).optional(),
    shippingAddressLine2: z.string().trim().max(200).optional(),
    shippingCity: z.string().trim().min(1).max(120).optional(),
    shippingPostcode: z.string().trim().min(1).max(30).optional(),
    // ISO 3166-1 alpha-2 code, e.g. "GB" -- see the country dropdown in
    // apps/web/src/lib/countries.ts.
    shippingCountry: z.string().trim().length(2, "Select a country").optional(),
    // Full international format including dial code, e.g. "+44 7700 900000"
    // -- combined client-side from the dial-code select + number input, see
    // ShopSection.tsx.
    shippingPhone: z.string().trim().min(1).max(30).optional(),
    items: z.array(checkoutItemSchema).min(1, "Your cart is empty").max(50),
    // Which connected payout provider to route this checkout through, when
    // the event has more than one connected for the cart's currency (e.g.
    // both Stripe Connect and PayPal for USD). Omitted = use the default
    // preference order (see orders.service.ts).
    provider: z.enum(["STRIPE_CONNECT", "PAYSTACK", "PAYPAL"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryMethod !== "SHIPPING") return;
    const required: Array<[keyof typeof data, string]> = [
      ["shippingAddressLine1", "Address is required"],
      ["shippingCity", "City is required"],
      ["shippingPostcode", "Postcode is required"],
      ["shippingCountry", "Country is required"],
      ["shippingPhone", "Phone number is required"],
    ];
    for (const [field, message] of required) {
      if (!data[field]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
      }
    }
  });
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

export const rsvpTokenParamsSchema = z.object({
  token: z.string().min(1),
});

export const capturePaypalOrderSchema = z.object({
  paypalOrderId: z.string().min(1),
});
export type CapturePaypalOrderInput = z.infer<typeof capturePaypalOrderSchema>;
