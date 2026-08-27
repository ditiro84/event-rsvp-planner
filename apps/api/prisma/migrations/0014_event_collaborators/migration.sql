-- Event-scoped staff access, two tiers:
-- 1. EventCollaborator: a registered user added to a single event by its
--    owner, with restricted (non-owner) access -- see getOwnedEventOrCollaborator
--    in events.service.ts. Removing a row revokes access immediately.
-- 2. EventCollaboratorInvite: a pending invite for an email with no account
--    yet, resolved into an EventCollaborator on that email's next register/login.
-- 3. EventStaffPass: a named, revocable no-account link for door check-in
--    duty only, so a dismissed staff member can be cut off mid-event
--    without disrupting anyone else's pass.

CREATE TYPE "EventCollaboratorRole" AS ENUM ('STAFF');

CREATE TABLE "event_collaborators" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "EventCollaboratorRole" NOT NULL DEFAULT 'STAFF',
  "invitedByUserId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "event_collaborators_eventId_userId_key" ON "event_collaborators"("eventId", "userId");
CREATE INDEX "event_collaborators_eventId_idx" ON "event_collaborators"("eventId");
CREATE INDEX "event_collaborators_userId_idx" ON "event_collaborators"("userId");

CREATE TABLE "event_collaborator_invites" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "invitedByUserId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "event_collaborator_invites_token_key" ON "event_collaborator_invites"("token");
CREATE UNIQUE INDEX "event_collaborator_invites_eventId_email_key" ON "event_collaborator_invites"("eventId", "email");
CREATE INDEX "event_collaborator_invites_eventId_idx" ON "event_collaborator_invites"("eventId");
CREATE INDEX "event_collaborator_invites_email_idx" ON "event_collaborator_invites"("email");

CREATE TABLE "event_staff_passes" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "event_staff_passes_token_key" ON "event_staff_passes"("token");
CREATE INDEX "event_staff_passes_eventId_idx" ON "event_staff_passes"("eventId");
