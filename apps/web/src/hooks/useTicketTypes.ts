import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TicketTypeRecord } from "@/types";

export interface ScannedTicket {
  id: string;
  code: string;
  status: "VALID" | "CHECKED_IN" | "CANCELLED";
  attendeeName: string | null;
  ticketTypeName: string;
  checkedInAt: string | null;
}

export function useTicketTypes(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId, "ticket-types"],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/ticket-types`);
      return res.data.data.ticketTypes as TicketTypeRecord[];
    },
    enabled: !!eventId,
  });
}

export function useCreateTicketType(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await api.post(`/events/${eventId}/ticket-types`, input);
      return res.data.data.ticketType as TicketTypeRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "ticket-types"] }),
  });
}

export function useUpdateTicketType(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketTypeId, input }: { ticketTypeId: string; input: Record<string, unknown> }) => {
      const res = await api.put(`/events/${eventId}/ticket-types/${ticketTypeId}`, input);
      return res.data.data.ticketType as TicketTypeRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "ticket-types"] }),
  });
}

export function useDeleteTicketType(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketTypeId: string) => {
      await api.delete(`/events/${eventId}/ticket-types/${ticketTypeId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "ticket-types"] }),
  });
}

export function useReorderTicketTypes(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await api.post(`/events/${eventId}/ticket-types/reorder`, { orderedIds });
      return res.data.data.ticketTypes as TicketTypeRecord[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "ticket-types"] }),
  });
}

// Door check-in by scanning a ticket's own QR code (its `code`) -- separate
// credential from the private-event guest wristband scan (see
// useGuests.ts useCheckInByScan), since ticket buyers never go through the
// guest list.
export function useTicketScan(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post(`/events/${eventId}/ticket-types/scan`, { code });
      return res.data.data as { ticket: ScannedTicket; alreadyCheckedIn: boolean };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "ticket-types"] }),
  });
}

// Path (not a full URL) for the authenticated planner-side cover image
// download -- fetched via the `api` axios client (see AuthedImage.tsx).
export function eventCoverImagePath(eventId: string) {
  return `/events/${eventId}/cover-image`;
}

export function useUploadEventCoverImage(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/events/${eventId}/cover-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.data.event;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", eventId] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
