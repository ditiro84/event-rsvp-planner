import { z } from "zod";

export const createTicketTypeSchema = z.object({
  name: z.string().trim().min(1, "Ticket name is required").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  // Whole-currency amount from the client (e.g. dollars); stored as cents.
  price: z.coerce.number().min(0).max(1_000_000),
  currency: z.enum(["USD", "GBP", "NGN"]),
  // Null/omitted = unlimited.
  quantityTotal: z.coerce.number().int().min(1).max(1_000_000).optional().nullable(),
  salesStartAt: z.coerce.date().optional().nullable(),
  salesEndAt: z.coerce.date().optional().nullable(),
  minPerOrder: z.coerce.number().int().min(1).max(100).optional(),
  maxPerOrder: z.coerce.number().int().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});
export type CreateTicketTypeInput = z.infer<typeof createTicketTypeSchema>;

export const updateTicketTypeSchema = createTicketTypeSchema.partial();
export type UpdateTicketTypeInput = z.infer<typeof updateTicketTypeSchema>;

export const ticketTypeIdParamsSchema = z.object({
  eventId: z.string().min(1),
  ticketTypeId: z.string().min(1),
});

export const reorderTicketTypesSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderTicketTypesInput = z.infer<typeof reorderTicketTypesSchema>;

export const ticketScanSchema = z.object({
  code: z.string().trim().min(1, "Missing ticket code"),
});
export type TicketScanInput = z.infer<typeof ticketScanSchema>;
