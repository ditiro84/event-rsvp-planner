import { useEventDashboard } from "@/hooks/useEvents";
import { StatCard } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export function OverviewTab({ eventId }: { eventId: string }) {
  const { data, isLoading } = useEventDashboard(eventId);

  if (isLoading || !data) return <Spinner />;

  const { stats } = data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">RSVP Summary</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total invited" value={stats.totalGuests} />
          <StatCard label="Confirmed" value={stats.confirmed} accent="green" />
          <StatCard label="Declined" value={stats.declined} accent="red" />
          <StatCard label="Pending" value={stats.pending} accent="amber" />
          <StatCard label="Maybe" value={stats.maybe} accent="amber" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Seating &amp; Attendance</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Expected attendees" value={stats.totalExpectedAttendees} />
          <StatCard label="Tables created" value={stats.totalTables} />
          <StatCard label="Assigned guests" value={stats.assignedGuests} accent="green" />
          <StatCard
            label="Unassigned confirmed"
            value={stats.unassignedConfirmedGuests}
            accent={stats.unassignedConfirmedGuests > 0 ? "amber" : "default"}
            hint={
              stats.unassignedConfirmedGuests > 0
                ? `${stats.unassignedConfirmedGuests} confirmed guest(s) not yet assigned to a table`
                : undefined
            }
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Dietary &amp; Check-in</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Vegetarian" value={stats.vegetarian} />
          <StatCard label="Vegan" value={stats.vegan} />
          <StatCard label="Dietary requirements" value={stats.withDietaryRequirements} />
          <StatCard label="Accessibility needs" value={stats.withAccessibilityRequirements} />
          <StatCard label="Checked in" value={stats.checkedIn} accent="green" />
        </div>
      </div>
    </div>
  );
}
