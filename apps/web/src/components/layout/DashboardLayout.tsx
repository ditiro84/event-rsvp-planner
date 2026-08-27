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
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Ticket,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useDeleteEvent, useEvent } from "@/hooks/useEvents";
import { useAuth } from "@/lib/AuthContext";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";
import { getApiErrorMessage } from "@/lib/api";
import { EVENT_TYPE_LABELS, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/cn";
import { EventFormModal } from "@/pages/events/EventFormModal";

interface EventSection {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  hint: string;
  ownerOnly?: boolean;
}

const EVENT_SECTIONS: EventSection[] = [
  { to: "overview", label: "Overview", icon: LayoutDashboard, hint: "Readiness at a glance and quick links to every section" },
  { to: "guests", label: "Guests", icon: Users, hint: "Manage your private guest list and import from a CSV" },
  { to: "rsvp", label: "RSVP", icon: Mail, hint: "Send invites and track confirmed, pending, and declined replies" },
  { to: "vendors", label: "Vendors", icon: Store, hint: "Track caterers, venues, and every other vendor for this event" },
  { to: "merchandise", label: "Merchandise", icon: ShoppingBag, hint: "Sell branded merch straight from your event page" },
  { to: "tickets", label: "Tickets", icon: Ticket, hint: "Set up paid ticket types and publish a public event page" },
  { to: "seating", label: "Seating", icon: Armchair, hint: "Drag guests onto tables with the visual seating planner" },
  { to: "checkin", label: "Check-in", icon: ClipboardCheck, hint: "Scan guests and tickets in at the door" },
  // Owner-only -- filtered out below for staff collaborators, since they
  // can't manage other staff or check-in passes (see TeamTab.tsx).
  { to: "team", label: "Team", icon: UserCog, hint: "Invite staff collaborators and manage door check-in passes", ownerOnly: true },
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
  const { user } = useAuth();
  const deleteEvent = useDeleteEvent();
  const [showEdit, setShowEdit] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const globalSections =
    user?.role === "ADMIN" ? [...GLOBAL_SECTIONS, { to: "/admin", label: "Admin" }] : GLOBAL_SECTIONS;
  // True when a staff collaborator (not the owner, not an admin) is viewing
  // this event -- see EventCollaborator in schema.prisma. Distinct from
  // viewingAsAdmin below: the event's own isCollaborator flag is computed
  // server-side from real EventCollaborator membership, not just "isn't the
  // owner" (see isUserEventCollaborator in events.service.ts).
  const viewingAsCollaborator = !!event && event.isCollaborator;
  // True when an admin has drilled into a subscriber's event they don't own
  // (support mode) -- see getOwnedEvent's admin bypass in events.service.ts.
  // Deleting an event is on the admin blocklist server-side regardless, but
  // hiding the button here avoids a confusing failed-request toast.
  const viewingAsAdmin = !!event && !!user && event.userId !== user.id && !viewingAsCollaborator;
  // The Team tab (managing other staff and check-in passes) is owner-only --
  // a collaborator can't reach its endpoints (see collaborators.service.ts),
  // so don't show a nav item that would just 404.
  const eventSections = viewingAsCollaborator ? EVENT_SECTIONS.filter((s) => !s.ownerOnly) : EVENT_SECTIONS;

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
              <span className="font-display text-xl font-bold text-slate-950">Gadaova</span>
            </NavLink>

            <nav className="hidden h-full items-center gap-1 md:flex">
              {!inEvent &&
                globalSections.map((section) => (
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
                eventSections.map((section) => (
                  <Tooltip key={section.to} label={section.hint}>
                    <NavLink
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
                  </Tooltip>
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
              {viewingAsAdmin && (
                <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Support view -- editing as admin
                </span>
              )}
              {viewingAsCollaborator && (
                <span className="flex items-center gap-1 rounded-full bg-coral-50 px-2.5 py-1 text-xs font-semibold text-coral-700">
                  <UserCog className="h-3.5 w-3.5" />
                  Staff access
                </span>
              )}
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              {/* Deleting an event is owner-only, no admin bypass and no
                  collaborator access either (see getOwnedEventStrict) --
                  hidden here rather than shown and failing with a confusing
                  error. */}
              {!viewingAsAdmin && !viewingAsCollaborator && (
                <button
                  onClick={handleDelete}
                  aria-label="Delete event"
                  className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-400 hover:border-danger-200 hover:bg-danger-50 hover:text-danger-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {mobileNavOpen && (
          <nav className="flex flex-col gap-1 border-t border-slate-100 bg-white px-4 py-2 md:hidden">
            {(!inEvent ? globalSections : eventSections.map((s) => ({ to: `/events/${eventId}/${s.to}`, label: s.label }))).map(
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
