import { z } from "zod";

// Stripe Connect covers USD (US-country Express account), GBP (GB-country),
// CAD (CA-country) and EUR (planner picks one of the supported eurozone
// countries, since EUR spans many Stripe countries) -- NGN isn't a supported Stripe Connect country at all,
// so Naira payouts go through Paystack Subaccounts instead (see #117).
export const STRIPE_EUR_COUNTRIES = [
  "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR",
  "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK",
] as const;

export const connectStripeSchema = z
  .object({
    currency: z.enum(["USD", "GBP", "CAD", "EUR"]),
    country: z.enum(STRIPE_EUR_COUNTRIES).optional(),
  })
  .refine((v) => v.currency !== "EUR" || v.country !== undefined, {
    message: "Select the country your bank account is in",
    path: ["country"],
  });
export type ConnectStripeInput = z.infer<typeof connectStripeSchema>;

export const payoutAccountIdParamsSchema = z.object({
  eventId: z.string().min(1),
  payoutAccountId: z.string().min(1),
});

// Nigerian bank account details, submitted directly to Paystack to create a
// Subaccount -- the account number transits our backend once but is never
// persisted (see payouts.service.ts connectPaystack).
export const connectPaystackSchema = z.object({
  bankCode: z.string().trim().min(1, "Select a bank"),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Nigerian account numbers are 10 digits"),
});
export type ConnectPaystackInput = z.infer<typeof connectPaystackSchema>;

// Unlike Stripe Connect/Paystack, PayPal's payee.email_address routing
// needs no hosted onboarding or account-number handoff -- just the
// planner's own PayPal email, connected per currency like the other two
// providers (see payouts.service.ts connectPaypal).
export const connectPaypalSchema = z.object({
  currency: z.enum(["USD", "GBP", "NGN", "CAD"]),
  email: z.string().trim().email("Enter a valid PayPal email address"),
});
export type ConnectPaypalInput = z.infer<typeof connectPaypalSchema>;
