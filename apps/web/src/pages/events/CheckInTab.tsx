import { useState } from "react";
import { toast } from "sonner";
import { Search, Star, Undo2, UserCheck } from "lucide-react";
import { useEventDashboard } from "@/hooks/useEvents";
import { useCheckInGuest, useCheckOutGuest, useGuests } from "@/hooks/useGuests";
import { StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { getApiErrorMessage } from "@/lib/api";
import type { Guest } from "@/types";

// Event-day check-in: a big-target, kiosk-friendly list of confirmed guests
// with a live headcount up top. Meant to be pulled up on a phone or tablet
// at the door.
export function CheckInTab({ eventId }: { eventId: string }) {
  const [search, setSearch] = useState("");
  const { data: dashboard } = useEventDashboard(eventId);
  const { data: guests, isLoading } = useGuests(eventId, {
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
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && <Spinner />}

      {!isLoading && guests?.length === 0 && (
        <EmptyState
          icon={<UserCheck className="h-10 w-10" />}
          title="No confirmed guests match"
          description={search ? "Try a different search." : "No one has confirmed their RSVP yet."}
        />
      )}

      {!isLoading && guests && guests.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {guests.map((guest) => (
            <div
              key={guest.id}
              className={`flex items-center justify-between gap-3 rounded-xl border p-4 shadow-sm ${
                guest.checkedIn ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-medium text-slate-900">
                    {guest.firstName} {guest.lastName}
                  </span>
                  {guest.isVip && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                </div>
                {guest.party && guest.party.length > 0 && (
                  <p className="truncate text-xs text-slate-500">
                    + {guest.party.map((p) => p.fullName).join(", ")}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant={guest.checkedIn ? "secondary" : "primary"}
                onClick={() => handleToggle(guest)}
                isLoading={checkIn.isPending || checkOut.isPending}
                className="shrink-0"
              >
                {guest.checkedIn ? (
                  <>
                    <Undo2 className="h-4 w-4" />
                    Undo
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
