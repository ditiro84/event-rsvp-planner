-- Order can now be captured without an in-app payment processor connected
-- ("MANUAL" -- planner collects payment themselves, e.g. Zelle).
ALTER TYPE "OrderStatus" ADD VALUE 'MANUAL';

-- Guest-entered size per cart line item (distinct from Product.size, the
-- planner's fixed label for the product itself).
ALTER TABLE "order_items" ADD COLUMN "selectedSize" TEXT;
