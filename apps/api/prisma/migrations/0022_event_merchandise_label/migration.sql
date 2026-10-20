-- Optional planner-written description of the merchandise on offer, shown in
-- the RSVP page's "Would you like to purchase merchandise?" prompt.
ALTER TABLE "Event" ADD COLUMN "merchandiseLabel" TEXT;
