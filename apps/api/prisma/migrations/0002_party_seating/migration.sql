-- Adds a real seat for each named party member ("+1") instead of folding
-- their headcount into a badge on the primary guest's seat.

CREATE TABLE "party_seating_assignments" (
  "id" TEXT PRIMARY KEY,
  "partyMemberId" TEXT NOT NULL UNIQUE REFERENCES "guest_party_members"("id") ON DELETE CASCADE,
  "tableId" TEXT NOT NULL REFERENCES "tables"("id") ON DELETE CASCADE,
  "seatId" TEXT UNIQUE REFERENCES "seats"("id") ON DELETE SET NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "party_seating_assignments_tableId_idx" ON "party_seating_assignments"("tableId");
