-- Guest self-reported "I've already sent payment" flag, shown only for
-- orders with no in-app payment processor connected (see
-- OrderStatus.MANUAL). Never auto-confirms payment on its own.
ALTER TABLE "orders" ADD COLUMN "guestMarkedPaid" BOOLEAN NOT NULL DEFAULT false;
