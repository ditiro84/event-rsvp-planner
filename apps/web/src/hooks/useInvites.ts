import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { InviteLink } from "@/types";

// These read the invite link via a mutation (not a query) because the
// endpoint is a get-or-create: it's only fetched on demand when the host
// opens the invite modal for a specific guest, matching the pattern already
// used for CSV/PDF export downloads in this codebase.
export function useGetInviteLink(eventId: string) {
  return useMutation({
    mutationFn: async (guestId: string) => {
      const res = await api.get(`/events/${eventId}/guests/${guestId}/invite`);
      return res.data.data as InviteLink;
    },
  });
}

export function useSendInviteEmail(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (guestId: string) => {
      const res = await api.post(`/events/${eventId}/guests/${guestId}/invite/email`, {});
      return res.data.data as { sent: boolean };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "guests"] }),
  });
}

export function useMarkInviteSent(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ guestId, channel }: { guestId: string; channel: "whatsapp" | "manual" }) => {
      const res = await api.post(`/events/${eventId}/guests/${guestId}/invite/mark-sent`, { channel });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "guests"] }),
  });
}

export function useBulkSendInviteEmails(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (guestIds?: string[]) => {
      const res = await api.post(`/events/${eventId}/guests/invites/send-email`, { guestIds });
      return res.data.data as { total: number; sent: number; failed: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "guests"] }),
  });
}

// Sends a guest their existing personalized RSVP link (get-or-created the
// same way as an invite) along with a planner-written note -- used to ask
// a guest to go back and fix/complete something on an RSVP they already
// submitted, e.g. missing additional-guest names. See RequestEditModal.tsx.
export function useSendEditRequestEmail(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ guestId, message }: { guestId: string; message: string }) => {
      const res = await api.post(`/events/${eventId}/guests/${guestId}/invite/request-edit-email`, { message });
      return res.data.data as { sent: boolean };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "guests"] }),
  });
}
