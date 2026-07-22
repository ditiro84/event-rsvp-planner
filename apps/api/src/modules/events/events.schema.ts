import { z } from "zod";

export const eventTypeEnum = z.enum([
  "WEDDING",
  "BIRTHDAY",
  "CORPORATE",
  "CONFERENCE",
  "GRADUATION",
  "PARTY",
  "GALA",
  "RELIGIOUS",
  "CHARITY",
  "OTHER",
]);

export const createEventSchema = z.object({
  name: z.string().trim().min(1, "Event name is required").max(200),
  type: eventTypeEnum.default("OTHER"),
  description: z.string().trim().max(5000).optional().nullable(),
  date: z.coerce.date({ errorMap: () => ({ message: "A valid event date is required" }) }),
  startTime: z.string().trim().max(20).optional().nullable(),
  endTime: z.string().trim().max(20).optional().nullable(),
  venueName: z.string().trim().max(200).optional().nullable(),
  venueAddress: z.string().trim().max(500).optional().nullable(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  rsvpDeadline: z.coerce.date().optional().nullable(),
  imageUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  customMessage: z.string().trim().max(2000).optional().nullable(),
  allowPlusOnes: z.boolean().optional(),
  allowPlusOneNames: z.boolean().optional(),
  allowMealSelection: z.boolean().optional(),
  allowDietary: z.boolean().optional(),
  allowAccessibilityInfo: z.boolean().optional(),
  allowSpecialRequests: z.boolean().optional(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema.partial().extend({
  rsvpOpen: z.boolean().optional(),
});
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const eventIdParamsSchema = z.object({
  eventId: z.string().min(1),
});
