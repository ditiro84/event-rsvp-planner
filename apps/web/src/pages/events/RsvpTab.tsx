import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Clock, Copy, FileText, Search, Send, Trash2, Upload } from "lucide-react";
import { usePlannerRsvpDashboard, useToggleRsvpOpen } from "@/hooks/useRsvp";
import { useGuests, type GuestFilters } from "@/hooks/useGuests";
import { useBulkSendInviteEmails } from "@/hooks/useInvites";
import {
  useDeleteInvitationCard,
  useInvitationCardMeta,
  useInvitationCardPreview,
  useUploadInvitationCard,
} from "@/hooks/useInvitationCard";
import { Card } from "@/components/ui/Card";
import { DonutChart } from "@/components/ui/DonutChart";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Badge, RsvpStatusBadge } from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { formatDate, formatFileSize, formatRelativeTime } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { EventRecord, RsvpStatus } from "@/types";

const TABS: { label: string; value: RsvpStatus | undefined; statKey: "confirmed" | "pending" | "declined" | "maybe" | undefined }[] = [
  { label: "All Guests", value: undefined, statKey: undefined },
  { label: "Confirmed", value: "CONFIRMED", statKey: "confirmed" },
  { label: "Pending", value: "PENDING", statKey: "pending" },
  { label: "Declined", value: "DECLINED", statKey: "declined" },
  { label: "Maybe", value: "MAYBE", statKey: "maybe" },
];

