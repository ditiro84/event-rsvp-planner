-- Admin > Audit Log: record exactly what an action affected, not just a
-- one-line summary -- e.g. the deleted guest's name/email, or the fields
-- changed on an edit. See auditAdminEventActions.ts and admin.service.ts's
-- writeAdminAuditLog.
ALTER TABLE "admin_audit_logs" ADD COLUMN "details" JSONB;
