import { z } from "zod";

// A bundle is whatever the planner says it is: any products, any quantities,
// one price. (No bundles at all is fine too.)
export const bundleItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
});

export const createBundleSchema = z.object({
  name: z.string().trim().min(1, "Bundle name is required").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  // Whole-currency amount from the client; stored as cents.
  price: z.coerce.number().min(0).max(1_000_000),
  active: z.boolean().optional(),
  items: z.array(bundleItemInputSchema).min(1, "Add at least one product to the bundle").max(30),
});
export type CreateBundleInput = z.infer<typeof createBundleSchema>;

export const updateBundleSchema = createBundleSchema.partial();
export type UpdateBundleInput = z.infer<typeof updateBundleSchema>;

export const bundleIdParamsSchema = z.object({
  eventId: z.string().min(1),
  bundleId: z.string().min(1),
});
