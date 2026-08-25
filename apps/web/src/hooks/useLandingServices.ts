import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LandingService, ServiceIcon } from "@/types";

// --- Admin -----------------------------------------------------------------

export function useAdminServices() {
  return useQuery({
    queryKey: ["admin", "services"],
    queryFn: async () => {
      const res = await api.get("/admin/services");
      return res.data.data.services as LandingService[];
    },
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description: string; icon: ServiceIcon; isActive?: boolean }) => {
      const res = await api.post("/admin/services", input);
      return res.data.data.service as LandingService;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "services"] }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      serviceId,
      input,
    }: {
      serviceId: string;
      input: Partial<{ title: string; description: string; icon: ServiceIcon; isActive: boolean }>;
    }) => {
      const res = await api.put(`/admin/services/${serviceId}`, input);
      return res.data.data.service as LandingService;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "services"] }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: string) => {
      await api.delete(`/admin/services/${serviceId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "services"] }),
  });
}

export function useReorderServices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await api.post("/admin/services/reorder", { orderedIds });
      return res.data.data.services as LandingService[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "services"] }),
  });
}

// --- Public ------------------------------------------------------------

export function usePublicServices() {
  return useQuery({
    queryKey: ["public", "services"],
    queryFn: async () => {
      const res = await api.get("/landing/services");
      return res.data.data.services as LandingService[];
    },
  });
}
