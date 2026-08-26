-- Log of every outbound transactional email attempt. Guest invite sends and
-- RSVP reminder sends share the same code path (see sendInviteEmail in
-- invite.service.ts), so one table covers both -- lets a planner see which
-- sends succeeded or failed, and why, without needing server log access.

CREATE TYPE "EmailEventStatus" AS ENUM ('SENT', 'FAILED');

CREATE TABLE "email_events" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT REFERENCES "events"("id") ON DELETE SET NULL,
  "guestId" TEXT REFERENCES "guests"("id") ON DELETE SET NULL,
  "recipientEmail" TEXT NOT NULL,
  "recipientName" TEXT,
  "subject" TEXT NOT NULL,
  "status" "EmailEventStatus" NOT NULL,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "email_events_eventId_idx" ON "email_events"("eventId");
CREATE INDEX "email_events_guestId_idx" ON "email_events"("guestId");
