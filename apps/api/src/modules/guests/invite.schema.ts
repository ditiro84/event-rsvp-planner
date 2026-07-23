import { z } from "zod";

export const markInviteSentSchema = z.object({
  channel: z.enum(["whatsapp", "manual", "email", "sms"]),
});
export type MarkInviteSentInput = z.infer<typeof markInviteSentSchema>;

export const bulkSendInviteEmailsSchema = z.object({
  guestIds: z.array(z.string().min(1)).max(2000).optional(),
});
export type BulkSendInviteEmailsInput = z.infer<typeof bulkSendInviteEmailsSchema>;
