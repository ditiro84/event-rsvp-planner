-- Public content management: admin-authored blog articles and an
-- admin-editable "Services" section on the landing page.

CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "articles" (
  "id" TEXT PRIMARY KEY,
  "authorId" TEXT NOT NULL REFERENCES "users"("id"),
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "excerpt" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "coverImageData" BYTEA,
  "coverImageMimeType" TEXT,
  "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "articles_status_publishedAt_idx" ON "articles"("status", "publishedAt");

CREATE TABLE "landing_services" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "icon" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "landing_services_isActive_sortOrder_idx" ON "landing_services"("isActive", "sortOrder");

-- Seed with the same six cards the landing page used to hard-code, so the
-- page looks identical the moment this ships -- from here on, an admin
-- manages these from the Services tab instead of a code deploy.
INSERT INTO "landing_services" ("id", "title", "description", "icon", "sortOrder", "isActive", "updatedAt") VALUES
  ('svc_guests', 'Guest management', 'Import your guest list, track RSVPs, and manage plus-ones and named companions in one view.', 'Users', 0, true, CURRENT_TIMESTAMP),
  ('svc_rsvp', 'RSVP & invitations', 'Send personalized invites by email, WhatsApp, or QR code, and collect RSVPs on a branded page.', 'Mail', 1, true, CURRENT_TIMESTAMP),
  ('svc_seating', 'Visual seating planner', 'Design your own table layout and drag guests into seats -- no spreadsheet math required.', 'Armchair', 2, true, CURRENT_TIMESTAMP),
  ('svc_checkin', 'Day-of check-in', 'A kiosk-ready check-in view with live arrival stats, so your door team always knows who''s in.', 'ClipboardCheck', 3, true, CURRENT_TIMESTAMP),
  ('svc_vendors', 'Vendor tracking', 'Keep every vendor''s contact info, cost, and booking status in one place instead of scattered notes.', 'Store', 4, true, CURRENT_TIMESTAMP),
  ('svc_payments', 'Merchandise & payments', 'Sell tickets or merchandise at checkout, with payouts in USD, GBP, or NGN via Stripe, PayPal, or Paystack.', 'CreditCard', 5, true, CURRENT_TIMESTAMP);
