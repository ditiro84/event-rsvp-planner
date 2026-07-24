import { useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Armchair,
  ClipboardCheck,
  LayoutDashboard,
  Mail,
  Menu,
  Pencil,
  Sparkles,
  Store,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useDeleteEvent, useEvent } from "@/hooks/useEvents";
import { Badge } from "@/components/ui/Badge";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";
import { getApiErrorMessage } from "@/lib/api";
import { EVENT_TYPE_LABELS, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/cn";
import { EventFormModal } from "@/pages/events/EventFormModal";

const EVENT_SECTIONS = [
  { to: "overview", label: "Overview", icon: LayoutDashboard },
  { to: "guests", label: "Guests", icon: Users },
  { to: "rsvp", label: "RSVP", icon: Mail },
  { to: "vendors", label: "Vendors", icon: Store },
  { to: "seating", label: "Seating", icon: Armchair },
  { to: "checkin", label: "Check-in", icon: ClipboardCheck },
];

const GLOBAL_SECTIONS = [
  { to: "/events", label: "My Events" },
  { to: "/analytics", label: "Analytics" },
];

// Top navigation bar, replacing the earlier left sidebar (per the approved
// Figma "DESKTOP SCREENS" mockups). Outside of an event, the primary nav is
// the workspace-level "My Events" / "Analytics" pair; inside an event, the
// same nav slot switches to that event's tabs -- this app's actual data
// model is per-event (guests/RSVP/seating/vendors/check-in all belong to
// one event), so those tabs can't honestly be global nav items the way the
// mockup shows them, only "My Events" and the cross-event "Analytics" view
// genuinely are.
export function DashboardLayout() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event } = useEvent(eventId);
  const deleteEvent = useDeleteEvent();
  const [showEdit, setShowEdit] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white">
        <div className="flex h-[72px] items-center justify-between px-4 sm:px-8 lg:px-12">
          <div className="flex h-full min-w-0 items-center gap-6 lg:gap-12">
            <NavLink to="/events" className="flex shrink-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <Sparkles className="h-4 w-4 text-white" />
              </span>
              <span className="font-display text-xl font-bold text-slate-950">EventFlow</span>
            </NavLink>

            <nav className="hidden h-full items-center gap-1 md:flex">
              {!inEvent &&
                GLOBAL_SECTIONS.map((section) => (
                  <NavLink
                    key={section.to}
                    to={section.to}
                    className={({ isActive }) =>
                      cn(
                        "flex h-full flex-col items-center justify-center gap-0 px-4 text-[15px] font-medium text-slate-600 hover:text-slate-900",
                        isActive && "font-semibold text-brand-600"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="flex flex-1 items-center">{section.label}</span>
                        <span className={cn("h-[3px] w-full rounded-t-[3px]", isActive ? "bg-brand-600" : "bg-transparent")} />
                      </>
                    )}
                  </NavLink>
                ))}

              {inEvent &&
                EVENT_SECTIONS.map((section) => (
                  <NavLink
                    key={section.to}
                    to={`/events/${eventId}/${section.to}`}
                    className={({ isActive }) =>
                      cn(
                        "flex h-full flex-col items-center justify-center gap-0 px-4 text-[15px] font-medium text-slate-600 hover:text-slate-900",
                        isActive && "font-semibold text-brand-600"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="flex flex-1 items-center gap-2">
                          <section.icon className="h-4 w-4" />
                          {section.label}
                        </span>
                        <span className={cn("h-[3px] w-full rounded-t-[3px]", isActive ? "bg-brand-600" : "bg-transparent")} />
                      </>
                    )}
                  </NavLink>
                ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <NotificationBell />
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <div className="hidden sm:block">
              <UserMenu />
            </div>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 md:hidden"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {inEvent && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 sm:px-8 lg:px-12">
            <div className="flex min-w-0 items-center gap-3">
              <NavLink to="/events" aria-label="Back to My Events" className="shrink-0 text-slate-400 hover:text-slate-600">
                <ArrowLeft className="h-4 w-4" />
              </NavLink>
              <Badge variant="brand">{EVENT_TYPE_LABELS[event.type] ?? event.type}</Badge>
              <p className="truncate text-sm font-semibold text-slate-900">{event.name}</p>
              <span className="hidden text-xs text-slate-400 sm:inline">{formatDateShort(event.date)}</span>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={handleDelete}
                aria-label="Delete event"
                className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-400 hover:border-danger-200 hover:bg-danger-50 hover:text-danger-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {mobileNavOpen && (
          <nav className="flex flex-col gap-1 border-t border-slate-100 bg-white px-4 py-2 md:hidden">
            {(!inEvent ? GLOBAL_SECTIONS : EVENT_SECTIONS.map((s) => ({ to: `/events/${eventId}/${s.to}`, label: s.label }))).map(
              (section) => (
                <NavLink
                  key={section.to}
                  to={section.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-2 text-sm font-medium",
                      isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
                    )
                  }
                >
                  {section.label}
                </NavLink>
              )
            )}
            <div className="mt-1 border-t border-slate-100 pt-2">
              <UserMenu />
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
        <Outlet />
      </main>

      {event && <EventFormModal open={showEdit} onClose={() => setShowEdit(false)} event={event} />}
    </div>
  );
}
