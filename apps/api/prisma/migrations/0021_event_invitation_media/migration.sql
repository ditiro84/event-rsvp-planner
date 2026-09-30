-- Multiple invitation media items per event (images, PDFs, and short video
-- clips) replacing the single EventInvitationCard -- hosts can build a
-- small gallery guests page through on the RSVP page instead of one static
-- card. Existing cards are carried over as each event's first item (position
-- 0) so nobody loses what they already uploaded.

CREATE TABLE "event_invitation_media" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "position" INTEGER NOT NULL DEFAULT 0,
  "data" BYTEA NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "event_invitation_media_eventId_position_idx" ON "event_invitation_media"("eventId", "position");

INSERT INTO "event_invitation_media" ("id", "eventId", "position", "data", "mimeType", "fileName", "size", "createdAt", "updatedAt")
SELECT "id", "eventId", 0, "data", "mimeType", "fileName", "size", "createdAt", "updatedAt"
FROM "event_invitation_cards";

DROP TABLE "event_invitation_cards";
