import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AnalyticsOverview } from "@/types";

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await api.get("/analytics");
      return res.data.data as AnalyticsOverview;
    },
  });
}
