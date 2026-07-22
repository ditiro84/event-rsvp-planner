import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { usePlannerRsvpDashboard, useToggleRsvpOpen } from "@/hooks/useRsvp";
import { StatCard } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
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
