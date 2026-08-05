import Stripe from "stripe";
import { env } from "../config/env";
import { BadRequestError } from "./errors";

// Lazily constructed (and only when actually needed) so the app can run with
// checkout/payouts disabled -- matching the same "clear error until
// configured" pattern as invite.service.ts's getResendClient(). Shared by
// orders.service.ts (guest checkout + webhook) and payouts.service.ts
// (Stripe Connect onboarding for planners), since both need the same key.
export function getStripeClient() {
  if (!env.stripeSecretKey) {
    throw new BadRequestError(
      "Stripe isn't configured yet. Add STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET) to enable checkout and payouts."
    );
  }
  return new Stripe(env.stripeSecretKey);
}
