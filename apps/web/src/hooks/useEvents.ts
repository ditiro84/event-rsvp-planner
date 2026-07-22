import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { EventDashboardStats, EventRecord } from "@/types";

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await api.get("/events");
      return res.data.data.events as EventRecord[];
    },
  });
}

export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}`);
      return res.data.data.event as EventRecord;
    },
    enabled: !!eventId,
  });
}

export function useEventDashboard(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId, "dashboard"],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/dashboard`);
      return res.data.data as { event: EventRecord; stats: EventDashboardStats };
    },
    enabled: !!eventId,
    refetchInterval: 15000,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await api.post("/events", input);
      return res.data.data.event as EventRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await api.put(`/events/${eventId}`, input);
      return res.data.data.event as EventRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["events", eventId] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      await api.delete(`/events/${eventId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}
