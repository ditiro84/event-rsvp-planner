import { useParams } from "react-router-dom";
import { useEvent } from "@/hooks/useEvents";
import { Spinner } from "@/components/ui/Spinner";
import { EventOverviewTab } from "./OverviewTab";
import { GuestsTab } from "./GuestsTab";
import { RsvpTab } from "./RsvpTab";
import { SeatingTab } from "./seating/SeatingTab";
import { CheckInTab } from "./CheckInTab";

// Each event section now lives at its own URL (/events/:id/guests, etc.)
// instead of being client-side tab state, so the browser back button, deep
// links, and page refreshes all land on the right section. These thin
// wrapper components just resolve the event from the route param -- the
// react-query cache means this doesn't cause an extra network request
// beyond the one DashboardLayout's sidebar already makes for the same
// eventId.
function useRouteEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  return useEvent(eventId);
}

export function EventOverviewRoute() {
  const { data: event, isLoading } = useRouteEvent();
  if (isLoading || !event) return <Spinner />;
  return <EventOverviewTab event={event} />;
}

export function EventGuestsRoute() {
  const { data: event, isLoading } = useRouteEvent();
  if (isLoading || !event) return <Spinner />;
  return <GuestsTab eventId={event.id} eventName={event.name} />;
}

export function EventRsvpRoute() {
  const { data: event, isLoading } = useRouteEvent();
  if (isLoading || !event) return <Spinner />;
  return <RsvpTab event={event} />;
}

export function EventSeatingRoute() {
  const { data: event, isLoading } = useRouteEvent();
  if (isLoading || !event) return <Spinner />;
  return <SeatingTab eventId={event.id} />;
}

export function EventCheckInRoute() {
  const { data: event, isLoading } = useRouteEvent();
  if (isLoading || !event) return <Spinner />;
  return <CheckInTab eventId={event.id} />;
}
