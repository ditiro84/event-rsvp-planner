import { z } from "zod";

export const markInviteSentSchema = z.object({
  channel: z.enum(["whatsapp", "manual", "email", "sms"]),
});
export type MarkInviteSentInput = z.infer<typeof markInviteSentSchema>;

export const bulkSendInviteEmailsSchema = z.object({
  guestIds: z.array(z.string().min(1)).max(2000).optional(),
});
export type BulkSendInviteEmailsInput = z.infer<typeof bulkSendInviteEmailsSchema>;

// A planner-written note sent alongside the guest's existing RSVP link,
// asking them to go back and fix/complete something (e.g. missing
// additional-guest names) -- see sendEditRequestEmail in invite.service.ts.
export const requestEditEmailSchema = z.object({
  message: z.string().trim().min(1, "Write a message for the guest").max(1000),
});
export type RequestEditEmailInput = z.infer<typeof requestEditEmailSchema>;

// Body of a door-scan check-in: the raw invitation token read off the
// guest's wristband/badge QR code.
export const checkInScanSchema = z.object({
  token: z.string().trim().min(1, "Missing QR token"),
});
export type CheckInScanInput = z.infer<typeof checkInScanSchema>;
