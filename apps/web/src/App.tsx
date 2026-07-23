import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import EventsListPage from "@/pages/events/EventsListPage";
import PublicRsvpPage from "@/pages/rsvp/PublicRsvpPage";
import {
  EventCheckInRoute,
  EventGuestsRoute,
  EventOverviewRoute,
  EventRsvpRoute,
  EventSeatingRoute,
} from "@/pages/events/EventTabPages";

export default function App() {
  return (
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
  );
}
