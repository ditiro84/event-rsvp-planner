import { z } from "zod";

// Mirrors the simple "no pagination, just filters + a cap" approach used
// elsewhere in this app (listEvents, listVendors) -- these two lists are the
// ones most likely to grow long over time, so unlike those they get an
// explicit (generous) cap.
export const auditLogQuerySchema = z.object({
  eventId: z.string().optional(),
  adminUserId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export const paymentEventsQuerySchema = z.object({
  eventId: z.string().optional(),
  orderId: z.string().optional(),
  status: z.enum(["SUCCESS", "FAILED", "EXPIRED", "INFO"]).optional(),
  provider: z.enum(["STRIPE_CONNECT", "PAYSTACK", "PAYPAL"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
export type PaymentEventsQuery = z.infer<typeof paymentEventsQuerySchema>;

export const emailEventsQuerySchema = z.object({
  eventId: z.string().optional(),
  status: z.enum(["SENT", "FAILED"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
export type EmailEventsQuery = z.infer<typeof emailEventsQuerySchema>;
