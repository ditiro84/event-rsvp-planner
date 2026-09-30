import { useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useInvitePrefill, usePublicEvent } from "@/hooks/useRsvp";
import { Spinner } from "@/components/ui/Spinner";
import { apiBaseUrl } from "@/lib/api";
import { usePageMeta } from "@/hooks/usePageMeta";

// Standalone, full-page version of the invitation media viewer -- opened
// in a new tab from PublicRsvpPage.tsx's "View invitation" link whenever
// an event has more than one item, so a guest can page through them
// without it covering the RSVP form (and without losing anything they've
// already typed there). A single item skips this entirely and links
// straight to the raw file instead -- see PublicRsvpPage.tsx.
export default function InvitationMediaPage() {
  const { token, invitationToken } = useParams<{ token?: string; invitationToken?: string }>();
  const isInvite = !!invitationToken;
  const publicEventQuery = usePublicEvent(isInvite ? undefined : token);
  const inviteQuery = useInvitePrefill(isInvite ? invitationToken : undefined);
  const event = isInvite ? inviteQuery.data?.event : publicEventQuery.data;
  const isLoading = isInvite ? inviteQuery.isLoading : publicEventQuery.isLoading;

  usePageMeta({ title: event ? `Invitation - ${event.name}` : null });

  const [index, setIndex] = useState(0);

  function mediaFileUrl(mediaId: string) {
    return isInvite
      ? `${apiBaseUrl}/rsvp/invite/${invitationToken}/invitation-media/${mediaId}/file`
      : `${apiBaseUrl}/rsvp/${token}/invitation-media/${mediaId}/file`;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Spinner />
      </div>
    );
  }

  const items = event?.invitationMedia ?? [];

  if (!event || items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-950 px-4 text-center">
        <p className="text-sm text-slate-300">This invitation isn't available.</p>
      </div>
    );
  }

  const current = items[index];
  const isVideo = current.mimeType.startsWith("video/");
  const isImage = current.mimeType.startsWith("image/");
  const isPdf = !isVideo && !isImage;

  function prev() {
    setIndex((i) => (i - 1 + items.length) % items.length);
  }
  function next() {
    setIndex((i) => (i + 1) % items.length);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 py-8">
      <div className="flex max-h-full w-full max-w-2xl flex-col items-center">
        <div className="flex max-h-[80vh] w-full items-center justify-center overflow-hidden rounded-xl2 bg-white">
          {isImage && (
            <img src={mediaFileUrl(current.id)} alt={current.fileName} className="max-h-[80vh] w-full object-contain" />
          )}
          {isVideo && (
            <video
              key={current.id}
              src={mediaFileUrl(current.id)}
              controls
              playsInline
              className="max-h-[80vh] w-full bg-black"
            />
          )}
          {isPdf && (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <FileText className="h-12 w-12 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">{current.fileName}</p>
              <a
                href={mediaFileUrl(current.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Open PDF
              </a>
            </div>
          )}
        </div>

        {items.length > 1 && (
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-1.5">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to item ${i + 1}`}
                  className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              aria-label="Next"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
