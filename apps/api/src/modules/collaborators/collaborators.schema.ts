import { z } from "zod";

// STAFF is the legacy name for Coordinator and is not offered for new invites.
export const INVITABLE_COLLABORATOR_ROLES = ["COORDINATOR", "CATERER", "DOOR_STAFF", "VIEWER"] as const;

export const inviteCollaboratorSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(INVITABLE_COLLABORATOR_ROLES).default("COORDINATOR"),
});

export const updateCollaboratorRoleSchema = z.object({
  role: z.enum(INVITABLE_COLLABORATOR_ROLES),
});
export type UpdateCollaboratorRoleInput = z.infer<typeof updateCollaboratorRoleSchema>;
export type InviteCollaboratorInput = z.infer<typeof inviteCollaboratorSchema>;

export const collaboratorIdParamsSchema = z.object({
  eventId: z.string().min(1),
  collaboratorId: z.string().min(1),
});

export const collaboratorInviteIdParamsSchema = z.object({
  eventId: z.string().min(1),
  inviteId: z.string().min(1),
});
