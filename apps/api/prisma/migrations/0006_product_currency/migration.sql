-- Per-product currency selection for the merchandise shop (USD/GBP/NGN).
-- Purely a display/storage label -- no live FX conversion, and orders don't
-- carry a currency yet since checkout is still a v2 feature.

CREATE TYPE "ProductCurrency" AS ENUM ('USD', 'GBP', 'NGN');

ALTER TABLE "products" ADD COLUMN "currency" "ProductCurrency" NOT NULL DEFAULT 'USD';
