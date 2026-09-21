-- Optional size label on products (e.g. "M", "42", "One Size") -- shown to
-- guests on the RSVP shop alongside the product. Nullable: not every
-- product is sized apparel, and every existing row leaves this blank.
ALTER TABLE "products" ADD COLUMN "size" TEXT;
