-- Event merchandise (guest shop): planners list products, guests buy them
-- via Stripe Checkout during RSVP, orders are tracked per event. Backs the
-- "Event Merchandise" dashboard and Add/Edit Product modal mockups.

ALTER TABLE "events" ADD COLUMN "merchandiseEnabled" BOOLEAN NOT NULL DEFAULT false;

-- New notification type for "an order was paid" alerts to the planner.
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_PAID';

CREATE TABLE "products" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceCents" INTEGER NOT NULL,
  "stockQuantity" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "imageData" BYTEA,
  "imageMimeType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "products_eventId_idx" ON "products"("eventId");

CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

CREATE TABLE "orders" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "guestId" TEXT REFERENCES "guests"("id") ON DELETE SET NULL,
  "guestName" TEXT NOT NULL,
  "guestEmail" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "totalCents" INTEGER NOT NULL,
  "deliveryMethod" TEXT NOT NULL DEFAULT 'AT_EVENT',
  "stripeCheckoutSessionId" TEXT UNIQUE,
  "stripePaymentIntentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "orders_eventId_idx" ON "orders"("eventId");
CREATE INDEX "orders_eventId_status_idx" ON "orders"("eventId", "status");

CREATE TABLE "order_items" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "productId" TEXT REFERENCES "products"("id") ON DELETE SET NULL,
  "productName" TEXT NOT NULL,
  "unitPriceCents" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL
);
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");
