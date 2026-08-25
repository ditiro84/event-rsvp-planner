import { z } from "zod";

export const markInviteSentSchema = z.object({
  channel: z.enum(["whatsapp", "manual", "email", "sms"]),
});
export type MarkInviteSentInput = z.infer<typeof markInviteSentSchema>;

export const bulkSendInviteEmailsSchema = z.object({
  guestIds: z.array(z.string().min(1)).max(2000).optional(),
});
export type BulkSendInviteEmailsInput = z.infer<typeof bulkSendInviteEmailsSchema>;

// Body of a door-scan check-in: the raw invitation token read off the
// guest's wristband/badge QR code.
export const checkInScanSchema = z.object({
  token: z.string().trim().min(1, "Missing QR token"),
});
export type CheckInScanInput = z.infer<typeof checkInScanSchema>;
