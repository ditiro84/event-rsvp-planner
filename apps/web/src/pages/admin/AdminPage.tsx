import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, ClipboardList, CreditCard, Newspaper, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useAdminAuditLog, useAdminEvents, useAdminPaymentEvents, useAdminUsers } from "@/hooks/useAdmin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { cn } from "@/lib/cn";
import { EVENT_TYPE_LABELS, formatDate, formatMoney, formatRelativeTime } from "@/lib/format";
import type { ExportColumn } from "@/lib/exportData";
import type {
  AdminAuditLogEntry,
  AdminEventSummary,
  AdminUserSummary,
  CurrencyCode,
  PaymentEventEntry,
  PaymentEventStatus,
} from "@/types";
import { ArticlesTab } from "./ArticlesTab";
import { ServicesTab } from "./ServicesTab";
import { PlatformAnalyticsTab } from "./PlatformAnalyticsTab";

type Tab = "subscribers" | "events" | "audit" | "payments" | "analytics" | "articles" | "services";

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "subscribers", label: "Subscribers", icon: Users },
  { id: "events", label: "Events", icon: ShieldCheck },
  { id: "analytics", label: "Platform Analytics", icon: BarChart3 },
  { id: "audit", label: "Audit Log", icon: ClipboardList },
  { id: "payments", label: "Payment Logs", icon: CreditCard },
  { id: "articles", label: "Articles", icon: Newspaper },
  { id: "services", label: "Services", icon: Sparkles },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("subscribers");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[32px] font-bold text-slate-950">Admin</h1>
        <p className="mt-1 text-[15px] text-slate-500">
          Support tools -- view and assist any subscriber's event. Every change you make here is logged in the audit
          trail below.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium",
              tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "subscribers" && <SubscribersTab />}
      {tab === "events" && <EventsTab />}
      {tab === "analytics" && <PlatformAnalyticsTab />}
      {tab === "audit" && <AuditLogTab />}
      {tab === "payments" && <PaymentLogsTab />}
      {tab === "articles" && <ArticlesTab />}
      {tab === "services" && <ServicesTab />}
    </div>
  );
}

const subscriberColumns: ExportColumn<AdminUserSummary>[] = [
  { header: "Name", value: (u) => u.name },
  { header: "Email", value: (u) => u.email },
  { header: "Role", value: (u) => (u.role === "ADMIN" ? "Admin" : "Planner") },
  { header: "Events", value: (u) => u.eventCount },
  { header: "Joined", value: (u) => formatDate(u.createdAt) },
];

