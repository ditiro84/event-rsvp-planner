import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  // Whole-currency amount from the client (e.g. dollars); stored as cents.
  price: z.coerce.number().min(0).max(1_000_000),
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
