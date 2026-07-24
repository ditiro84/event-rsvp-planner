import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { InsightRecord } from "@/types";

export function useInsights(eventId?: string) {
  return useQuery({
    queryKey: ["insights", { eventId }],
    queryFn: async () => {
      const res = await api.get("/insights", { params: eventId ? { eventId } : undefined });
      return res.data.data.insights as InsightRecord[];
    },
    refetchInterval: 30000,
  });
}
