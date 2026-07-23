import { z } from "zod";

export const rsvpTokenParamsSchema = z.object({
  token: z.string().min(1),
});

export const invitationTokenParamsSchema = z.object({
  invitationToken: z.string().min(1),
});

export const submitRsvpSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(100),
    lastName: z.string().trim().min(1, "Last name is required").max(100),
    email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    attending: z.enum(["CONFIRMED", "DECLINED", "MAYBE"]),
    additionalGuestsCount: z.coerce.number().int().min(0).max(20).default(0),
    additionalGuestNames: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
    mealPreference: z.string().trim().max(200).optional().or(z.literal("")),
    dietaryRequirements: z.string().trim().max(500).optional().or(z.literal("")),
    accessibilityRequirements: z.string().trim().max(500).optional().or(z.literal("")),
    message: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine((data) => data.additionalGuestNames.length <= data.additionalGuestsCount, {
    message: "Number of accompanying guest names exceeds the additional guest count",
    path: ["additionalGuestNames"],
  });
export type SubmitRsvpInput = z.infer<typeof submitRsvpSchema>;
