import { BarChart3, CalendarHeart, CheckCircle2, DollarSign, Store, Users } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { StatCard } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, refetch } = useAnalytics();

  if (isError) return <ErrorState title="We couldn't load analytics" onRetry={() => refetch()} />;
  if (isLoading || !data) return <Spinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-[32px] font-bold text-slate-950">Analytics</h1>
        <p className="mt-1 text-[15px] text-slate-500">A cross-event view of RSVPs, check-ins, and vendor spend.</p>
      </div>

      {data.totalEvents === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No events yet"
          description="Create your first event to start seeing analytics here."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Events" value={data.totalEvents} hint={`${data.upcomingEvents} upcoming`} icon={<CalendarHeart className="h-4 w-4" />} />
            <StatCard label="Total Guests" value={data.totalGuests} icon={<Users className="h-4 w-4" />} />
            <StatCard
              label="Confirmation Rate"
              value={pct(data.confirmationRate)}
              hint={`${data.confirmed} confirmed of ${data.totalGuests}`}
              accent="purple"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <StatCard
              label="Check-in Rate"
              value={pct(data.checkInRate)}
              hint={`${data.checkedIn} checked in`}
              accent="green"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <StatCard label="Vendors" value={data.totalVendors} hint={`${data.vendorsBooked} booked or confirmed`} icon={<Store className="h-4 w-4" />} />
            <StatCard
              label="Vendor Spend"
              value={`$${data.totalVendorSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <StatCard label="Response Rate" value={pct(data.responseRate)} hint="Confirmed, declined, or maybe" />
          </div>

          <div>
            <h2 className="mb-4 font-display text-xl font-bold text-slate-950">By Event</h2>
            <div className="overflow-hidden rounded-xl2 border border-slate-200/80 bg-white shadow-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Event</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Guests</th>
                    <th className="px-5 py-3">Confirmed</th>
                    <th className="px-5 py-3">Declined</th>
                    <th className="px-5 py-3">Pending</th>
                    <th className="px-5 py-3">Checked in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.byEvent.map((row) => (
                    <tr key={row.eventId} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 font-medium text-slate-900">{row.eventName}</td>
                      <td className="px-5 py-3.5 text-slate-600">{formatDate(row.date)}</td>
                      <td className="px-5 py-3.5 text-slate-600">{row.totalGuests}</td>
                      <td className="px-5 py-3.5 text-success-600">{row.confirmed}</td>
                      <td className="px-5 py-3.5 text-danger-600">{row.declined}</td>
                      <td className="px-5 py-3.5 text-warning-600">{row.pending}</td>
                      <td className="px-5 py-3.5 text-slate-600">{row.checkedIn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
