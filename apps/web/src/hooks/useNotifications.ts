import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { NotificationRecord } from "@/types";

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", { unreadOnly }],
    queryFn: async () => {
      const res = await api.get("/notifications", { params: unreadOnly ? { unreadOnly: "true" } : undefined });
      return res.data.data as { notifications: NotificationRecord[]; unreadCount: number };
    },
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await api.put(`/notifications/${notificationId}/read`);
      return res.data.data.notification as NotificationRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.put("/notifications/read-all");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
