-- Host-designed invitation card (PDF or image), one per event, attached to
-- invite emails and linked in WhatsApp invite messages.

CREATE TABLE "event_invitation_cards" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL UNIQUE REFERENCES "events"("id") ON DELETE CASCADE,
  "data" BYTEA NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
