import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Spinner } from "@/components/ui/Spinner";

// Route-level code splitting: the initial bundle only needs enough to show
// the login screen or the dashboard shell. Everything else loads on first
// visit to that route -- the seating planner in particular gets its own,
// further split (see EventTabPages.tsx) since it alone pulls in the Konva
// canvas library, which accounts for a large share of total bundle size.
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const EventsListPage = lazy(() => import("@/pages/events/EventsListPage"));
const PublicRsvpPage = lazy(() => import("@/pages/rsvp/PublicRsvpPage"));

// All five of these live in one module (EventTabPages.tsx); pointing
// several lazy() calls at the same specifier is safe -- the bundler
// resolves it to a single shared chunk rather than duplicating it.
const EventOverviewRoute = lazy(() =>
  import("@/pages/events/EventTabPages").then((m) => ({ default: m.EventOverviewRoute }))
);
const EventGuestsRoute = lazy(() =>
  import("@/pages/events/EventTabPages").then((m) => ({ default: m.EventGuestsRoute }))
);
const EventRsvpRoute = lazy(() =>
  import("@/pages/events/EventTabPages").then((m) => ({ default: m.EventRsvpRoute }))
);
const EventSeatingRoute = lazy(() =>
  import("@/pages/events/EventTabPages").then((m) => ({ default: m.EventSeatingRoute }))
);
const EventCheckInRoute = lazy(() =>
  import("@/pages/events/EventTabPages").then((m) => ({ default: m.EventCheckInRoute }))
);

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/events" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/rsvp/invite/:invitationToken" element={<PublicRsvpPage />} />
        <Route path="/rsvp/:token" element={<PublicRsvpPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/events" element={<EventsListPage />} />
            <Route path="/events/:eventId" element={<Navigate to="overview" replace />} />
            <Route path="/events/:eventId/overview" element={<EventOverviewRoute />} />
            <Route path="/events/:eventId/guests" element={<EventGuestsRoute />} />
            <Route path="/events/:eventId/rsvp" element={<EventRsvpRoute />} />
            <Route path="/events/:eventId/seating" element={<EventSeatingRoute />} />
            <Route path="/events/:eventId/checkin" element={<EventCheckInRoute />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </Suspense>
  );
}
