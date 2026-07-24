import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { VendorRecord, VendorSummary } from "@/types";

export function useVendors(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId, "vendors"],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/vendors`);
      return res.data.data.vendors as VendorRecord[];
    },
    enabled: !!eventId,
  });
}

export function useVendorSummary(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId, "vendors", "summary"],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/vendors/summary`);
      return res.data.data as VendorSummary;
    },
    enabled: !!eventId,
  });
}

export function useCreateVendor(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await api.post(`/events/${eventId}/vendors`, input);
      return res.data.data.vendor as VendorRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", eventId, "vendors"] });
    },
  });
}

export function useUpdateVendor(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vendorId, input }: { vendorId: string; input: Record<string, unknown> }) => {
      const res = await api.put(`/events/${eventId}/vendors/${vendorId}`, input);
      return res.data.data.vendor as VendorRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", eventId, "vendors"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteVendor(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vendorId: string) => {
      await api.delete(`/events/${eventId}/vendors/${vendorId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", eventId, "vendors"] });
    },
  });
}
