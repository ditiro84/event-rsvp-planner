-- Multi-processor payouts: each event can connect a Stripe Connect Express
-- account (USD/GBP), a Paystack Subaccount (NGN), and/or a PayPal payee
-- email, per currency, so guest merchandise payments route directly to the
-- planner rather than into EventFlow's own account. Orders now record which
-- currency/provider/payout account they were settled through, plus the
-- platform fee EventFlow took at the time (kept static per-order so a later
-- fee-percentage change doesn't rewrite historical order amounts).

CREATE TYPE "PayoutProvider" AS ENUM ('STRIPE_CONNECT', 'PAYSTACK', 'PAYPAL');

CREATE TABLE "event_payout_accounts" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "currency" "Currency" NOT NULL,
  "provider" "PayoutProvider" NOT NULL,
  "stripeAccountId" TEXT,
  "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
  "paystackSubaccountCode" TEXT,
  "paystackBankName" TEXT,
  "paystackAccountLast4" TEXT,
  "paypalEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "event_payout_accounts_eventId_currency_provider_key" ON "event_payout_accounts"("eventId", "currency", "provider");
CREATE INDEX "event_payout_accounts_eventId_idx" ON "event_payout_accounts"("eventId");

-- Existing orders table predates real checkout (it's been browse-only so
-- far -- see ShopSection.tsx), so a USD default here is just a safe
-- backstop, not expected to touch any live rows.
ALTER TABLE "orders" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'USD';
ALTER TABLE "orders" ADD COLUMN "provider" "PayoutProvider";
ALTER TABLE "orders" ADD COLUMN "payoutAccountId" TEXT REFERENCES "event_payout_accounts"("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD COLUMN "platformFeeCents" INTEGER;
ALTER TABLE "orders" ADD COLUMN "paystackReference" TEXT UNIQUE;
ALTER TABLE "orders" ADD COLUMN "paypalOrderId" TEXT UNIQUE;
