import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PublicEvent, RsvpDashboard } from "@/types";

export function usePlannerRsvpDashboard(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId, "rsvp"],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/rsvp`);
      return res.data.data as RsvpDashboard;
    },
    enabled: !!eventId,
    refetchInterval: 15000,
  });
}

export function usePublicEvent(token: string | undefined) {
  return useQuery({
    queryKey: ["rsvp", token],
    queryFn: async () => {
      const res = await api.get(`/rsvp/${token}`);
      return res.data.data.event as PublicEvent;
    },
    enabled: !!token,
    retry: false,
  });
}

export function useSubmitRsvp(token: string) {
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await api.post(`/rsvp/${token}`, input);
      return res.data.data as { message: string; guest: { firstName: string; lastName: string; rsvpStatus: string } };
    },
  });
}

export function useToggleRsvpOpen(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rsvpOpen: boolean) => {
      const res = await api.put(`/events/${eventId}`, { rsvpOpen });
      return res.data.data.event;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", eventId] });
      qc.invalidateQueries({ queryKey: ["events", eventId, "rsvp"] });
    },
  });
}
