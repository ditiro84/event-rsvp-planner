-- Adds Canadian dollars to the shared currency enum (used by products,
-- vendors, ticket types, orders and payout accounts). The enum type is named
-- "Currency" (renamed from "ProductCurrency" in migration 0007). IF NOT EXISTS
-- keeps a re-run safe; the new value is not used in this same migration.
ALTER TYPE "Currency" ADD VALUE IF NOT EXISTS 'CAD';
