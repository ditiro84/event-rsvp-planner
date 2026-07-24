import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarHeart, ChevronDown, MailQuestion, MapPin, Plus, Settings, Sparkles, UserMinus, Users } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useEvents } from "@/hooks/useEvents";
import { useInsights } from "@/hooks/useInsights";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { ProgressStat } from "@/components/ui/ProgressBar";
import { formatDate } from "@/lib/format";
import type { EventListItem, InsightRecord } from "@/types";
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
  return (
    new Date(eventDay.getFullYear(), eventDay.getMonth(), eventDay.getDate()) >=
    new Date(today.getFullYear(), today.getMonth(), today.getDate())
  );
}

export default function EventsListPage() {
  const { user } = useAuth();
  const { data: events, isLoading, isError, refetch } = useEvents();
  const { data: insights } = useInsights();
  const [showCreate, setShowCreate] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const { upcoming, past, summary } = useMemo(() => {
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

    return { upcoming, past, summary };
  }, [events]);

  const actionRequiredByEvent = useMemo(() => {
    const set = new Set<string>();
    for (const i of insights ?? []) if (i.severity === "ACTION_REQUIRED") set.add(i.eventId);
    return set;
  }, [insights]);

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-[32px] font-bold text-slate-950">
            {getGreeting()}
            {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-[15px] text-slate-500">Here is a summary of your workspace activities and live events today.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="rounded-xl px-5 py-3">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      {isLoading && <Spinner />}

      {isError && <ErrorState title="We couldn't load your events" onRetry={() => refetch()} />}

      {!isLoading && !isError && events && events.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
          <StatCard label="Upcoming Events" value={upcoming.length} icon={<CalendarHeart className="h-4 w-4" />} />
          <StatCard label="Total Guests" value={summary.totalGuests} icon={<Users className="h-4 w-4" />} />
          <StatCard
            label="Pending RSVPs"
            value={summary.pendingRsvps}
            accent={summary.pendingRsvps > 0 ? "amber" : "default"}
            icon={<MailQuestion className="h-4 w-4" />}
          />
          <StatCard
            label="Unassigned Seats"
            value={summary.unassigned}
            accent={summary.unassigned > 0 ? "amber" : "default"}
            icon={<UserMinus className="h-4 w-4" />}
          />
        </div>
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
        <div className="mb-8">
          <h2 className="mb-4 font-display text-xl font-bold text-slate-950">Active Projects</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} needsAttention={actionRequiredByEvent.has(event.id)} />
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

      {insights && insights.length > 0 && <NeedsAttentionSection insights={insights} />}

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
                <EventCard key={event.id} event={event} muted needsAttention={false} />
              ))}
            </div>
          )}
        </div>
      )}

      <EventFormModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function NeedsAttentionSection({ insights }: { insights: InsightRecord[] }) {
  const visible = insights.slice(0, 5);
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-slate-950">Needs Attention</h2>
        {insights.length > visible.length && (
          <span className="text-sm font-semibold text-brand-600">{insights.length} alerts</span>
        )}
      </div>
      <div className="space-y-3">
        {visible.map((insight) => (
          <div key={insight.id} className="flex items-center gap-4 rounded-xl2 border border-slate-100 bg-white p-4 shadow-card">
            {insight.severity === "ACTION_REQUIRED" ? (
              <Badge variant="danger" className="rounded-lg uppercase">
                Action Required
              </Badge>
            ) : (
              <Badge variant="warning" className="rounded-lg uppercase">
                Update
              </Badge>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{insight.description}</p>
              <p className="mt-0.5 text-xs font-medium text-brand-600">{insight.eventName}</p>
            </div>
            <Link
              to={insight.link}
              className="shrink-0 rounded-lg border border-slate-200 px-3.5 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Resolve
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventCard({
  event,
  muted = false,
  needsAttention,
}: {
  event: EventListItem;
  muted?: boolean;
  needsAttention: boolean;
}) {
  const { guestSummary: g } = event;
  return (
    <Card className={`p-6 sm:p-8 ${muted ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {needsAttention ? (
            <Badge variant="warning" className="rounded-full uppercase">
              Needs Attention
            </Badge>
          ) : (
            <Badge variant="success" className="rounded-full uppercase">
              On Track
            </Badge>
          )}
          <h3 className="mt-2 truncate text-2xl font-bold text-slate-950">{event.name}</h3>
        </div>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl2 bg-brand-100">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Sparkles className="h-6 w-6 text-brand-500" />
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2.5 text-sm text-slate-600">
        <span className="flex items-center gap-2.5">
          <CalendarHeart className="h-4 w-4 text-slate-400" />
          {formatDate(event.date)}
        </span>
        {event.venueName && (
          <span className="flex items-center gap-2.5 truncate">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{event.venueName}</span>
          </span>
        )}
      </div>

      <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
        <ProgressStat label="RSVP Progress" value={g.confirmed} max={g.totalGuests || 0} suffix="confirmed" />
        <ProgressStat label="Seating Assignment" value={g.assignedGuests} max={g.confirmed || 0} suffix="assigned" accent="success" />
      </div>

      <div className="mt-5 flex items-center justify-between pt-1">
        <Link
          to={`/events/${event.id}/overview`}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Settings className="h-3.5 w-3.5" />
          Manage
        </Link>
        <Link
          to={`/events/${event.id}/overview`}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Open Event
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}
