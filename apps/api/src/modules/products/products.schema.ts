import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  // Free-text (e.g. "M", "42", "One Size") -- not every product is sized.
  size: z.string().trim().max(50).optional().nullable(),
  // How guests are sized for this product: not at all, from a size chart
  // (T-shirts), or by head circumference (caps).
  fitType: z.enum(["NONE", "SIZE_CHART", "HEAD_CIRCUMFERENCE"]).optional(),
  // Planner-edited size list for SIZE_CHART products; null/omitted = default XS to XXL.
  sizeOptions: z
    .array(z.string().trim().min(1).max(20))
    .min(1)
    .max(30)
    .optional()
    .nullable(),
  // Whole-currency amount from the client (e.g. dollars); stored as cents.
  price: z.coerce.number().min(0).max(1_000_000),
  currency: z.enum(["USD", "GBP", "NGN", "CAD", "EUR"]).optional(),
  stockQuantity: z.coerce.number().int().min(0).max(1_000_000).optional().nullable(),
  active: z.boolean().optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productIdParamsSchema = z.object({
  eventId: z.string().min(1),
  productId: z.string().min(1),
});
