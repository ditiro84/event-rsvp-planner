-- Public ticketing: lets an event opt into selling tickets to the public
-- (nightclub nights, boat cruises, etc.) instead of -- or alongside -- the
-- private RSVP guest-list flow. Reuses the existing Order/OrderItem/payout
-- machinery (see OrderKind) rather than a parallel checkout system.

-- events: public listing fields
CREATE TYPE "PublicEventCategory" AS ENUM ('NIGHTLIFE', 'BOAT_CRUISE', 'CONCERT', 'FESTIVAL', 'COMEDY_SHOW', 'PRIVATE_PARTY', 'OTHER');

ALTER TABLE "events" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN "publicCategory" "PublicEventCategory";
ALTER TABLE "events" ADD COLUMN "publicSlug" TEXT;
ALTER TABLE "events" ADD COLUMN "publicDescription" TEXT;
ALTER TABLE "events" ADD COLUMN "minAge" INTEGER;
ALTER TABLE "events" ADD COLUMN "coverImageData" BYTEA;
ALTER TABLE "events" ADD COLUMN "coverImageMimeType" TEXT;

CREATE UNIQUE INDEX "events_publicSlug_key" ON "events"("publicSlug");

-- orders: which flow this order belongs to
CREATE TYPE "OrderKind" AS ENUM ('MERCHANDISE', 'TICKET');
ALTER TABLE "orders" ADD COLUMN "kind" "OrderKind" NOT NULL DEFAULT 'MERCHANDISE';

-- ticket_types
CREATE TABLE "ticket_types" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceCents" INTEGER NOT NULL,
  "currency" "Currency" NOT NULL,
  "quantityTotal" INTEGER,
  "quantitySold" INTEGER NOT NULL DEFAULT 0,
  "salesStartAt" TIMESTAMP(3),
  "salesEndAt" TIMESTAMP(3),
  "minPerOrder" INTEGER NOT NULL DEFAULT 1,
  "maxPerOrder" INTEGER NOT NULL DEFAULT 10,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ticket_types_eventId_idx" ON "ticket_types"("eventId");

-- order_items: optional link to a ticket type (parallel to productId)
ALTER TABLE "order_items" ADD COLUMN "ticketTypeId" TEXT REFERENCES "ticket_types"("id") ON DELETE SET NULL;

-- tickets: one row per issued/scannable ticket
CREATE TYPE "TicketStatus" AS ENUM ('VALID', 'CHECKED_IN', 'CANCELLED');

CREATE TABLE "tickets" (
  "id" TEXT PRIMARY KEY,
  "ticketTypeId" TEXT NOT NULL REFERENCES "ticket_types"("id") ON DELETE CASCADE,
  "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "code" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'VALID',
  "attendeeName" TEXT,
  "attendeeEmail" TEXT,
  "checkedInAt" TIMESTAMP(3),
  "checkedInBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "tickets_code_key" ON "tickets"("code");
CREATE INDEX "tickets_ticketTypeId_idx" ON "tickets"("ticketTypeId");
CREATE INDEX "tickets_orderId_idx" ON "tickets"("orderId");
