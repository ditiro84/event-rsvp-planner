import dotenv from "dotenv";
import path from "path";

// In test runs, tests/setup/globalSetup.ts writes a .env.test file pointing
// at an ephemeral local Postgres instance before any test file is imported.
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path: path.resolve(__dirname, "../../", envFile) });
dotenv.config(); // fallback: also load .env for anything not overridden above

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET", process.env.NODE_ENV === "test" ? "test-secret" : undefined),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  cookieName: process.env.COOKIE_NAME ?? "event_rsvp_token",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:5173",
  rsvpRateLimitMax: Number(process.env.RSVP_RATE_LIMIT_MAX ?? 20),
  rsvpRateLimitWindowMs: Number(process.env.RSVP_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
  // Optional: invite emails are disabled (with a clear error) until both of
  // these are set. Get an API key at https://resend.com and verify a sending
  // domain there before setting RESEND_FROM_EMAIL to an address on it.
  resendApiKey: process.env.RESEND_API_KEY,
  resendFromEmail: process.env.RESEND_FROM_EMAIL,
  // Optional: the event merchandise shop's checkout is disabled (with a
  // clear error) until both of these are set. Get keys at
  // https://dashboard.stripe.com/apikeys and set up an endpoint at
  // https://dashboard.stripe.com/webhooks pointing at
  // POST /api/webhooks/stripe (event: checkout.session.completed) to get
  // the webhook signing secret.
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  // This same key is also used for Stripe Connect (creating Express
  // accounts and Account Links for planner payout onboarding) -- Connect
  // itself doesn't need a separate secret, just needs to be turned on for
  // this Stripe account at https://dashboard.stripe.com/connect/overview.

  // Optional: Stripe requires "events on your account" (checkout.session.completed)
  // and "events on connected accounts" (account.updated, fired as a planner
  // completes Connect onboarding) to be configured as separate audiences on
  // a webhook destination. If you created a second destination for
  // connected-account events instead of adding that audience to the
  // existing one, it gets its own signing secret -- set that here so both
  // are accepted at the single POST /api/webhooks/stripe endpoint. If you
  // only have one destination covering both audiences, leave this unset.
  stripeConnectWebhookSecret: process.env.STRIPE_CONNECT_WEBHOOK_SECRET,

  // Optional: Nigerian (NGN) payouts via Paystack Subaccounts. Get a secret
  // key at https://dashboard.paystack.com/#/settings/developers. Without
  // this, planners can't connect an NGN payout account and NGN products
  // stay in the "not available to buy yet" state.
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,

  // Optional: PayPal as a cross-currency payout option. Create an app at
  // https://developer.paypal.com/dashboard/applications to get these.
  // paypalMode picks sandbox vs. live API base URLs.
  paypalClientId: process.env.PAYPAL_CLIENT_ID,
  paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET,
  paypalMode: (process.env.PAYPAL_MODE ?? "sandbox") as "sandbox" | "live",

  // Gadaova's cut of each merchandise sale, taken via each processor's
  // own fee mechanism (Stripe application_fee_amount, Paystack subaccount
  // split, PayPal platform_fees) so the rest lands directly with the
  // planner. A plain number (e.g. 5 = 5%), adjustable any time from the
  // Railway dashboard without a code change or redeploy of app logic.
  // Matches ticketFeePercent below -- both were 2.5%/5% before, now a flat
  // 5% across the board so organizers don't have to reason about two
  // different rates depending on what they're selling.
  platformFeePercent: Number(process.env.PLATFORM_FEE_PERCENT ?? 5),

  // Gadaova's cut of each public ticket sale. Applied the same way as
  // platformFeePercent (see orders.service.ts) -- kept as a separate env
  // var (rather than reusing platformFeePercent) so the two can still be
  // tuned independently later without a code change, even though they
  // currently share the same 5% default.
  ticketFeePercent: Number(process.env.TICKET_FEE_PERCENT ?? 5),
};
