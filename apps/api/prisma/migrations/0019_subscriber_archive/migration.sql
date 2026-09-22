-- Admin subscriber management: archive/restore a subscriber (Admin >
-- Subscribers). Archiving sets both timestamps together (same instant) so
-- restore can match on it; see admin.service.ts's archiveSubscriber /
-- restoreSubscriber.
ALTER TABLE "users" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN "archivedAt" TIMESTAMP(3);
