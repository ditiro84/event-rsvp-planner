-- Event RSVP & Visual Seating Planner - Initial schema
-- Hand-authored to exactly match prisma/schema.prisma (see note in DEPLOYMENT.md:
-- this file was written by hand because this development sandbox could not reach
-- binaries.prisma.sh to run `prisma migrate dev`. It follows Prisma's standard
-- migration output format and layout so `prisma migrate deploy` in a normal
-- network environment will apply it, baseline it, and manage it going forward.)

-- Enums
CREATE TYPE "EventType" AS ENUM ('WEDDING','BIRTHDAY','CORPORATE','CONFERENCE','GRADUATION','PARTY','GALA','RELIGIOUS','CHARITY','OTHER');
CREATE TYPE "RsvpStatus" AS ENUM ('PENDING','CONFIRMED','DECLINED','MAYBE');
CREATE TYPE "LayoutObjectType" AS ENUM ('STAGE','DANCE_FLOOR','BAR','BUFFET','ENTRANCE','EXIT','TOILETS','DJ_BOOTH','VIP_AREA','CUSTOM');
CREATE TYPE "TableShape" AS ENUM ('ROUND','SQUARE','RECTANGLE','OVAL','BANQUET','HEAD','CUSTOM');

-- users
CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- events
CREATE TABLE "events" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "type" "EventType" NOT NULL DEFAULT 'OTHER',
  "description" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "venueName" TEXT,
  "venueAddress" TEXT,
  "capacity" INTEGER,
  "imageUrl" TEXT,
  "rsvpToken" TEXT NOT NULL,
  "rsvpOpen" BOOLEAN NOT NULL DEFAULT true,
  "rsvpDeadline" TIMESTAMP(3),
  "customMessage" TEXT,
  "allowPlusOnes" BOOLEAN NOT NULL DEFAULT true,
  "allowPlusOneNames" BOOLEAN NOT NULL DEFAULT true,
  "allowMealSelection" BOOLEAN NOT NULL DEFAULT true,
  "allowDietary" BOOLEAN NOT NULL DEFAULT true,
  "allowAccessibilityInfo" BOOLEAN NOT NULL DEFAULT true,
  "allowSpecialRequests" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "events_rsvpToken_key" ON "events"("rsvpToken");
CREATE INDEX "events_userId_idx" ON "events"("userId");

-- guests
CREATE TABLE "guests" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "groupName" TEXT,
  "rsvpStatus" "RsvpStatus" NOT NULL DEFAULT 'PENDING',
  "rsvpRespondedAt" TIMESTAMP(3),
  "additionalGuestsCount" INTEGER NOT NULL DEFAULT 0,
  "mealPreference" TEXT,
  "dietaryRequirements" TEXT,
  "accessibilityRequirements" TEXT,
  "specialNotes" TEXT,
  "isVip" BOOLEAN NOT NULL DEFAULT false,
  "checkedIn" BOOLEAN NOT NULL DEFAULT false,
  "checkedInAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "guests_eventId_idx" ON "guests"("eventId");
CREATE INDEX "guests_eventId_rsvpStatus_idx" ON "guests"("eventId","rsvpStatus");
CREATE INDEX "guests_eventId_email_idx" ON "guests"("eventId","email");

-- guest_party_members
CREATE TABLE "guest_party_members" (
  "id" TEXT PRIMARY KEY,
  "guestId" TEXT NOT NULL REFERENCES "guests"("id") ON DELETE CASCADE,
  "fullName" TEXT NOT NULL,
  "mealPreference" TEXT,
  "dietaryRequirements" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "guest_party_members_guestId_idx" ON "guest_party_members"("guestId");

-- event_invitations
CREATE TABLE "event_invitations" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "guestId" TEXT UNIQUE REFERENCES "guests"("id") ON DELETE CASCADE,
  "token" TEXT NOT NULL,
  "channel" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "event_invitations_token_key" ON "event_invitations"("token");
CREATE INDEX "event_invitations_eventId_idx" ON "event_invitations"("eventId");

-- rsvp_questions
CREATE TABLE "rsvp_questions" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "label" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'text',
  "options" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "rsvp_questions_eventId_idx" ON "rsvp_questions"("eventId");

-- rsvp_answers
CREATE TABLE "rsvp_answers" (
  "id" TEXT PRIMARY KEY,
  "guestId" TEXT NOT NULL REFERENCES "guests"("id") ON DELETE CASCADE,
  "questionId" TEXT NOT NULL REFERENCES "rsvp_questions"("id") ON DELETE CASCADE,
  "answerText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "rsvp_answers_guestId_questionId_key" ON "rsvp_answers"("guestId","questionId");

-- venue_layouts
CREATE TABLE "venue_layouts" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL UNIQUE REFERENCES "events"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL DEFAULT 'Main Layout',
  "canvasWidth" INTEGER NOT NULL DEFAULT 1600,
  "canvasHeight" INTEGER NOT NULL DEFAULT 1000,
  "gridSize" INTEGER NOT NULL DEFAULT 20,
  "backgroundColor" TEXT NOT NULL DEFAULT '#f8fafc',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- layout_objects
CREATE TABLE "layout_objects" (
  "id" TEXT PRIMARY KEY,
  "venueLayoutId" TEXT NOT NULL REFERENCES "venue_layouts"("id") ON DELETE CASCADE,
  "type" "LayoutObjectType" NOT NULL DEFAULT 'CUSTOM',
  "label" TEXT,
  "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "width" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "height" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "color" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "layout_objects_venueLayoutId_idx" ON "layout_objects"("venueLayoutId");

-- tables
CREATE TABLE "tables" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "shape" "TableShape" NOT NULL DEFAULT 'ROUND',
  "capacity" INTEGER NOT NULL DEFAULT 8,
  "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "width" DOUBLE PRECISION NOT NULL DEFAULT 120,
  "height" DOUBLE PRECISION NOT NULL DEFAULT 120,
  "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "tables_eventId_idx" ON "tables"("eventId");

-- seats
CREATE TABLE "seats" (
  "id" TEXT PRIMARY KEY,
  "tableId" TEXT NOT NULL REFERENCES "tables"("id") ON DELETE CASCADE,
  "seatNumber" INTEGER NOT NULL,
  "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "y" DOUBLE PRECISION NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "seats_tableId_seatNumber_key" ON "seats"("tableId","seatNumber");
CREATE INDEX "seats_tableId_idx" ON "seats"("tableId");

-- seating_assignments
CREATE TABLE "seating_assignments" (
  "id" TEXT PRIMARY KEY,
  "guestId" TEXT NOT NULL UNIQUE REFERENCES "guests"("id") ON DELETE CASCADE,
  "tableId" TEXT NOT NULL REFERENCES "tables"("id") ON DELETE CASCADE,
  "seatId" TEXT UNIQUE REFERENCES "seats"("id") ON DELETE SET NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "seating_assignments_tableId_idx" ON "seating_assignments"("tableId");

-- check_ins
CREATE TABLE "check_ins" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "guestId" TEXT NOT NULL UNIQUE REFERENCES "guests"("id") ON DELETE CASCADE,
  "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checkedInBy" TEXT
);
CREATE INDEX "check_ins_eventId_idx" ON "check_ins"("eventId");
