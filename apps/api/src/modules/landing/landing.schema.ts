import { z } from "zod";

// Fixed icon set (lucide-react component names the frontend knows how to
// render) -- deliberately not free text/SVG upload, so this can't become an
// XSS vector via the admin form. Keep in sync with ICON_OPTIONS in the web
// app's Services admin tab.
export const SERVICE_ICONS = [
  "Sparkles",
  "Users",
  "Calendar",
  "CreditCard",
  "Shield",
  "Globe",
  "Camera",
  "Gift",
  "Headphones",
  "Star",
  "Store",
  "Mail",
  "Armchair",
  "ClipboardCheck",
] as const;

export const createServiceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().min(1, "Description is required").max(400),
  icon: z.enum(SERVICE_ICONS),
  isActive: z.boolean().optional(),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = createServiceSchema.partial();
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const serviceIdParamsSchema = z.object({
  serviceId: z.string().min(1),
});

export const reorderServicesSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderServicesInput = z.infer<typeof reorderServicesSchema>;
