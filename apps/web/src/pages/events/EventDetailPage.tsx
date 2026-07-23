import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useDeleteEvent, useEvent } from "@/hooks/useEvents";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { EVENT_TYPE_LABELS, formatDate } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { OverviewTab } from "./OverviewTab";
import { GuestsTab } from "./GuestsTab";
import { RsvpTab } from "./RsvpTab";
import { SeatingTab } from "./seating/SeatingTab";
import { CheckInTab } from "./CheckInTab";
import { EventFormModal } from "./EventFormModal";

const TABS = ["overview", "guests", "rsvp", "seating", "checkin"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  guests: "Guests",
  rsvp: "RSVP",
  seating: "Seating",
  checkin: "Check-in",
};

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(eventId);
  const deleteEvent = useDeleteEvent();
  const [tab, setTab] = useState<Tab>("overview");
  const [showEdit, setShowEdit] = useState(false);

  async function handleDelete() {
    if (!event) return;
    if (!confirm(`Delete "${event.name}"? This cannot be undone.`)) return;
    try {
      await deleteEvent.mutateAsync(event.id);
      toast.success("Event deleted");
      navigate("/events");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  if (isLoading || !event) return <Spinner />;

  return (
    <div>
      <Link to="/events" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            {EVENT_TYPE_LABELS[event.type] ?? event.type}
          </span>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{event.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(event.date)}
            {event.venueName ? ` · ${event.venueName}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "border-b-2 px-1 py-3 text-sm font-medium",
                tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </nav>
      </div>

      {tab === "overview" && <OverviewTab eventId={event.id} />}
      {tab === "guests" && <GuestsTab eventId={event.id} eventName={event.name} />}
      {tab === "rsvp" && <RsvpTab event={event} />}
      {tab === "seating" && <SeatingTab eventId={event.id} />}
      {tab === "checkin" && <CheckInTab eventId={event.id} />}

      <EventFormModal open={showEdit} onClose={() => setShowEdit(false)} event={event} />
    </div>
  );
}
