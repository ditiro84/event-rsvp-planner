import { lazy, Suspense, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useEvent } from "@/hooks/useEvents";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/EmptyState";
import { EventOverviewTab } from "./OverviewTab";
import { GuestsTab } from "./GuestsTab";
import { RsvpTab } from "./RsvpTab";
import { CheckInTab } from "./CheckInTab";
import { VendorsTab } from "./VendorsTab";
import type { EventRecord } from "@/types";

// Split out on its own: the seating planner is the only screen that needs
// Konva, which is by far the single largest dependency in this app. Every
// other tab loads with the rest of this module; Seating only downloads its
// extra chunk when a guest actually opens the seating tab.
const SeatingTab = lazy(() => import("./seating/SeatingTab").then((m) => ({ default: m.SeatingTab })));

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

// Shared guard so every route below fails the same way: a broken/expired
// connection shows a retry action instead of spinning forever (the raw
// `isLoading || !data` check that used to gate these routes had no way to
// tell "still loading" apart from "the request errored out").
function EventRouteGuard({ children }: { children: (event: EventRecord) => ReactNode }) {
  const { data: event, isLoading, isError, refetch } = useRouteEvent();
  if (isError) {
    return <ErrorState title="We couldn't load this event" onRetry={() => refetch()} />;
  }
  if (isLoading || !event) return <Spinner />;
  return <>{children(event)}</>;
}

export function EventOverviewRoute() {
  return <EventRouteGuard>{(event) => <EventOverviewTab event={event} />}</EventRouteGuard>;
}

export function EventGuestsRoute() {
  return <EventRouteGuard>{(event) => <GuestsTab eventId={event.id} eventName={event.name} />}</EventRouteGuard>;
}

export function EventRsvpRoute() {
  return <EventRouteGuard>{(event) => <RsvpTab event={event} />}</EventRouteGuard>;
}

export function EventSeatingRoute() {
  return (
    <EventRouteGuard>
      {(event) => (
        <Suspense fallback={<Spinner />}>
          <SeatingTab eventId={event.id} />
        </Suspense>
      )}
    </EventRouteGuard>
  );
}

export function EventCheckInRoute() {
  return <EventRouteGuard>{(event) => <CheckInTab eventId={event.id} />}</EventRouteGuard>;
}

export function EventVendorsRoute() {
  return <EventRouteGuard>{(event) => <VendorsTab eventId={event.id} />}</EventRouteGuard>;
}
