-- Optional shipping address on merchandise orders. Guests choosing "Ship to
-- me" at checkout (see ShopSection.tsx) now provide a delivery address,
-- stored directly on the order -- same snapshot convention as OrderItem's
-- productName/unitPriceCents -- so a later change doesn't rewrite what was
-- actually collected at checkout time. All nullable: existing AT_EVENT
-- orders (and any future ones) never populate these.
ALTER TABLE "orders" ADD COLUMN "shippingAddressLine1" TEXT;
ALTER TABLE "orders" ADD COLUMN "shippingAddressLine2" TEXT;
ALTER TABLE "orders" ADD COLUMN "shippingCity" TEXT;
ALTER TABLE "orders" ADD COLUMN "shippingPostcode" TEXT;
ALTER TABLE "orders" ADD COLUMN "shippingCountry" TEXT;
-- Full international format including dial code (e.g. "+44 7700 900000").
ALTER TABLE "orders" ADD COLUMN "shippingPhone" TEXT;
