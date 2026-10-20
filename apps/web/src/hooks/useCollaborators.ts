import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { EventCollaboratorInviteRecord, EventCollaboratorRecord, EventCollaboratorRole } from "@/types";

// Owner/admin-only management -- see collaborators.service.ts. A staff
// member added to an event never sees these endpoints (they don't get a
// Team tab at all, see the nav gating in App.tsx / EventLayout).

export interface CollaboratorsList {
  collaborators: EventCollaboratorRecord[];
  pendingInvites: EventCollaboratorInviteRecord[];
}

export function useCollaborators(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId, "collaborators"],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/collaborators`);
      return res.data.data as CollaboratorsList;
    },
    enabled: !!eventId,
  });
}

export function useInviteCollaborator(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role: EventCollaboratorRole }) => {
      const res = await api.post(`/events/${eventId}/collaborators`, input);
      return res.data.data as { collaborator: EventCollaboratorRecord | null; pendingInvite: EventCollaboratorInviteRecord | null };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", eventId, "collaborators"] });
    },
  });
}

export function useUpdateCollaboratorRole(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { collaboratorId: string; role: EventCollaboratorRole }) => {
      const res = await api.put(`/events/${eventId}/collaborators/${input.collaboratorId}`, { role: input.role });
      return res.data.data.collaborator as EventCollaboratorRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", eventId, "collaborators"] });
    },
  });
}

export function useRemoveCollaborator(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (collaboratorId: string) => {
      await api.delete(`/events/${eventId}/collaborators/${collaboratorId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", eventId, "collaborators"] });
    },
  });
}

export function useCancelCollaboratorInvite(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      await api.delete(`/events/${eventId}/collaborators/invites/${inviteId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", eventId, "collaborators"] });
    },
  });
}
