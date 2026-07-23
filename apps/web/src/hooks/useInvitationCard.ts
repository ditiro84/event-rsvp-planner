import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface InvitationCardMeta {
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

function cardQueryKey(eventId: string) {
  return ["events", eventId, "invitationCard"];
}

export function useInvitationCardMeta(eventId: string) {
  return useQuery({
    queryKey: cardQueryKey(eventId),
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/invitation-card`);
      return res.data.data.card as InvitationCardMeta | null;
    },
    enabled: !!eventId,
  });
}

export function useUploadInvitationCard(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/events/${eventId}/invitation-card`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.data.card as InvitationCardMeta;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cardQueryKey(eventId) }),
  });
}

export function useDeleteInvitationCard(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/events/${eventId}/invitation-card`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cardQueryKey(eventId) }),
  });
}

// Fetches the card's actual bytes as a blob URL for inline preview (images)
// or an "open in new tab" link (PDFs). Uses the authenticated host-side
// download endpoint, so this only works for the event owner -- not the
// public guest-facing preview, which hits a separate unauthenticated route.
export function useInvitationCardPreview(eventId: string, enabled: boolean) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setPreviewUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;

    setIsLoading(true);
    api
      .get(`/events/${eventId}/invitation-card/file`, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = window.URL.createObjectURL(res.data);
        setPreviewUrl(objectUrl);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [eventId, enabled]);

  return { previewUrl, isLoading };
}
