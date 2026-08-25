import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Globe, Image as ImageIcon, Upload } from "lucide-react";
import { useUpdateEvent } from "@/hooks/useEvents";
import { eventCoverImagePath, useUploadEventCoverImage } from "@/hooks/useTicketTypes";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AuthedImage } from "@/components/ui/AuthedImage";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api";
import { PUBLIC_EVENT_CATEGORY_LABELS } from "@/lib/format";
import type { EventRecord, PublicEventCategory } from "@/types";

// Local preview of a not-yet-uploaded cover image file.
function usePendingFilePreview(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

export function PublishSettingsPanel({ event }: { event: EventRecord }) {
  const updateEvent = useUpdateEvent(event.id);
  const uploadCoverImage = useUploadEventCoverImage(event.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const pendingPreviewUrl = usePendingFilePreview(pendingFile);

  const [category, setCategory] = useState<PublicEventCategory>(event.publicCategory ?? "NIGHTLIFE");
  const [description, setDescription] = useState(event.publicDescription ?? "");
  const [minAge, setMinAge] = useState(event.minAge?.toString() ?? "");

  const publicUrl = event.publicSlug ? `${window.location.origin}/tickets/${event.publicSlug}` : null;

  async function handleUploadPendingFile(file: File) {
    try {
      await uploadCoverImage.mutateAsync(file);
      setPendingFile(null);
      toast.success("Cover image updated");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleTogglePublic() {
    try {
      await updateEvent.mutateAsync({ isPublic: !event.isPublic });
      toast.success(event.isPublic ? "Event unpublished" : "Event is now public -- tickets can go on sale");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleSaveDetails() {
    try {
      await updateEvent.mutateAsync({
        publicCategory: category,
        publicDescription: description || null,
        minAge: minAge === "" ? null : Number(minAge),
      });
      toast.success("Listing details saved");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  function copyLink() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied");
  }

  return (
    <Card className="p-5">
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-slate-900">Public Ticket Listing</h2>
        <Badge variant={event.isPublic ? "success" : "neutral"}>{event.isPublic ? "Public" : "Not published"}</Badge>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Make this event discoverable at its own public page where anyone can buy tickets -- separate from the
        private RSVP flow above. Good for nightclub nights, boat cruises, concerts, and other ticketed events.
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-brand-400 hover:text-brand-600"
          >
            {pendingPreviewUrl ? (
              <img src={pendingPreviewUrl} alt="" className="h-full w-full object-cover" />
            ) : event.hasCoverImage ? (
              <AuthedImage
                src={eventCoverImagePath(event.id)}
                alt=""
                className="h-full w-full object-cover"
                fallback={<ImageIcon className="h-6 w-6" />}
              />
            ) : (
              <Upload className="h-6 w-6" />
            )}
          </button>
          <div className="text-xs text-slate-500">
            <p className="font-medium text-slate-700">Cover image</p>
            <p>PNG, JPEG, or WEBP, up to 5MB. Shown at the top of the public ticket page.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setPendingFile(file);
              if (file) handleUploadPendingFile(file);
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Category" htmlFor="pub-category">
            <Select id="pub-category" value={category} onChange={(e) => setCategory(e.target.value as PublicEventCategory)}>
              {Object.entries(PUBLIC_EVENT_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Minimum age (optional)" htmlFor="pub-minage">
            <Input id="pub-minage" type="number" min="0" max="100" value={minAge} onChange={(e) => setMinAge(e.target.value)} />
          </Field>
        </div>
        <Field label="Public description" htmlFor="pub-description" hint="Shown on the public ticket page -- separate from the private RSVP message.">
          <Textarea id="pub-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={event.isPublic} onChange={handleTogglePublic} disabled={updateEvent.isPending} />
            Publish to the public ticket page
          </label>
          <Button variant="secondary" size="sm" onClick={handleSaveDetails} isLoading={updateEvent.isPending}>
            Save listing details
          </Button>
        </div>

        {publicUrl && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <Globe className="h-4 w-4 shrink-0 text-slate-400" />
            <a href={publicUrl} target="_blank" rel="noreferrer" className="truncate font-medium text-brand-700 hover:underline">
              {publicUrl}
            </a>
            <button
              onClick={copyLink}
              aria-label="Copy public ticket page link"
              className="ml-auto shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-brand-600"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
