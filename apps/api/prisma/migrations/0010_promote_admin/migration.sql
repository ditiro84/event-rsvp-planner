-- The 0009 bootstrap ran before olaabiri84@gmail.com existed as a registered
-- account, so it was a no-op. The account has since been registered through
-- the normal signup flow -- promote it now. Safe/idempotent either way.
UPDATE "users" SET "role" = 'ADMIN' WHERE "email" = 'olaabiri84@gmail.com';
