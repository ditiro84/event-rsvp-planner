-- Extend currency selection (added for products in 0006) to vendor costs
-- too. Renames the enum from ProductCurrency to the more accurate shared
-- name Currency, since it's now used by both products and vendors.

ALTER TYPE "ProductCurrency" RENAME TO "Currency";

ALTER TABLE "vendors" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'USD';
