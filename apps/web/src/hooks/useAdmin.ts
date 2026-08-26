import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AdminAuditLogEntry,
  AdminEventSummary,
  AdminUserSummary,
  EmailEventEntry,
  PaymentEventEntry,
  PlatformAnalytics,
} from "@/types";

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await api.get("/admin/users");
      return res.data.data.users as AdminUserSummary[];
    },
  });
}

export function useAdminEvents() {
  return useQuery({
    queryKey: ["admin", "events"],
    queryFn: async () => {
      const res = await api.get("/admin/events");
      return res.data.data.events as AdminEventSummary[];
    },
  });
}

export function useAdminAuditLog(filters: { eventId?: string; adminUserId?: string } = {}) {
  return useQuery({
    queryKey: ["admin", "audit-log", filters],
    queryFn: async () => {
      const res = await api.get("/admin/audit-log", { params: filters });
      return res.data.data.entries as AdminAuditLogEntry[];
    },
  });
}

export function useAdminPaymentEvents(filters: { eventId?: string; status?: string; provider?: string } = {}) {
  return useQuery({
    queryKey: ["admin", "payment-events", filters],
    queryFn: async () => {
      const res = await api.get("/admin/payment-events", { params: filters });
      return res.data.data.entries as PaymentEventEntry[];
    },
  });
}

export function useAdminEmailEvents(filters: { eventId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["admin", "email-events", filters],
    queryFn: async () => {
      const res = await api.get("/admin/email-events", { params: filters });
      return res.data.data.entries as EmailEventEntry[];
    },
  });
}

export function usePlatformAnalytics() {
  return useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async () => {
      const res = await api.get("/admin/analytics");
      return res.data.data as PlatformAnalytics;
    },
  });
}
