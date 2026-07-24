import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Search, Undo2, UserCheck, X } from "lucide-react";
import { useEventDashboard } from "@/hooks/useEvents";
import { useCheckInGuest, useCheckOutGuest, useGuests } from "@/hooks/useGuests";
import { Card } from "@/components/ui/Card";
import { RadialProgress } from "@/components/ui/RadialProgress";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import type { Guest } from "@/types";

// Event-day check-in: search-then-confirm flow for a single door staffer,
// matching the check-in-tablet mockup's kiosk pattern (one active guest at
// a time with a large confirm target) rather than the previous scrollable
// grid-of-cards -- a genuine usability win at a busy door where fumbling
// through a grid on a phone costs time.
export function CheckInTab({ eventId }: { eventId: string }) {
  const [search, setSearch] = useState("");
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);
  const { data: dashboard } = useEventDashboard(eventId);
  const {
    data: guests,
    isLoading,
    isError,
    refetch,
  } = useGuests(eventId, { status: "CONFIRMED", search: search || undefined });
  const { data: allConfirmed } = useGuests(eventId, { status: "CONFIRMED" });
  const checkIn = useCheckInGuest(eventId);
  const checkOut = useCheckOutGuest(eventId);

  const stats = dashboard?.stats;
  const remaining = stats ? Math.max(stats.confirmed - stats.checkedIn, 0) : 0;

  const activeGuest = useMemo(
    () => guests?.find((g) => g.id === activeGuestId) ?? (search && guests?.length === 1 ? guests[0] : undefined),
    [guests, activeGuestId, search]
  );

  const recentCheckIns = useMemo(() => {
    if (!allConfirmed) return [];
    return allConfirmed
      .filter((g) => g.checkedIn && g.checkedInAt)
      .sort((a, b) => new Date(b.checkedInAt!).getTime() - new Date(a.checkedInAt!).getTime())
      .slice(0, 6);
  }, [allConfirmed]);

  async function handleCheckIn(guest: Guest) {
    try {
      await checkIn.mutateAsync(guest.id);
      toast.success(`${guest.firstName} ${guest.lastName} checked in`);
      setSearch("");
      setActiveGuestId(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleUndo(guest: Guest) {
    try {
      await checkOut.mutateAsync(guest.id);
      toast.success(`${guest.firstName} ${guest.lastName} un-checked-in`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col gap-5">
        <div className="flex items-center gap-4 rounded-2xl border-2 border-brand-600 bg-white px-6 py-4">
          <Search className="h-6 w-6 shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveGuestId(null);
            }}
            placeholder="Search confirmed guests by name..."
            className="flex-1 border-none bg-transparent text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setActiveGuestId(null);
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {isLoading && <Spinner />}
        {isError && <ErrorState title="We couldn't load confirmed guests" onRetry={() => refetch()} />}

        {!isLoading && !isError && search && guests && guests.length > 1 && !activeGuest && (
          <Card className="divide-y divide-slate-100 p-2">
            {guests.map((guest) => (
              <button
                key={guest.id}
                onClick={() => setActiveGuestId(guest.id)}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-50"
              >
                <Avatar firstName={guest.firstName} lastName={guest.lastName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">
                    {guest.firstName} {guest.lastName}
                  </p>
                  {guest.email && <p className="truncate text-xs text-slate-500">{guest.email}</p>}
                </div>
                {guest.checkedIn && <Badge variant="success">Checked in</Badge>}
              </button>
            ))}
          </Card>
        )}

        {!isLoading && !isError && search && guests?.length === 0 && (
          <EmptyState icon={<UserCheck className="h-8 w-8" />} title="No confirmed guests match" description="Try a different search." />
        )}

        {activeGuest && (
          <Card className="flex flex-col gap-6 p-7 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl font-bold text-brand-700">
                  {activeGuest.firstName[0]}
                  {activeGuest.lastName[0]}
                </span>
                <div>
                  <p className="text-xl font-bold text-slate-900">
                    {activeGuest.firstName} {activeGuest.lastName}
                  </p>
                  <p className="text-sm text-slate-500">{activeGuest.email || activeGuest.phone || "Confirmed guest"}</p>
                </div>
              </div>
              <Badge variant={activeGuest.checkedIn ? "success" : "neutral"}>
                {activeGuest.checkedIn ? "Checked In" : "Confirmed"}
              </Badge>
            </div>

            <div className="h-px w-full bg-slate-100" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">Table / Seat</p>
                <p className="mt-1 font-bold text-slate-900">
                  {activeGuest.seatAssignment
                    ? `${activeGuest.seatAssignment.table.name}${
                        activeGuest.seatAssignment.seat ? `, Seat ${activeGuest.seatAssignment.seat.seatNumber}` : ""
                      }`
                    : "Unassigned"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">Party Size</p>
                <p className="mt-1 font-bold text-slate-900">
                  {1 + activeGuest.additionalGuestsCount} Guest{activeGuest.additionalGuestsCount > 0 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">Dietary Note</p>
                <p className="mt-1 font-bold text-brand-700">{activeGuest.dietaryRequirements || activeGuest.mealPreference || "None"}</p>
              </div>
            </div>

            {activeGuest.checkedIn ? (
              <Button size="lg" variant="secondary" className="w-full py-5 text-base" onClick={() => handleUndo(activeGuest)} isLoading={checkOut.isPending}>
                <Undo2 className="h-5 w-5" />
                Undo Check-In
              </Button>
            ) : (
              <Button size="lg" className="w-full py-5 text-base font-bold tracking-wide" onClick={() => handleCheckIn(activeGuest)} isLoading={checkIn.isPending}>
                <Check className="h-5 w-5" />
                CONFIRM CHECK IN
              </Button>
            )}
          </Card>
        )}

        {!search && !activeGuest && (
          <EmptyState
            icon={<UserCheck className="h-8 w-8" />}
            title="Search for a guest to check them in"
            description="Start typing a confirmed guest's name above."
          />
        )}
      </div>

      <div className="flex w-full flex-col gap-5 lg:w-[380px]">
        <Card className="p-6">
          <h3 className="mb-5 text-base font-bold text-slate-900">Capacity Analytics</h3>
          <div className="flex items-center gap-5">
            <RadialProgress value={stats?.checkedIn ?? 0} max={stats?.confirmed ?? 0} size={72} strokeWidth={8} accent="brand" bare />
            <div>
              <p className="text-xl font-extrabold text-slate-900">{remaining} Left</p>
              <p className="text-xs text-slate-400">Remaining out of {stats?.confirmed ?? 0} total</p>
            </div>
          </div>
          <div className="my-5 h-px w-full bg-slate-100" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-600">Arrived</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{stats?.checkedIn ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-600">Not Arrived</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{remaining}</p>
            </div>
          </div>
        </Card>

        <Card className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-slate-900">Recent Check-ins</h3>
            <span className="text-xs font-semibold text-brand-600">Live Feed</span>
          </div>
          {recentCheckIns.length === 0 ? (
            <p className="text-sm text-slate-400">No check-ins yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {recentCheckIns.map((guest) => (
                <div key={guest.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {guest.firstName} {guest.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {guest.seatAssignment ? guest.seatAssignment.table.name : "No table"} &middot;{" "}
                      {1 + guest.additionalGuestsCount} guest{guest.additionalGuestsCount > 0 ? "s" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">{formatRelativeTime(guest.checkedInAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
