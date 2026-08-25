-- Admin/support tooling: a role on User (PLANNER/ADMIN), a generic audit log
-- of admin actions taken on subscribers' events, and a payment event log
-- capturing every Stripe/Paystack/PayPal payment attempt (success, decline,
-- failure, expiry) -- not just the ones that resulted in a PAID order -- as
-- evidence for disputes.

CREATE TYPE "UserRole" AS ENUM ('PLANNER', 'ADMIN');
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'PLANNER';

CREATE TABLE "admin_audit_logs" (
  "id" TEXT PRIMARY KEY,
  "adminUserId" TEXT NOT NULL,
  "adminEmail" TEXT NOT NULL,
  "eventId" TEXT,
  "eventName" TEXT,
  "method" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "admin_audit_logs_adminUserId_idx" ON "admin_audit_logs"("adminUserId");
CREATE INDEX "admin_audit_logs_eventId_idx" ON "admin_audit_logs"("eventId");

CREATE TYPE "PaymentEventStatus" AS ENUM ('SUCCESS', 'FAILED', 'EXPIRED', 'INFO');

CREATE TABLE "payment_events" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT REFERENCES "events"("id") ON DELETE SET NULL,
  "orderId" TEXT REFERENCES "orders"("id") ON DELETE SET NULL,
  "provider" "PayoutProvider",
  "type" TEXT NOT NULL,
  "status" "PaymentEventStatus" NOT NULL,
  "amountCents" INTEGER,
  "currency" "Currency",
  "message" TEXT,
  "rawPayload" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "payment_events_eventId_idx" ON "payment_events"("eventId");
CREATE INDEX "payment_events_orderId_idx" ON "payment_events"("orderId");

-- Bootstrap the first admin. Safe/idempotent: a no-op if this account
-- doesn't exist yet or is already an admin.
UPDATE "users" SET "role" = 'ADMIN' WHERE "email" = 'olaabiri84@gmail.com';
