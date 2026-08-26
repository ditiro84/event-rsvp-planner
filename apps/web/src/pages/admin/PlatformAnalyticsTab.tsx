import { useState } from "react";
import { CalendarHeart, CheckCircle2, ShoppingCart, Users } from "lucide-react";
import { StatCard, Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/EmptyState";
import { TrendChart } from "@/components/ui/TrendChart";
import { CategoryChart } from "@/components/ui/CategoryChart";
import { ChartTypeToggle, type ChartType } from "@/components/ui/ChartTypeToggle";
import { ExportMenu } from "@/components/ui/ExportMenu";
import type { ExportColumn } from "@/lib/exportData";
import { formatMoney } from "@/lib/format";
import { usePlatformAnalytics } from "@/hooks/useAdmin";
import type { CurrencyCode, PlatformAnalytics } from "@/types";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

type RevenueRow = PlatformAnalytics["revenueByCurrencyAndProvider"][number];

const revenueColumns: ExportColumn<RevenueRow>[] = [
  { header: "Currency", value: (r) => r.currency },
  { header: "Provider", value: (r) => r.provider ?? "—" },
  { header: "Orders", value: (r) => r.orderCount },
  { header: "Transaction volume", value: (r) => r.totalRevenue },
  { header: "Platform fee earned", value: (r) => r.platformFee },
];

type TrendRow = PlatformAnalytics["trend"][number];

const trendColumns: ExportColumn<TrendRow>[] = [
  { header: "Date", value: (r) => r.date },
  { header: "Signups", value: (r) => r.signups },
  { header: "Events created", value: (r) => r.events },
];

export function PlatformAnalyticsTab() {
  const { data, isLoading, isError, refetch } = usePlatformAnalytics();
  const [trendChartType, setTrendChartType] = useState<ChartType>("line");
  const [revenueChartType, setRevenueChartType] = useState<ChartType>("pie");

  if (isError) return <ErrorState title="We couldn't load platform analytics" onRetry={() => refetch()} />;
  if (isLoading || !data) return <Spinner />;

  const revenueCategories = data.revenueByCurrencyAndProvider.map((r) => ({
    label: `${r.currency} · ${r.provider ?? "Unknown"}`,
    value: r.orderCount,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Subscribers" value={data.totalSubscribers} accent="coral" icon={<Users className="h-4 w-4" />} />
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-950">Signups &amp; events created</h3>
            <p className="mt-1 text-sm text-slate-500">Last 30 days, across all subscribers.</p>
          </div>
          <div className="flex items-center gap-2">
            <ChartTypeToggle value={trendChartType} onChange={setTrendChartType} options={["line", "bar"]} />
            <ExportMenu
              data={data.trend}
              columns={trendColumns}
              filename="platform-analytics-trend"
              title="Signups & events created (last 30 days)"
            />
          </div>
        </div>
        <div className="mt-4">
          <TrendChart
            chartType={trendChartType === "pie" ? "line" : trendChartType}
            dates={data.trend.map((t) => t.date)}
            series={[
              { label: "Signups", colorClass: "stroke-brand-600", values: data.trend.map((t) => t.signups) },
              { label: "Events created", colorClass: "stroke-success-500", values: data.trend.map((t) => t.events) },
            ]}
          />
        </div>
      </Card>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-slate-950">Revenue by currency &amp; provider</h3>
          {data.revenueByCurrencyAndProvider.length > 0 && (
            <div className="flex items-center gap-2">
              <ChartTypeToggle value={revenueChartType} onChange={setRevenueChartType} options={["pie", "bar", "line"]} />
              <ExportMenu
                data={data.revenueByCurrencyAndProvider}
                columns={revenueColumns}
                filename="platform-analytics-revenue"
                title="Revenue by currency & provider"
              />
            </div>
          )}
        </div>
        {data.revenueByCurrencyAndProvider.length === 0 ? (
          <Card className="p-5 text-sm text-slate-500">No paid orders yet.</Card>
        ) : (
          <div className="space-y-4">
            <Card className="p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                Orders by currency &amp; provider -- amounts aren't blended across currencies, see the table below for
                actual revenue figures.
              </p>
              <CategoryChart data={revenueCategories} chartType={revenueChartType} totalLabel="Orders" />
            </Card>
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
          </div>
        )}
      </div>
    </div>
  );
}
