import { useState } from "react";
import { toast } from "sonner";
import { Armchair, Search, Star, Undo2, UserCheck } from "lucide-react";
import { useEventDashboard } from "@/hooks/useEvents";
import { useCheckInGuest, useCheckOutGuest, useGuests } from "@/hooks/useGuests";
import { StatCard } from "@/components/ui/Card";
import { RsvpStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { getApiErrorMessage } from "@/lib/api";
import type { Guest } from "@/types";

// Event-day check-in: a big-target, kiosk-friendly list of confirmed guests
// with a live headcount up top. Meant to be pulled up on a phone or tablet
// at the door.
export function CheckInTab({ eventId }: { eventId: string }) {
  const [search, setSearch] = useState("");
  const { data: dashboard } = useEventDashboard(eventId);
  const {
    data: guests,
    isLoading,
    isError,
    refetch,
  } = useGuests(eventId, {
    status: "CONFIRMED",
    search: search || undefined,
  });
  const checkIn = useCheckInGuest(eventId);
  const checkOut = useCheckOutGuest(eventId);

  const stats = dashboard?.stats;
  const remaining = stats ? Math.max(stats.confirmed - stats.checkedIn, 0) : undefined;

  async function handleToggle(guest: Guest) {
    try {
      if (guest.checkedIn) {
        await checkOut.mutateAsync(guest.id);
        toast.success(`${guest.firstName} ${guest.lastName} un-checked-in`);
      } else {
        await checkIn.mutateAsync(guest.id);
        toast.success(`${guest.firstName} ${guest.lastName} checked in`);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Confirmed" value={stats?.confirmed ?? "—"} />
        <StatCard label="Checked in" value={stats?.checkedIn ?? "—"} accent="green" />
        <StatCard label="Remaining" value={remaining ?? "—"} accent={remaining ? "amber" : "default"} />
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search confirmed guests..."
          className="h-11 pl-9 text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && <Spinner />}

      {isError && <ErrorState title="We couldn't load confirmed guests" onRetry={() => refetch()} />}

      {!isLoading && !isError && guests?.length === 0 && (
        <EmptyState
          icon={<UserCheck className="h-8 w-8" />}
          title="No confirmed guests match"
          description={search ? "Try a different search." : "No one has confirmed their RSVP yet."}
        />
      )}

      {!isLoading && !isError && guests && guests.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {guests.map((guest) => (
            <div
              key={guest.id}
              className={`rounded-xl2 border p-4 shadow-card ${
                guest.checkedIn ? "border-success-200 bg-success-50/60" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="truncate text-base font-semibold text-slate-900">
                  {guest.firstName} {guest.lastName}
                </span>
                {guest.isVip && <Star className="h-4 w-4 shrink-0 fill-warning-500 text-warning-500" />}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RsvpStatusBadge status={guest.rsvpStatus} />
                {guest.party && guest.party.length > 0 && (
                  <span className="text-xs text-slate-500">+ {guest.party.map((p) => p.fullName).join(", ")}</span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                <Armchair className="h-4 w-4 shrink-0 text-slate-400" />
                {guest.seatAssignment ? (
                  <span>
                    {guest.seatAssignment.table.name}
                    {guest.seatAssignment.seat ? ` · Seat ${guest.seatAssignment.seat.seatNumber}` : ""}
                  </span>
                ) : (
                  <span className="text-slate-400">No table assigned</span>
                )}
              </div>

              <Button
                size="lg"
                variant={guest.checkedIn ? "secondary" : "primary"}
                onClick={() => handleToggle(guest)}
                isLoading={checkIn.isPending || checkOut.isPending}
                className="mt-3.5 w-full"
              >
                {guest.checkedIn ? (
                  <>
                    <Undo2 className="h-4 w-4" />
                    Undo check-in
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Check in
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
