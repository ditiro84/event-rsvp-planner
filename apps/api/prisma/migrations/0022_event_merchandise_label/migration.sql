-- Optional planner-written description of the merchandise on offer, shown in
-- the RSVP page's "Would you like to purchase merchandise?" prompt.
-- (The Event model maps to the "events" table; IF NOT EXISTS keeps a re-run safe.)
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "merchandiseLabel" TEXT;
