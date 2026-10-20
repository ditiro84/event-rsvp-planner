CREATE TABLE "product_bundles" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceCents" INTEGER NOT NULL,
  "currency" "Currency" NOT NULL DEFAULT 'USD',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_bundles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_bundle_items" (
  "id" TEXT NOT NULL,
  "bundleId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "product_bundle_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_bundles_eventId_idx" ON "product_bundles"("eventId");
CREATE UNIQUE INDEX "product_bundle_items_bundleId_productId_key" ON "product_bundle_items"("bundleId", "productId");
CREATE INDEX "product_bundle_items_productId_idx" ON "product_bundle_items"("productId");

ALTER TABLE "product_bundles" ADD CONSTRAINT "product_bundles_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "product_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "bundleName" TEXT;