export function RsvpTab({ event }: { event: EventRecord }) {
  const { data, isLoading, isError, refetch } = usePlannerRsvpDashboard(event.id);
  const toggleRsvpOpen = useToggleRsvpOpen(event.id);
  const bulkSendInvites = useBulkSendInviteEmails(event.id);

  const [statusFilter, setStatusFilter] = useState<RsvpStatus | undefined>(undefined);
  const [search, setSearch] = useState("");
  const filters: GuestFilters = { status: statusFilter, search: search || undefined };
  const { data: guests } = useGuests(event.id, filters);
  const { data: allGuests } = useGuests(event.id, {});

  const rsvpUrl = `${window.location.origin}/rsvp/${event.rsvpToken}`;

  function copyLink() {
    navigator.clipboard.writeText(rsvpUrl);
    toast.success("RSVP link copied to clipboard");
  }

  async function handleSendReminders() {
    if (!confirm("Email an RSVP reminder to every guest who has an email address on file?")) return;
    try {
      const result = await bulkSendInvites.mutateAsync(undefined);
      if (result.failed > 0) {
        toast.warning(`Sent ${result.sent}/${result.total} reminders (${result.failed} failed)`);
      } else {
        toast.success(`Sent ${result.sent} reminder${result.sent === 1 ? "" : "s"}`);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  const recentActivity = useMemo(() => {
    if (!allGuests) return [];
    return allGuests
      .filter((g) => g.rsvpRespondedAt)
      .sort((a, b) => new Date(b.rsvpRespondedAt!).getTime() - new Date(a.rsvpRespondedAt!).getTime())
      .slice(0, 4);
  }, [allGuests]);

  if (isError) return <ErrorState title="We couldn't load RSVP status" onRetry={() => refetch()} />;
  if (isLoading || !data) return <Spinner />;

  const responseRate = data.stats.totalInvited > 0 ? Math.round((data.stats.confirmed + data.stats.declined + data.stats.maybe) / data.stats.totalInvited * 100) : 0;
  const daysLeft = event.rsvpDeadline ? Math.ceil((new Date(event.rsvpDeadline).getTime() - Date.now()) / 86400000) : null;
  const deadlinePct = event.rsvpDeadline
    ? Math.min(100, Math.max(0, 100 - ((daysLeft ?? 0) / 30) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">RSVP Management</h2>
          <p className="mt-1 text-sm text-slate-500">
            Monitor guest response status, dietary requirements, and coordinate party limits.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Badge variant={data.rsvpOpen ? "success" : "neutral"}>{data.rsvpOpen ? "Live Invitation" : "RSVPs Closed"}</Badge>
          <Button variant="secondary" size="sm" onClick={copyLink}>
            <Copy className="h-4 w-4" />
            Share RSVP Link
          </Button>
          <Button size="sm" onClick={handleSendReminders} isLoading={bulkSendInvites.isPending}>
            <Send className="h-4 w-4" />
            Send Reminders
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <Card className="flex-1 p-6">
          <h3 className="mb-6 text-base font-bold text-slate-900">Response Overview</h3>
          <div className="flex items-center gap-10">
            <DonutChart
              centerValue={data.stats.totalInvited}
              centerLabel="Invited"
              slices={[
                { value: data.stats.confirmed, colorClass: "stroke-success-500" },
                { value: data.stats.pending, colorClass: "stroke-warning-500" },
                { value: data.stats.declined, colorClass: "stroke-danger-500" },
                { value: data.stats.maybe, colorClass: "stroke-blue-500" },
              ]}
            />
            <div className="flex flex-1 flex-col gap-3">
              <LegendRow dot="bg-success-500" label="Confirmed" value={data.stats.confirmed} />
              <LegendRow dot="bg-warning-500" label="Pending" value={data.stats.pending} />
              <LegendRow dot="bg-danger-500" label="Declined" value={data.stats.declined} />
              <LegendRow dot="bg-blue-500" label="Maybe" value={data.stats.maybe} />
            </div>
          </div>
        </Card>

        <Card className="flex-1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Key Milestones</h3>
            <Clock className="h-[18px] w-[18px] text-brand-600" />
          </div>
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl font-extrabold text-brand-600">
                {responseRate}%
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Response Rate</p>
                <p className="text-base font-bold text-slate-900">
                  {data.stats.confirmed + data.stats.declined + data.stats.maybe} of {data.stats.totalInvited} Guests Replied
                </p>
              </div>
            </div>
            {event.rsvpDeadline && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">RSVP Deadline</span>
                  <span className={cn("text-xs font-bold", daysLeft !== null && daysLeft <= 7 ? "text-warning-600" : "text-slate-500")}>
                    {daysLeft !== null && daysLeft >= 0 ? `${daysLeft} days remaining` : "Deadline passed"}
                  </span>
                </div>
                <p className="mb-2 text-base font-bold text-slate-900">{formatDate(event.rsvpDeadline)}</p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${deadlinePct}%` }} />
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="w-full p-6 lg:w-[380px]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-400">No responses yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {recentActivity.map((guest) => (
                <div key={guest.id} className="flex items-start gap-3">
                  <Avatar firstName={guest.firstName} lastName={guest.lastName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {guest.firstName} {guest.lastName}{" "}
                      {guest.rsvpStatus === "CONFIRMED" && "confirmed"}
                      {guest.rsvpStatus === "DECLINED" && "declined"}
                      {guest.rsvpStatus === "MAYBE" && "changed to Maybe"}
                      {guest.rsvpStatus === "PENDING" && "responded"}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        {guest.additionalGuestsCount > 0 ? `+${guest.additionalGuestsCount} guests` : guest.dietaryRequirements || "—"}
                      </span>
                      <span className="text-slate-400">{formatRelativeTime(guest.rsvpRespondedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <InvitationCardSection eventId={event.id} />

      <Card className="p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  statusFilter === tab.value ? "bg-brand-50 text-brand-700 font-semibold" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                {tab.label} ({tab.statKey ? data.stats[tab.statKey] : data.stats.totalInvited})
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search guests..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {!guests || guests.length === 0 ? (
          <EmptyState title="No guests match this view" description="Try a different filter or search term." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Name</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Email</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Status</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Responded Date</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Party Size</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Dietary Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guests.map((guest) => (
                  <tr key={guest.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar firstName={guest.firstName} lastName={guest.lastName} size="sm" />
                        <span className="font-semibold text-slate-900">
                          {guest.firstName} {guest.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{guest.email || "—"}</td>
                    <td className="px-4 py-3">
                      <RsvpStatusBadge status={guest.rsvpStatus} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{guest.rsvpRespondedAt ? formatDate(guest.rsvpRespondedAt) : "—"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{1 + guest.additionalGuestsCount}</td>
                    <td className="px-4 py-3 text-slate-600">{guest.dietaryRequirements || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-slate-700">RSVP link accepting responses</p>
            <p className="mt-1 break-all text-sm text-brand-700">{rsvpUrl}</p>
          </div>
          <Button
            size="sm"
            variant={data.rsvpOpen ? "danger" : "primary"}
            onClick={() => toggleRsvpOpen.mutate(!data.rsvpOpen)}
            isLoading={toggleRsvpOpen.isPending}
          >
            {data.rsvpOpen ? "Close RSVPs" : "Reopen RSVPs"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function LegendRow({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}

function InvitationCardSection({ eventId }: { eventId: string }) {
  const { data: card, isLoading, isError, refetch } = useInvitationCardMeta(eventId);
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
    <Card className="p-5">
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
      ) : isError ? (
        <ErrorState title="Couldn't load the invitation card" onRetry={() => refetch()} />
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
    </Card>
  );
}
