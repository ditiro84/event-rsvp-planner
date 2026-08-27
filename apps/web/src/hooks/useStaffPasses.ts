import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { EventStaffPassRecord, Guest, StaffPassContext } from "@/types";
import type { ScannedTicket } from "./useTicketTypes";

// --- Owner/admin side -- managing passes for an event (Team tab) ----------
// Same reasoning as useCollaborators.ts: only the event owner/admin can
// hand out or revoke a door-check-in pass, see staffPasses.service.ts.

export function useStaffPasses(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId, "staff-passes"],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/staff-passes`);
      return res.data.data.passes as EventStaffPassRecord[];
    },
    enabled: !!eventId,
  });
}

export function useCreateStaffPass(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post(`/events/${eventId}/staff-passes`, { name });
      return res.data.data.pass as EventStaffPassRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "staff-passes"] }),
  });
}

export function useRevokeStaffPass(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (passId: string) => {
      const res = await api.post(`/events/${eventId}/staff-passes/${passId}/revoke`);
      return res.data.data.pass as EventStaffPassRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "staff-passes"] }),
  });
}

// --- Public (no-account) side -- the /staff/:token kiosk page -------------
// No auth header is required for these; the pass token in the URL is the
// only credential (see staffPasses.public.routes.ts, mounted at /api/staff).
// Revoking the pass on the owner side above invalidates it here immediately.

export function useStaffPassContext(passToken: string | undefined) {
  return useQuery({
    queryKey: ["staff", passToken],
    queryFn: async () => {
      const res = await api.get(`/staff/${passToken}`);
      return res.data.data as StaffPassContext;
    },
    enabled: !!passToken,
    retry: false,
  });
}

export function useStaffScanGuest(passToken: string) {
  return useMutation({
    mutationFn: async (guestInviteToken: string) => {
      const res = await api.post(`/staff/${passToken}/scan-guest`, { token: guestInviteToken });
      return res.data.data.guest as Guest;
    },
  });
}

export function useStaffScanTicket(passToken: string) {
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post(`/staff/${passToken}/scan-ticket`, { code });
      return res.data.data as { ticket: ScannedTicket; alreadyCheckedIn: boolean };
    },
  });
}
