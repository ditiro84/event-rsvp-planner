import { z } from "zod";

export const vendorCategoryEnum = z.enum([
  "CATERING",
  "VENUE",
  "PHOTOGRAPHY",
  "VIDEOGRAPHY",
  "FLORAL",
  "MUSIC_ENTERTAINMENT",
  "DECOR",
  "RENTALS",
  "TRANSPORTATION",
  "BEAUTY",
  "STATIONERY",
  "OTHER",
]);

export const vendorStatusEnum = z.enum([
  "CONTACTED",
  "QUOTE_RECEIVED",
  "BOOKED",
  "CONFIRMED",
  "CANCELLED",
]);

export const createVendorSchema = z.object({
  name: z.string().trim().min(1, "Vendor name is required").max(200),
  category: vendorCategoryEnum.default("OTHER"),
  status: vendorStatusEnum.default("CONTACTED"),
  contactName: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(40).optional().nullable(),
  website: z.string().trim().max(500).optional().nullable(),
  // Whole-currency amount from the client (e.g. dollars); stored as cents.
  cost: z.coerce.number().min(0).max(10_000_000).optional().nullable(),
  depositPaid: z.boolean().optional(),
  notes: z.string().trim().max(5000).optional().nullable(),
});
export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export const updateVendorSchema = createVendorSchema.partial();
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

export const vendorIdParamsSchema = z.object({
  eventId: z.string().min(1),
  vendorId: z.string().min(1),
});

export const listVendorsQuerySchema = z.object({
  status: vendorStatusEnum.optional(),
  category: vendorCategoryEnum.optional(),
});
export type ListVendorsQuery = z.infer<typeof listVendorsQuerySchema>;
