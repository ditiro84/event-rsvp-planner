import { useRef } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import { usePlannerRsvpDashboard, useToggleRsvpOpen } from "@/hooks/useRsvp";
import {
  useDeleteInvitationCard,
  useInvitationCardMeta,
  useInvitationCardPreview,
  useUploadInvitationCard,
} from "@/hooks/useInvitationCard";
import { StatCard } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatFileSize } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import type { EventRecord } from "@/types";

export function RsvpTab({ event }: { event: EventRecord }) {
  const { data, isLoading } = usePlannerRsvpDashboard(event.id);
  const toggleRsvpOpen = useToggleRsvpOpen(event.id);

  const rsvpUrl = `${window.location.origin}/rsvp/${event.rsvpToken}`;

  function copyLink() {
    navigator.clipboard.writeText(rsvpUrl);
    toast.success("RSVP link copied to clipboard");
  }

  if (isLoading || !data) return <Spinner />;

  return (
    <div className="space-y-6">
      <InvitationCardSection eventId={event.id} />
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-slate-700">Public RSVP link</p>
            <p className="mt-1 break-all text-sm text-brand-700">{rsvpUrl}</p>
            {event.rsvpDeadline && <p className="mt-1 text-xs text-slate-500">Deadline: {formatDate(event.rsvpDeadline)}</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={copyLink}>
              <Copy className="h-4 w-4" />
              Copy link
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.open(rsvpUrl, "_blank")}>
              <ExternalLink className="h-4 w-4" />
              Open
            </Button>
            <Button
              size="sm"
              variant={data.rsvpOpen ? "danger" : "primary"}
              onClick={() => toggleRsvpOpen.mutate(!data.rsvpOpen)}
              isLoading={toggleRsvpOpen.isPending}
            >
              {data.rsvpOpen ? "Close RSVPs" : "Reopen RSVPs"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total invited" value={data.stats.totalInvited} />
        <StatCard label="Confirmed" value={data.stats.confirmed} accent="green" />
        <StatCard label="Declined" value={data.stats.declined} accent="red" />
        <StatCard label="Pending" value={data.stats.pending} accent="amber" />
        <StatCard label="Expected attendees" value={data.stats.totalExpectedAttendees} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Guests who haven't responded ({data.nonResponders.length})
        </h2>
        {data.nonResponders.length === 0 ? (
          <EmptyState title="Everyone has responded" description="No pending RSVPs right now." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">Email</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.nonResponders.map((guest) => (
                  <tr key={guest.id}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {guest.firstName} {guest.lastName}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{guest.email || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{guest.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


function InvitationCardSection({ eventId }: { eventId: string }) {
  const { data: card, isLoading } = useInvitationCardMeta(eventId);
  const upload = useUploadInvitationCard(eventId);
  const remove = useDeleteInvitationCard(eventId);
  const { previewUrl } = useInvitationCardPreview(eventId, !!card && card.mimeType.startsWith("image/"));
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await upload.mutateAsync(file);
      toast.success("Invitation card uploaded");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleRemove() {
    if (!confirm("Remove the invitation card? Guests will stop receiving it with new invites.")) return;
    try {
      await remove.mutateAsync();
      toast.success("Invitation card removed");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Invitation card</p>
          <p className="mt-1 text-xs text-slate-500">
            Attach a designed PDF or image (PNG/JPEG, up to 8MB) to send alongside the QR code in invite emails.
            WhatsApp invites will include a link to view it, since WhatsApp links can't auto-attach files.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        className="hidden"
        onChange={handleFileChange}
      />

      {isLoading ? (
        <Spinner />
      ) : card ? (
        <div className="flex items-center gap-4 rounded-lg border border-slate-200 p-3">
          {previewUrl ? (
            <img src={previewUrl} alt="Invitation card preview" className="h-20 w-20 rounded-md border border-slate-200 object-cover" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{card.fileName}</p>
            <p className="text-xs text-slate-500">
              {formatFileSize(card.size)} &middot; uploaded {formatDate(card.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} isLoading={upload.isPending}>
              Replace
            </Button>
            <Button variant="danger" size="sm" onClick={handleRemove} isLoading={remove.isPending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Upload className="h-8 w-8" />}
          title="No invitation card yet"
          description="Upload a PDF or image and it'll be attached to every invite email automatically."
          action={
            <Button size="sm" onClick={() => fileInputRef.current?.click()} isLoading={upload.isPending}>
              <Upload className="h-4 w-4" />
              Upload card
            </Button>
          }
        />
      )}
    </div>
  );
}
