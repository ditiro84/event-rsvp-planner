import { useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Armchair,
  CalendarHeart,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Mail,
  Pencil,
  PartyPopper,
  Trash2,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useDeleteEvent, useEvent } from "@/hooks/useEvents";
import { Badge } from "@/components/ui/Badge";
import { getApiErrorMessage } from "@/lib/api";
import { EVENT_TYPE_LABELS, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/cn";
import { EventFormModal } from "@/pages/events/EventFormModal";

const EVENT_SECTIONS = [
  { to: "overview", label: "Overview", icon: LayoutDashboard },
  { to: "guests", label: "Guests", icon: Users },
  { to: "rsvp", label: "RSVP", icon: Mail },
  { to: "seating", label: "Seating", icon: Armchair },
  { to: "checkin", label: "Check-in", icon: ClipboardCheck },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event } = useEvent(eventId);
  const deleteEvent = useDeleteEvent();
  const [showEdit, setShowEdit] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

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

  const inEvent = !!eventId && !!event;

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white px-4 py-6 sm:flex">
        <NavLink to="/events" className="flex items-center gap-2 px-2 text-brand-700">
          <PartyPopper className="h-6 w-6" />
          <span className="font-display text-lg font-semibold">EventFlow</span>
        </NavLink>

        <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto">
          {!inEvent && (
            <NavLink
              to="/events"
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                )
              }
            >
              <CalendarHeart className="h-4 w-4" />
              My Events
            </NavLink>
          )}

          {inEvent && (
            <>
              <NavLink
                to="/events"
                className="mb-3 flex items-center gap-1.5 px-2 text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                My Events
              </NavLink>

              <div className="mb-4 rounded-xl2 border border-slate-100 bg-brand-50/60 px-3 py-3">
                <Badge variant="brand">{EVENT_TYPE_LABELS[event.type] ?? event.type}</Badge>
                <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{event.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{formatDateShort(event.date)}</p>
                <div className="mt-3 flex gap-1.5">
                  <button
                    onClick={() => setShowEdit(true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    aria-label="Delete event"
                    className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-400 hover:border-danger-200 hover:bg-danger-50 hover:text-danger-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Event</p>
              {EVENT_SECTIONS.map((section) => (
                <NavLink
                  key={section.to}
                  to={`/events/${eventId}/${section.to}`}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                      isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                    )
                  }
                >
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-slate-100 pt-4">
          <p className="truncate px-2 text-sm font-medium text-slate-900">{user?.name}</p>
          <p className="truncate px-2 text-xs text-slate-500">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:hidden">
          {inEvent ? (
            <div className="flex min-w-0 items-center gap-2">
              <NavLink to="/events" aria-label="Back to My Events" className="shrink-0 text-slate-500">
                <ArrowLeft className="h-5 w-5" />
              </NavLink>
              <span className="truncate font-semibold text-slate-900">{event.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-brand-700">
              <PartyPopper className="h-5 w-5" />
              <span className="font-semibold">EventFlow</span>
            </div>
          )}
          <button onClick={handleLogout} className="shrink-0 text-sm font-medium text-slate-600">
            Log out
          </button>
        </header>

        {inEvent && (
          <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 sm:hidden">
            {EVENT_SECTIONS.map((section) => (
              <NavLink
                key={section.to}
                to={`/events/${eventId}/${section.to}`}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-500"
                  )
                }
              >
                <section.icon className="h-3.5 w-3.5" />
                {section.label}
              </NavLink>
            ))}
          </nav>
        )}

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>

      {event && <EventFormModal open={showEdit} onClose={() => setShowEdit(false)} event={event} />}
    </div>
  );
}
