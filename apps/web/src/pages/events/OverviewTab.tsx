import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { useEventDashboard } from "@/hooks/useEvents";
import { Card, StatCard } from "@/components/ui/Card";
import { ProgressStat } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/format";
import type { EventRecord } from "@/types";

interface ReadinessAction {
  text: string;
  cta: string;
  to: string;
}

export function EventOverviewTab({ event }: { event: EventRecord }) {
  const { data, isLoading } = useEventDashboard(event.id);
  const navigate = useNavigate();

  if (isLoading || !data) return <Spinner />;

  const { stats } = data;
  const pendingResponses = stats.pending + stats.maybe;

  const actions: ReadinessAction[] = [];
  if (pendingResponses > 0) {
    actions.push({
      text: `${pendingResponses} guest${pendingResponses === 1 ? " has" : "s have"} not responded yet.`,
      cta: "View guests",
      to: `/events/${event.id}/guests`,
    });
  }
  if (stats.unassignedConfirmedGuests > 0) {
    actions.push({
      text: `${stats.unassignedConfirmedGuests} confirmed guest${stats.unassignedConfirmedGuests === 1 ? "" : "s"} still need${
        stats.unassignedConfirmedGuests === 1 ? "s" : ""
      } a seat.`,
      cta: "Open seating planner",
      to: `/events/${event.id}/seating`,
    });
  }
  if (event.rsvpDeadline && event.rsvpOpen) {
    const daysLeft = Math.ceil((new Date(event.rsvpDeadline).getTime() - Date.now()) / 86400000);
    if (daysLeft >= 0 && daysLeft <= 7) {
      actions.push({
        text: `RSVP deadline is approaching (${formatDate(event.rsvpDeadline)}).`,
        cta: "View RSVP status",
        to: `/events/${event.id}/rsvp`,
      });
    }
  }

  const onTrack = actions.length === 0;

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              onTrack ? "bg-success-50 text-success-600" : "bg-warning-50 text-warning-600"
            }`}
          >
            {onTrack ? <Sparkles className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900">
              {onTrack ? "Your event is on track" : "A few things need attention"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {onTrack
                ? "RSVPs, seating and check-in are all progressing well."
                : "Here's what will make the biggest difference right now."}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <ProgressStat label="RSVP progress" value={stats.confirmed} max={stats.totalGuests || 0} suffix="confirmed" />
          <ProgressStat
            label="Seating progress"
            value={stats.assignedGuests}
            max={stats.confirmed || 0}
            suffix="assigned"
            accent="success"
          />
          <ProgressStat
            label="Check-in"
            value={stats.checkedIn}
            max={stats.confirmed || 0}
            suffix="checked in"
            accent="brand"
          />
        </div>
      </Card>

      {!onTrack && (
        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Action required</h3>
          <div className="space-y-3">
            {actions.map((action) => (
              <div
                key={action.cta + action.text}
                className="flex flex-col gap-3 rounded-xl border border-warning-100 bg-warning-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm text-slate-700">{action.text}</p>
                <Button size="sm" variant="secondary" className="shrink-0" onClick={() => navigate(action.to)}>
                  {action.cta}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {onTrack && (
        <div className="flex items-center gap-2 rounded-xl border border-success-100 bg-success-50/60 px-4 py-3 text-sm text-success-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Everything is on track. No outstanding actions right now.
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Guest details</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total invited" value={stats.totalGuests} />
          <StatCard label="Declined" value={stats.declined} accent="red" />
          <StatCard label="Expected attendees" value={stats.totalExpectedAttendees} />
          <StatCard label="Tables created" value={stats.totalTables} />
          <StatCard label="VIP guests" value={stats.vip} accent="purple" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Dietary &amp; accessibility</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Vegetarian" value={stats.vegetarian} />
          <StatCard label="Vegan" value={stats.vegan} />
          <StatCard label="Dietary requirements" value={stats.withDietaryRequirements} />
          <StatCard label="Accessibility needs" value={stats.withAccessibilityRequirements} />
        </div>
      </div>
    </div>
  );
}
