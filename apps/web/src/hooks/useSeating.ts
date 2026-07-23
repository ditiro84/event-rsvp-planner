import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LayoutObjectRecord, SeatingMap, TableRecord, VenueLayoutRecord } from "@/types";

function mapKey(eventId: string | undefined) {
  return ["events", eventId, "seating", "map"];
}

export function useSeatingMap(eventId: string | undefined) {
  return useQuery({
    queryKey: mapKey(eventId),
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/seating/map`);
      return res.data.data as SeatingMap;
    },
    enabled: !!eventId,
  });
}

export function useUpdateLayout(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Pick<VenueLayoutRecord, "name" | "canvasWidth" | "canvasHeight" | "gridSize" | "backgroundColor">>) => {
      const res = await api.put(`/events/${eventId}/seating/layout`, input);
      return res.data.data.layout as VenueLayoutRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mapKey(eventId) }),
  });
}

export function useCreateLayoutObject(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await api.post(`/events/${eventId}/seating/layout/objects`, input);
      return res.data.data.object as LayoutObjectRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mapKey(eventId) }),
  });
}

export function useUpdateLayoutObject(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ objectId, input }: { objectId: string; input: Record<string, unknown> }) => {
      const res = await api.put(`/events/${eventId}/seating/layout/objects/${objectId}`, input);
      return res.data.data.object as LayoutObjectRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mapKey(eventId) }),
  });
}

export function useDeleteLayoutObject(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (objectId: string) => {
      await api.delete(`/events/${eventId}/seating/layout/objects/${objectId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mapKey(eventId) }),
  });
}

export function useCreateTable(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await api.post(`/events/${eventId}/seating/tables`, input);
      return res.data.data.table as TableRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mapKey(eventId) }),
  });
}

export function useUpdateTable(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tableId, input }: { tableId: string; input: Record<string, unknown> }) => {
      const res = await api.put(`/events/${eventId}/seating/tables/${tableId}`, input);
      return res.data.data as { table: TableRecord; unassignedGuestNames: string[] };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mapKey(eventId) }),
  });
}

export function useDeleteTable(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tableId: string) => {
      await api.delete(`/events/${eventId}/seating/tables/${tableId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mapKey(eventId) }),
  });
}

export function useAssignGuest(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { guestId: string; tableId: string; seatId?: string; overrideCapacity?: boolean }) => {
      const res = await api.post(`/events/${eventId}/seating/assignments`, input);
      return res.data.data as { assignment: unknown; warning?: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mapKey(eventId) }),
  });
}

export function useUnassignGuest(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (guestId: string) => {
      await api.delete(`/events/${eventId}/seating/assignments/${guestId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mapKey(eventId) }),
  });
}
