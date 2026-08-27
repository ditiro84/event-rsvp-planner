import { z } from "zod";

export const inviteCollaboratorSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});
export type InviteCollaboratorInput = z.infer<typeof inviteCollaboratorSchema>;

export const collaboratorIdParamsSchema = z.object({
  eventId: z.string().min(1),
  collaboratorId: z.string().min(1),
});

export const collaboratorInviteIdParamsSchema = z.object({
  eventId: z.string().min(1),
  inviteId: z.string().min(1),
});
