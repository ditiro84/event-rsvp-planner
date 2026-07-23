import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CalendarHeart, ChevronDown, MapPin, Plus, Users } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useEvents } from "@/hooks/useEvents";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { EventStatusBadge } from "@/components/ui/Badge";
import { ProgressStat } from "@/components/ui/ProgressBar";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/format";
import type { EventListItem } from "@/types";
import { EventFormModal } from "./EventFormModal";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function isUpcoming(event: EventListItem) {
  const eventDay = new Date(event.date);
  const today = new Date();
  return new Date(eventDay.getFullYear(), eventDay.getMonth(), eventDay.getDate()) >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

interface AttentionItem {
  eventId: string;
  eventName: string;
  text: string;
  to: string;
}

export default function EventsListPage() {
  const { user } = useAuth();
  const { data: events, isLoading, isError, refetch } = useEvents();
  const [showCreate, setShowCreate] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const { upcoming, past, summary, attention } = useMemo(() => {
    const all = events ?? [];
    const upcoming = all.filter(isUpcoming);
    const past = all.filter((e) => !isUpcoming(e));

    const summary = upcoming.reduce(
      (acc, e) => {
        acc.totalGuests += e.guestSummary.totalGuests;
        acc.pendingRsvps += e.guestSummary.pending + e.guestSummary.maybe;
        acc.unassigned += Math.max(e.guestSummary.confirmed - e.guestSummary.assignedGuests, 0);
        return acc;
      },
      { totalGuests: 0, pendingRsvps: 0, unassigned: 0 }
    );

    const attention: AttentionItem[] = [];
    for (const e of upcoming) {
      const pending = e.guestSummary.pending + e.guestSummary.maybe;
      const unassigned = Math.max(e.guestSummary.confirmed - e.guestSummary.assignedGuests, 0);
      if (pending > 0) {
        attention.push({
          eventId: e.id,
          eventName: e.name,
          text: `${pending} guest${pending === 1 ? " has" : "s have"} not responded to "${e.name}" yet.`,
          to: `/events/${e.id}/guests`,
        });
      }
      if (unassigned > 0) {
        attention.push({
          eventId: e.id,
          eventName: e.name,
          text: `${unassigned} confirmed guest${unassigned === 1 ? "" : "s"} at "${e.name}" still need${unassigned === 1 ? "s" : ""} a seat.`,
          to: `/events/${e.id}/seating`,
        });
      }
      if (e.rsvpDeadline && e.rsvpOpen) {
        const daysLeft = Math.ceil((new Date(e.rsvpDeadline).getTime() - Date.now()) / 86400000);
        if (daysLeft >= 0 && daysLeft <= 7) {
          attention.push({
            eventId: e.id,
            eventName: e.name,
            text: `RSVP deadline for "${e.name}" is approaching (${formatDate(e.rsvpDeadline)}).`,
            to: `/events/${e.id}/rsvp`,
          });
        }
      }
    }

    return { upcoming, past, summary, attention };
  }, [events]);

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">
            {getGreeting()}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Plan and manage your events from one place.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Create event
        </Button>
      </div>

      {isLoading && <Spinner />}

      {isError && (
        <ErrorState title="We couldn't load your events" onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && events && events.length > 0 && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Upcoming events" value={upcoming.length} icon={<CalendarHeart className="h-4 w-4" />} />
            <StatCard label="Total guests" value={summary.totalGuests} icon={<Users className="h-4 w-4" />} />
            <StatCard
              label="Pending RSVPs"
              value={summary.pendingRsvps}
              accent={summary.pendingRsvps > 0 ? "amber" : "default"}
            />
            <StatCard
              label="Unassigned guests"
              value={summary.unassigned}
              accent={summary.unassigned > 0 ? "amber" : "default"}
            />
          </div>

          {attention.length > 0 && (
            <Card className="mb-6 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <AlertCircle className="h-4 w-4 text-warning-600" />
                Needs attention
              </h2>
              <div className="space-y-2">
                {attention.slice(0, 5).map((item, i) => (
                  <Link
                    key={i}
                    to={item.to}
                    className="flex items-center justify-between gap-3 rounded-lg border border-warning-100 bg-warning-50/50 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-warning-50"
                  >
                    <span>{item.text}</span>
                    <span className="shrink-0 text-xs font-medium text-brand-600">View →</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {!isLoading && events?.length === 0 && (
        <EmptyState
          icon={<CalendarHeart className="h-8 w-8" />}
          title="Your next event starts here"
          description="Create your first event to start inviting guests and building a seating plan."
          action={<Button onClick={() => setShowCreate(true)}>Create your first event</Button>}
        />
      )}

      {!isLoading && upcoming.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Upcoming events ({upcoming.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && upcoming.length === 0 && events && events.length > 0 && (
        <EmptyState
          icon={<CalendarHeart className="h-8 w-8" />}
          title="No upcoming events"
          description="All your events are in the past. Create a new one to keep planning."
          action={<Button onClick={() => setShowCreate(true)}>Create event</Button>}
        />
      )}

      {!isLoading && past.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showPast ? "rotate-180" : ""}`} />
            Past events ({past.length})
          </button>
          {showPast && (
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {past.map((event) => (
                <EventCard key={event.id} event={event} muted />
              ))}
            </div>
          )}
        </div>
      )}

      <EventFormModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function EventCard({ event, muted = false }: { event: EventListItem; muted?: boolean }) {
  const { guestSummary: g } = event;
  return (
    <Link to={`/events/${event.id}/overview`}>
      <Card className={`h-full p-5 transition-shadow hover:shadow-elevated ${muted ? "opacity-70" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            {EVENT_TYPE_LABELS[event.type] ?? event.type}
          </span>
          <EventStatusBadge date={event.date} />
        </div>
        <h3 className="mt-3 text-lg font-semibold text-slate-900">{event.name}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <CalendarHeart className="h-3.5 w-3.5" />
            {formatDate(event.date)}
          </span>
          {event.venueName && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {event.venueName}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <ProgressStat label="RSVP" value={g.confirmed} max={g.totalGuests || 0} suffix="confirmed" />
          <ProgressStat label="Seating" value={g.assignedGuests} max={g.confirmed || 0} suffix="assigned" accent="success" />
        </div>
      </Card>
    </Link>
  );
}
