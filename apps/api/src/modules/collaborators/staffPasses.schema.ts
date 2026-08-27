import { z } from "zod";

export const createStaffPassSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
});
export type CreateStaffPassInput = z.infer<typeof createStaffPassSchema>;

export const staffPassIdParamsSchema = z.object({
  eventId: z.string().min(1),
  passId: z.string().min(1),
});

export const staffPassTokenParamsSchema = z.object({
  passToken: z.string().min(1),
});

export const staffScanGuestSchema = z.object({
  token: z.string().min(1),
});

export const staffScanTicketSchema = z.object({
  code: z.string().min(1),
});
