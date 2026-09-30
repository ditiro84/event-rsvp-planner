import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import type { InvitationMediaItem } from "@/types";

// Lightweight lightbox for the invitation media a host has uploaded for an
// event (see RsvpTab.tsx's InvitationCardSection for the host-side manager)
// -- images and short video clips render inline, PDFs get an "Open PDF"
// button since embedding them reliably cross-browser isn't worth the
// complexity here. No external carousel library: with at most a handful of
// items (MAX_INVITATION_MEDIA_ITEMS server-side), plain state is simpler
// and keeps this dependency-free.
export function InvitationMediaGallery({
  items,
  mediaFileUrl,
  renderTrigger,
}: {
  items: InvitationMediaItem[];
  mediaFileUrl: (mediaId: string) => string;
  renderTrigger: (onClick: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (items.length === 0) return null;

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
    <>
      {renderTrigger(() => {
        setIndex(0);
        setOpen(true);
      })}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div className="relative flex max-h-full w-full max-w-lg flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute -top-10 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex max-h-[80vh] w-full items-center justify-center overflow-hidden rounded-xl2 bg-white">
              {isImage && (
                <img src={mediaFileUrl(current.id)} alt={current.fileName} className="max-h-[80vh] w-full object-contain" />
              )}
              {isVideo && (
                // No autoplay -- most browsers block autoplay-with-sound
                // anyway, and letting the guest tap to play is simpler and
                // more predictable than fighting that policy with a muted
                // autoplay workaround.
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
      )}
    </>
  );
}

