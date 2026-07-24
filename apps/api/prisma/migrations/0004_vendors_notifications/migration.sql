-- Vendors (per-event booking pipeline) and Notifications (per-user inbox),
-- backing the new Vendors nav section and notification bell from the
-- desktop mockups.

CREATE TYPE "VendorCategory" AS ENUM (
  'CATERING', 'VENUE', 'PHOTOGRAPHY', 'VIDEOGRAPHY', 'FLORAL',
  'MUSIC_ENTERTAINMENT', 'DECOR', 'RENTALS', 'TRANSPORTATION',
  'BEAUTY', 'STATIONERY', 'OTHER'
);

CREATE TYPE "VendorStatus" AS ENUM (
  'CONTACTED', 'QUOTE_RECEIVED', 'BOOKED', 'CONFIRMED', 'CANCELLED'
);

CREATE TABLE "vendors" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "category" "VendorCategory" NOT NULL DEFAULT 'OTHER',
  "status" "VendorStatus" NOT NULL DEFAULT 'CONTACTED',
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "website" TEXT,
  "costCents" INTEGER,
  "depositPaid" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "vendors_eventId_idx" ON "vendors"("eventId");

CREATE TYPE "NotificationType" AS ENUM (
  'RSVP_CONFIRMED', 'RSVP_DECLINED', 'VENDOR_STATUS_CHANGED', 'SYSTEM'
);

CREATE TABLE "notifications" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "eventId" TEXT REFERENCES "events"("id") ON DELETE CASCADE,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "link" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");
CREATE INDEX "notifications_eventId_idx" ON "notifications"("eventId");
