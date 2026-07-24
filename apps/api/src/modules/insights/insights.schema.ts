import { z } from "zod";

export const listInsightsQuerySchema = z.object({
  eventId: z.string().min(1).optional(),
});
export type ListInsightsQuery = z.infer<typeof listInsightsQuerySchema>;
