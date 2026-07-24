import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Armchair, ClipboardCheck, Mail, Users } from "lucide-react";
import { useEventDashboard } from "@/hooks/useEvents";
import { useInsights } from "@/hooks/useInsights";
import { Card, StatCard } from "@/components/ui/Card";
import { RadialProgress } from "@/components/ui/RadialProgress";
import { Stepper, type StepperStep } from "@/components/ui/Stepper";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/EmptyState";
import type { EventRecord } from "@/types";

// Short call-to-action label per insight destination, matching the
// per-item buttons ("View Unassigned", "Send Reminder") in the
// event-overview mockup's Action Required panel.
function ctaForLink(link: string): string {
  if (link.includes("/seating")) return "View Unassigned";
  if (link.includes("/rsvp")) return "Send Reminder";
  if (link.includes("/guests")) return "View Guests";
  return "View";
}

export function EventOverviewTab({ event }: { event: EventRecord }) {
  const { data, isLoading, isError, refetch } = useEventDashboard(event.id);
  const { data: insights } = useInsights(event.id);
  const navigate = useNavigate();

  if (isError) return <ErrorState title="We couldn't load this event's stats" onRetry={() => refetch()} />;
  if (isLoading || !data) return <Spinner />;

  const { stats } = data;
  const actionItems = (insights ?? []).filter((i) => i.severity === "ACTION_REQUIRED");
  const onTrack = actionItems.length === 0;

  const rsvpTotal = stats.totalGuests || 0;
  const rsvpDone = stats.confirmed;
  const seatingTotal = stats.confirmed || 0;
  const seatingDone = stats.assignedGuests;
  const checkinTotal = stats.confirmed || 0;
  const checkinDone = stats.checkedIn;

  const steps: StepperStep[] = [
    {
      label: "Guests",
      status: stats.totalGuests > 0 ? "completed" : "current",
      statusLabel: stats.totalGuests > 0 ? "Completed" : "Add your guest list",
    },
    {
      label: "RSVP Management",
      status: rsvpTotal === 0 ? "upcoming" : rsvpDone >= rsvpTotal ? "completed" : "current",
      statusLabel: rsvpTotal === 0 ? "Upcoming" : rsvpDone >= rsvpTotal ? "Completed" : "In Progress",
    },
    {
      label: "Seating Planner",
      status: seatingTotal === 0 ? "upcoming" : seatingDone >= seatingTotal ? "completed" : "current",
      statusLabel: seatingTotal === 0 ? "Upcoming" : seatingDone >= seatingTotal ? "Completed" : "In Progress",
    },
    {
      label: "Check-In",
      status: checkinTotal === 0 || checkinDone === 0 ? "upcoming" : checkinDone >= checkinTotal ? "completed" : "current",
      statusLabel: checkinTotal === 0 || checkinDone === 0 ? "Upcoming" : checkinDone >= checkinTotal ? "Completed" : "In Progress",
    },
  ];

  const quickCards = [
    {
      label: "Guests",
      icon: Users,
      value: stats.totalGuests,
      hint: "Total invited guests",
      to: `/events/${event.id}/guests`,
    },
    {
      label: "RSVP Management",
      icon: Mail,
      value: stats.confirmed,
      hint: "Confirmed attendees",
      to: `/events/${event.id}/rsvp`,
    },
    {
      label: "Seating Planner",
      icon: Armchair,
      value: stats.assignedGuests,
      hint: "Guests assigned to tables",
      to: `/events/${event.id}/seating`,
    },
    {
      label: "Check-In",
      icon: ClipboardCheck,
      value: stats.checkedIn > 0 ? stats.checkedIn : "Not Started",
      hint: "Live registration tracking",
      to: `/events/${event.id}/checkin`,
    },
  ];

  return (
    <div className="space-y-6">
      <Stepper steps={steps} />

      <div className="flex flex-col gap-6 lg:flex-row">
        <Card className="flex-1 p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">Event Readiness</h2>
            <Badge variant={onTrack ? "success" : "warning"}>{onTrack ? "On Track" : "Needs Attention"}</Badge>
          </div>
          <p className="mb-6 text-sm text-slate-500">
            {onTrack
              ? "Your event is on track. Manage active RSVPs and seating layouts below."
              : "A few items need attention below to stay on schedule."}
          </p>
          <div className="flex flex-col gap-5 sm:flex-row">
            <RadialProgress value={rsvpDone} max={rsvpTotal} label="RSVP Progress" sublabel={`${rsvpDone} / ${rsvpTotal}`} accent="brand" />
            <RadialProgress
              value={seatingDone}
              max={seatingTotal}
              label="Seating Progress"
              sublabel={`${seatingDone} / ${seatingTotal}`}
              accent="success"
            />
            <RadialProgress
              value={checkinDone}
              max={checkinTotal}
              label="Check-In Progress"
              sublabel={checkinTotal === 0 ? "Upcoming" : `${checkinDone} / ${checkinTotal}`}
              accent="warning"
            />
          </div>
        </Card>

        <Card className="w-full border-warning-200 bg-warning-50/60 p-6 sm:p-7 lg:w-[420px]">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-[18px] w-[18px] text-warning-700" />
            <h2 className="text-lg font-bold text-warning-900">{onTrack ? "All Clear" : "Action Required"}</h2>
          </div>
          <p className="mb-5 text-sm text-warning-700">
            {onTrack
              ? "No outstanding actions right now -- nice work staying ahead of things."
              : "Please address these urgent planner items to maintain your timeline."}
          </p>
          {actionItems.length > 0 && (
            <div className="space-y-3">
              {actionItems.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4">
                  <p className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{item.title}</p>
                  <Button size="sm" variant="secondary" className="shrink-0" onClick={() => navigate(item.link)}>
                    {ctaForLink(item.link)}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Quick Access Command Panels</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {quickCards.map((qc) => (
            <Card key={qc.label} className="flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">{qc.label}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
                  <qc.icon className="h-4 w-4 text-brand-600" />
                </span>
              </div>
              <div>
                <p className="text-[28px] font-bold leading-tight text-slate-900">{qc.value}</p>
                <p className="text-[13px] text-slate-400">{qc.hint}</p>
              </div>
              <div className="h-px w-full bg-slate-100" />
              <button
                onClick={() => navigate(qc.to)}
                className="flex items-center gap-1 self-start text-[13px] font-semibold text-brand-600 hover:text-brand-700"
              >
                Go to planner
                <ArrowRight className="h-3 w-3" />
              </button>
            </Card>
          ))}
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
