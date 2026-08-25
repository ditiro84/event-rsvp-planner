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

export const publicEventCategoryEnum = z.enum([
  "NIGHTLIFE",
  "BOAT_CRUISE",
  "CONCERT",
  "FESTIVAL",
  "COMEDY_SHOW",
  "PRIVATE_PARTY",
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
  merchandiseEnabled: z.boolean().optional(),
  // Public ticketing listing fields. publicSlug is deliberately NOT
  // accepted here -- it's server-generated once from the name (see
  // ensureUniqueEventSlug in events.service.ts) and immutable after,
  // same pattern as Article.slug.
  isPublic: z.boolean().optional(),
  publicCategory: publicEventCategoryEnum.optional().nullable(),
  publicDescription: z.string().trim().max(5000).optional().nullable(),
  minAge: z.coerce.number().int().min(0).max(100).optional().nullable(),
});
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const eventIdParamsSchema = z.object({
  eventId: z.string().min(1),
});
