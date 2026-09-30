import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface InvitationMediaMeta {
  id: string;
  position: number;
  mimeType: string;
  fileName: string;
  size: number;
  createdAt: string;
}

function mediaQueryKey(eventId: string) {
  return ["events", eventId, "invitationMedia"];
}

export function useInvitationMediaList(eventId: string) {
  return useQuery({
    queryKey: mediaQueryKey(eventId),
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/invitation-media`);
      return res.data.data.items as InvitationMediaMeta[];
    },
    enabled: !!eventId,
  });
}

export function useUploadInvitationMedia(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/events/${eventId}/invitation-media`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.data.item as InvitationMediaMeta;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mediaQueryKey(eventId) }),
  });
}

export function useDeleteInvitationMedia(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mediaId: string) => {
      await api.delete(`/events/${eventId}/invitation-media/${mediaId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mediaQueryKey(eventId) }),
  });
}

export function useReorderInvitationMedia(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await api.put(`/events/${eventId}/invitation-media/reorder`, { orderedIds });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mediaQueryKey(eventId) }),
  });
}

// Fetches one item's actual bytes as a blob URL for inline preview (images
// and video) or an "open in new tab" link (PDFs). Uses the authenticated
// host-side download endpoint, so this only works for the event owner --
// not the public guest-facing preview, which hits a separate
// unauthenticated route (see InvitationMediaPage.tsx on the public
// RSVP page).
export function useInvitationMediaPreview(eventId: string, mediaId: string | null) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!mediaId) {
      setPreviewUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;

    setIsLoading(true);
    api
      .get(`/events/${eventId}/invitation-media/${mediaId}/file`, { responseType: "blob" })
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
  }, [eventId, mediaId]);

  return { previewUrl, isLoading };
}
