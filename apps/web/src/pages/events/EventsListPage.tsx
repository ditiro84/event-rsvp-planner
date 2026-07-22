import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarHeart, MapPin, Plus, Users } from "lucide-react";
import { useEvents } from "@/hooks/useEvents";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { EVENT_TYPE_LABELS, formatDateShort } from "@/lib/format";
import { EventFormModal } from "./EventFormModal";

export default function EventsListPage() {
  const { data: events, isLoading } = useEvents();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Events</h1>
          <p className="mt-1 text-sm text-slate-500">Create and manage your events, guest lists and seating plans.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New event
        </Button>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && events?.length === 0 && (
        <EmptyState
          icon={<CalendarHeart className="h-10 w-10" />}
          title="No events yet"
          description="Create your first event to start inviting guests and building a seating plan."
          action={<Button onClick={() => setShowCreate(true)}>Create your first event</Button>}
        />
      )}

      {!isLoading && events && events.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link key={event.id} to={`/events/${event.id}`}>
              <Card className="h-full p-5 transition-shadow hover:shadow-md">
                <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  {EVENT_TYPE_LABELS[event.type] ?? event.type}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{event.name}</h3>
                <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                  <CalendarHeart className="h-4 w-4" />
                  {formatDateShort(event.date)}
                </div>
                {event.venueName && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    {event.venueName}
                  </div>
                )}
                {event.capacity && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <Users className="h-4 w-4" />
                    Capacity: {event.capacity}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <EventFormModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
