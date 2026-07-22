import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Guest } from "@/types";

export interface GuestFilters {
  search?: string;
  status?: string;
  assigned?: "true" | "false";
  checkedIn?: "true" | "false";
  vip?: "true" | "false";
  dietary?: "true" | "false";
}

export function useGuests(eventId: string | undefined, filters: GuestFilters = {}) {
  return useQuery({
    queryKey: ["events", eventId, "guests", filters],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/guests`, { params: filters });
      return res.data.data.guests as Guest[];
    },
    enabled: !!eventId,
  });
}

export function useCreateGuest(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await api.post(`/events/${eventId}/guests`, input);
      return res.data.data.guest as Guest;
    },
    onSuccess: () => invalidateEvent(qc, eventId),
  });
}

export function useUpdateGuest(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ guestId, input }: { guestId: string; input: Record<string, unknown> }) => {
      const res = await api.put(`/guests/${guestId}`, input);
      return res.data.data.guest as Guest;
    },
    onSuccess: () => invalidateEvent(qc, eventId),
  });
}

export function useDeleteGuest(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (guestId: string) => {
      await api.delete(`/guests/${guestId}`);
    },
    onSuccess: () => invalidateEvent(qc, eventId),
  });
}

export function useImportGuestsCsv(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/events/${eventId}/guests/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.data as { imported: number };
    },
    onSuccess: () => invalidateEvent(qc, eventId),
  });
}

export function useExportGuestsCsv(eventId: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await api.get(`/events/${eventId}/guests/export`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `guests-${eventId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });
}

function invalidateEvent(qc: ReturnType<typeof useQueryClient>, eventId: string) {
  qc.invalidateQueries({ queryKey: ["events", eventId, "guests"] });
  qc.invalidateQueries({ queryKey: ["events", eventId, "dashboard"] });
  qc.invalidateQueries({ queryKey: ["events", eventId, "rsvp"] });
}
