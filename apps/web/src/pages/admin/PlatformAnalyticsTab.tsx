import { CalendarHeart, CheckCircle2, ShoppingCart, Users } from "lucide-react";
import { StatCard, Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/EmptyState";
import { TrendChart } from "@/components/ui/TrendChart";
import { formatMoney } from "@/lib/format";
import { usePlatformAnalytics } from "@/hooks/useAdmin";
import type { CurrencyCode } from "@/types";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function PlatformAnalyticsTab() {
  const { data, isLoading, isError, refetch } = usePlatformAnalytics();

  if (isError) return <ErrorState title="We couldn't load platform analytics" onRetry={() => refetch()} />;
  if (isLoading || !data) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Subscribers" value={data.totalSubscribers} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Total Events" value={data.totalEvents} icon={<CalendarHeart className="h-4 w-4" />} />
        <StatCard
          label="RSVP Confirmation Rate"
          value={pct(data.confirmationRate)}
          hint={`${data.rsvpConfirmed} of ${data.totalGuests} guests`}
          accent="purple"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard label="Orders Paid" value={data.totalOrdersPaid} accent="green" icon={<ShoppingCart className="h-4 w-4" />} />
      </div>

      <Card className="p-5">
        <h3 className="font-display text-lg font-semibold text-slate-950">Signups &amp; events created</h3>
        <p className="mt-1 text-sm text-slate-500">Last 30 days, across all subscribers.</p>
        <div className="mt-4">
          <TrendChart
            dates={data.trend.map((t) => t.date)}
            series={[
              { label: "Signups", colorClass: "stroke-brand-600", values: data.trend.map((t) => t.signups) },
              { label: "Events created", colorClass: "stroke-success-500", values: data.trend.map((t) => t.events) },
            ]}
          />
        </div>
      </Card>

      <div>
        <h3 className="mb-3 font-display text-lg font-semibold text-slate-950">Revenue by currency &amp; provider</h3>
        {data.revenueByCurrencyAndProvider.length === 0 ? (
          <Card className="p-5 text-sm text-slate-500">No paid orders yet.</Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Currency</th>
                  <th className="px-5 py-3">Provider</th>
                  <th className="px-5 py-3">Orders</th>
                  <th className="px-5 py-3 text-right">Transaction volume</th>
                  <th className="px-5 py-3 text-right">Platform fee earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.revenueByCurrencyAndProvider.map((row, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3.5 font-medium text-slate-900">{row.currency}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.provider ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.orderCount}</td>
                    <td className="px-5 py-3.5 text-right text-slate-900">
                      {formatMoney(row.totalRevenue, row.currency as CurrencyCode)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                      {formatMoney(row.platformFee, row.currency as CurrencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