function SubscribersTab() {
  const { data, isLoading, isError, refetch } = useAdminUsers();

  if (isError) return <ErrorState title="We couldn't load subscribers" onRetry={() => refetch()} />;
  if (isLoading || !data) return <Spinner />;
  if (data.length === 0) return <EmptyState title="No subscribers yet" description="Accounts will show up here once people register." />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportMenu data={data} columns={subscriberColumns} filename="subscribers" title="Subscribers" />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Events</th>
              <th className="px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-3.5 font-semibold text-slate-900">{u.name}</td>
                <td className="px-5 py-3.5 text-slate-600">{u.email}</td>
                <td className="px-5 py-3.5">
                  <Badge variant={u.role === "ADMIN" ? "brand" : "neutral"}>{u.role === "ADMIN" ? "Admin" : "Planner"}</Badge>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{u.eventCount}</td>
                <td className="px-5 py-3.5 text-slate-500">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const eventColumns: ExportColumn<AdminEventSummary>[] = [
  { header: "Event", value: (e) => e.name },
  { header: "Type", value: (e) => EVENT_TYPE_LABELS[e.type] ?? e.type },
  { header: "Owner name", value: (e) => e.owner.name },
  { header: "Owner email", value: (e) => e.owner.email },
  { header: "Date", value: (e) => formatDate(e.date) },
  { header: "Guests", value: (e) => e.guestCount },
  { header: "Orders", value: (e) => e.orderCount },
];

function EventsTab() {
  const { data, isLoading, isError, refetch } = useAdminEvents();
  const navigate = useNavigate();

  if (isError) return <ErrorState title="We couldn't load events" onRetry={() => refetch()} />;
  if (isLoading || !data) return <Spinner />;
  if (data.length === 0) return <EmptyState title="No events yet" description="Subscriber events will show up here." />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportMenu data={data} columns={eventColumns} filename="events" title="Events" />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-3">Event</th>
              <th className="px-5 py-3">Owner</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Guests</th>
              <th className="px-5 py-3">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((e) => (
              <tr
                key={e.id}
                onClick={() => navigate(`/events/${e.id}/overview`)}
                className="cursor-pointer hover:bg-slate-50/60"
              >
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-slate-900">{e.name}</p>
                  <p className="text-xs text-slate-400">{EVENT_TYPE_LABELS[e.type] ?? e.type}</p>
                </td>
                <td className="px-5 py-3.5 text-slate-600">
                  <p>{e.owner.name}</p>
                  <p className="text-xs text-slate-400">{e.owner.email}</p>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{formatDate(e.date)}</td>
                <td className="px-5 py-3.5 text-slate-600">{e.guestCount}</td>
                <td className="px-5 py-3.5 text-slate-600">{e.orderCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const auditLogColumns: ExportColumn<AdminAuditLogEntry>[] = [
  { header: "Admin", value: (e) => e.adminEmail },
  { header: "Action", value: (e) => e.summary },
  { header: "Event", value: (e) => e.eventName ?? "—" },
  { header: "When", value: (e) => formatDate(e.createdAt) },
];

function AuditLogTab() {
  const { data, isLoading, isError, refetch } = useAdminAuditLog();

  if (isError) return <ErrorState title="We couldn't load the audit log" onRetry={() => refetch()} />;
  if (isLoading || !data) return <Spinner />;
  if (data.length === 0) {
    return (
      <EmptyState
        title="No admin actions yet"
        description="Any time an admin edits a subscriber's event, it'll be recorded here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportMenu data={data} columns={auditLogColumns} filename="audit-log" title="Audit Log" />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-3">Admin</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Event</th>
              <th className="px-5 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((entry) => (
              <tr key={entry.id}>
                <td className="px-5 py-3.5 text-slate-600">{entry.adminEmail}</td>
                <td className="px-5 py-3.5 font-medium text-slate-900">{entry.summary}</td>
                <td className="px-5 py-3.5 text-slate-600">{entry.eventName ?? "—"}</td>
                <td className="px-5 py-3.5 text-slate-500">{formatRelativeTime(entry.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const PAYMENT_STATUS_VARIANT: Record<PaymentEventStatus, "success" | "danger" | "warning" | "neutral"> = {
  SUCCESS: "success",
  FAILED: "danger",
  EXPIRED: "warning",
  INFO: "neutral",
};

const paymentLogColumns: ExportColumn<PaymentEventEntry>[] = [
  { header: "Status", value: (p) => p.status },
  { header: "Event", value: (p) => p.eventName ?? "—" },
  { header: "Guest", value: (p) => p.guestName ?? "—" },
  { header: "Guest email", value: (p) => p.guestEmail ?? "—" },
  { header: "Provider", value: (p) => p.provider ?? "—" },
  { header: "Type", value: (p) => p.type },
  { header: "Amount", value: (p) => (p.amount !== null && p.currency ? formatMoney(p.amount, p.currency as CurrencyCode) : "—") },
  { header: "Message", value: (p) => p.message ?? "—" },
  { header: "When", value: (p) => formatDate(p.createdAt) },
];

function PaymentLogsTab() {
  const { data, isLoading, isError, refetch } = useAdminPaymentEvents();

  if (isError) return <ErrorState title="We couldn't load payment logs" onRetry={() => refetch()} />;
  if (isLoading || !data) return <Spinner />;
  if (data.length === 0) {
    return (
      <EmptyState
        title="No payment activity yet"
        description="Every Stripe, Paystack, and PayPal payment attempt -- successful or not -- will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportMenu data={data} columns={paymentLogColumns} filename="payment-logs" title="Payment Logs" />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Event</th>
              <th className="px-5 py-3">Guest</th>
              <th className="px-5 py-3">Provider</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3.5">
                  <Badge variant={PAYMENT_STATUS_VARIANT[p.status]}>{p.status}</Badge>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{p.eventName ?? "—"}</td>
                <td className="px-5 py-3.5 text-slate-600">
                  {p.guestName ?? "—"}
                  {p.guestEmail && <span className="block text-xs text-slate-400">{p.guestEmail}</span>}
                </td>
                <td className="px-5 py-3.5 text-slate-600">{p.provider ?? "—"}</td>
                <td className="px-5 py-3.5 text-slate-500">
                  {p.type}
                  {p.message && <span className="block text-xs text-danger-600">{p.message}</span>}
                </td>
                <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                  {p.amount !== null && p.currency ? formatMoney(p.amount, p.currency as CurrencyCode) : "—"}
                </td>
                <td className="px-5 py-3.5 text-slate-500">{formatRelativeTime(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
