import { z } from "zod";

export const rsvpStatusEnum = z.enum(["PENDING", "CONFIRMED", "DECLINED", "MAYBE"]);

export const createGuestSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")).nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  groupName: z.string().trim().max(100).optional().nullable(),
  rsvpStatus: rsvpStatusEnum.optional(),
  additionalGuestsCount: z.coerce.number().int().min(0).max(50).optional(),
  mealPreference: z.string().trim().max(200).optional().nullable(),
  dietaryRequirements: z.string().trim().max(500).optional().nullable(),
  accessibilityRequirements: z.string().trim().max(500).optional().nullable(),
  specialNotes: z.string().trim().max(1000).optional().nullable(),
  isVip: z.boolean().optional(),
});
export type CreateGuestInput = z.infer<typeof createGuestSchema>;

export const updateGuestSchema = createGuestSchema.partial();
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;

export const guestIdParamsSchema = z.object({
  guestId: z.string().min(1),
});

export const listGuestsQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: rsvpStatusEnum.optional(),
  assigned: z.enum(["true", "false"]).optional(),
  checkedIn: z.enum(["true", "false"]).optional(),
  vip: z.enum(["true", "false"]).optional(),
  dietary: z.enum(["true", "false"]).optional(),
  sortBy: z.enum(["name", "createdAt", "rsvpStatus", "table"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});
export type ListGuestsQuery = z.infer<typeof listGuestsQuerySchema>;
