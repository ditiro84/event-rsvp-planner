import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  ClipboardList,
  CreditCard,
  Mail,
  Newspaper,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import {
  useAdminAuditLog,
  useAdminEmailEvents,
  useAdminEvents,
  useAdminPaymentEvents,
  useAdminUsers,
  useArchiveSubscriber,
  useDeleteSubscriber,
  useEditSubscriber,
  useRestoreSubscriber,
} from "@/hooks/useAdmin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { getTabTheme } from "@/lib/tabTheme";
import { getApiErrorMessage } from "@/lib/api";
import { EVENT_TYPE_LABELS, formatDate, formatMoney, formatRelativeTime } from "@/lib/format";
import type { ExportColumn } from "@/lib/exportData";
import type {
  AdminAuditLogEntry,
  AdminEventSummary,
  AdminUserSummary,
  CurrencyCode,
  EmailEventEntry,
  PaymentEventEntry,
  PaymentEventStatus,
} from "@/types";
import { ArticlesTab } from "./ArticlesTab";
import { ServicesTab } from "./ServicesTab";
import { PlatformAnalyticsTab } from "./PlatformAnalyticsTab";

type Tab = "subscribers" | "events" | "audit" | "payments" | "emails" | "analytics" | "articles" | "services";

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "subscribers", label: "Subscribers", icon: Users },
  { id: "events", label: "Events", icon: ShieldCheck },
  { id: "analytics", label: "Platform Analytics", icon: BarChart3 },
  { id: "audit", label: "Audit Log", icon: ClipboardList },
  { id: "payments", label: "Payment Logs", icon: CreditCard },
  { id: "emails", label: "Email Logs", icon: Mail },
  { id: "articles", label: "Articles", icon: Newspaper },
  { id: "services", label: "Services", icon: Sparkles },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("subscribers");
  const theme = getTabTheme("admin");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", theme.iconBg, theme.iconText)}>
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-[32px] font-bold text-slate-950">Admin</h1>
          <p className="mt-1 text-[15px] text-slate-500">
            Support tools -- view and assist any subscriber's event. Every change you make here is logged in the
            audit trail below.
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium",
              tab === t.id
                ? cn(theme.navActiveBorder, theme.navActiveText)
                : "border-transparent text-slate-500 hover:text-slate-800"
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
      {tab === "emails" && <EmailLogsTab />}
      {tab === "articles" && <ArticlesTab />}
      {tab === "services" && <ServicesTab />}
    </div>
  );
}

const subscriberColumns: ExportColumn<AdminUserSummary>[] = [
  { header: "Name", value: (u) => u.name },
  { header: "Email", value: (u) => u.email },
  { header: "Role", value: (u) => (u.role === "ADMIN" ? "Admin" : "Planner") },
  { header: "Status", value: (u) => (u.archivedAt ? "Archived" : "Active") },
  { header: "Events", value: (u) => u.eventCount },
  { header: "Joined", value: (u) => formatDate(u.createdAt) },
];

// --- Edit subscriber ---------------------------------------------------------

const editSubscriberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
});
type EditSubscriberFormValues = z.infer<typeof editSubscriberSchema>;

function EditSubscriberModal({
  open,
  onClose,
  subscriber,
}: {
  open: boolean;
  onClose: () => void;
  subscriber: AdminUserSummary | null;
}) {
  const editSubscriber = useEditSubscriber();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditSubscriberFormValues>({ resolver: zodResolver(editSubscriberSchema) });

  // Re-seed the form whenever a (different) subscriber is opened for
  // editing -- keyed on the id so this doesn't re-fire (and stomp on
  // in-progress edits) on every render while the modal is open.
  useEffect(() => {
    if (subscriber && open) reset({ name: subscriber.name, email: subscriber.email });
    // Deliberately keyed on subscriber?.id (not the whole subscriber object)
    // -- a background refetch of the subscriber list hands this component a
    // new object reference with the same id, and re-seeding on that would
    // silently wipe whatever the admin is mid-typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriber?.id, open, reset]);

  if (!subscriber) return null;

  async function onSubmit(values: EditSubscriberFormValues) {
    if (!subscriber) return;
    try {
      await editSubscriber.mutateAsync({ userId: subscriber.id, input: values });
      toast.success("Subscriber updated");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit subscriber" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Name" htmlFor="subscriber-name" error={errors.name?.message}>
          <Input id="subscriber-name" {...register("name")} error={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="subscriber-email" error={errors.email?.message}>
          <Input id="subscriber-email" type="email" {...register("email")} error={!!errors.email} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={editSubscriber.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// --- Archive / Restore / Delete confirmation ---------------------------------

type SubscriberActionKind = "archive" | "restore" | "delete";

const ACTION_COPY: Record<SubscriberActionKind, { title: string; body: (email: string) => string; confirmLabel: string }> = {
  archive: {
    title: "Archive subscriber",
    body: (email) =>
      `${email} will be locked out and their events' RSVP and ticket pages will stop accepting new guests or purchases. Nothing is deleted -- everything (including this) can be restored later.`,
    confirmLabel: "Archive subscriber",
  },
  restore: {
    title: "Restore subscriber",
    body: (email) =>
      `${email} will be able to log in again, and their events' RSVP/ticket pages will reopen to new activity (unless a planner had already closed them beforehand).`,
    confirmLabel: "Restore subscriber",
  },
  delete: {
    title: "Permanently delete subscriber",
    body: (email) =>
      `This permanently deletes ${email} and every event, guest, RSVP, order, and other record tied to their account. This cannot be undone. Type the subscriber's email to confirm.`,
    confirmLabel: "Delete permanently",
  },
};

function SubscriberActionModal({
  open,
  onClose,
  kind,
  subscriber,
}: {
  open: boolean;
  onClose: () => void;
  kind: SubscriberActionKind | null;
  subscriber: AdminUserSummary | null;
}) {
  const [confirmText, setConfirmText] = useState("");
  const archiveSubscriber = useArchiveSubscriber();
  const restoreSubscriber = useRestoreSubscriber();
  const deleteSubscriber = useDeleteSubscriber();

  if (!kind || !subscriber) return null;
  const copy = ACTION_COPY[kind];
  const isDelete = kind === "delete";
  const mutation = kind === "archive" ? archiveSubscriber : kind === "restore" ? restoreSubscriber : deleteSubscriber;

  function handleClose() {
    setConfirmText("");
    onClose();
  }

  async function handleConfirm() {
    if (!subscriber) return;
    try {
      await mutation.mutateAsync(subscriber.id);
      toast.success(
        kind === "archive" ? "Subscriber archived" : kind === "restore" ? "Subscriber restored" : "Subscriber deleted"
      );
      handleClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  const canConfirm = !isDelete || confirmText.trim().toLowerCase() === subscriber.email.toLowerCase();

  return (
    <Modal open={open} onClose={handleClose} title={copy.title} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{copy.body(subscriber.email)}</p>
        {isDelete && (
          <Field label={`Type "${subscriber.email}" to confirm`} htmlFor="confirm-email">
            <Input
              id="confirm-email"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={subscriber.email}
              autoComplete="off"
            />
          </Field>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={isDelete ? "danger" : "primary"}
            isLoading={mutation.isPending}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {copy.confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SubscribersTab() {
  const { data, isLoading, isError, refetch } = useAdminUsers();
  const [editing, setEditing] = useState<AdminUserSummary | null>(null);
  const [action, setAction] = useState<{ kind: SubscriberActionKind; subscriber: AdminUserSummary } | null>(null);

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
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((u) => (
              <tr key={u.id} className={u.archivedAt ? "bg-slate-50/50" : undefined}>
                <td className="px-5 py-3.5 font-semibold text-slate-900">
                  {u.name}
                  {u.archivedAt && (
                    <span className="ml-2 align-middle">
                      <Badge variant="neutral">Archived</Badge>
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-slate-600">{u.email}</td>
                <td className="px-5 py-3.5">
                  <Badge variant={u.role === "ADMIN" ? "brand" : "neutral"}>{u.role === "ADMIN" ? "Admin" : "Planner"}</Badge>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{u.eventCount}</td>
                <td className="px-5 py-3.5 text-slate-500">{formatDate(u.createdAt)}</td>
                <td className="px-5 py-3.5">
                  {u.role === "ADMIN" ? (
                    <p className="text-right text-xs text-slate-400">Admin account</p>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => setEditing(u)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {u.archivedAt ? (
                        <button
                          type="button"
                          title="Restore"
                          onClick={() => setAction({ kind: "restore", subscriber: u })}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-success-50 hover:text-success-600"
                        >
                          <ArchiveRestore className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Archive"
                          onClick={() => setAction({ kind: "archive", subscriber: u })}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-warning-50 hover:text-warning-600"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        title={u.canHardDelete ? "Delete permanently" : "Can't permanently delete -- this subscriber has paid orders on record. Archive instead."}
                        disabled={!u.canHardDelete}
                        onClick={() => setAction({ kind: "delete", subscriber: u })}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-danger-50 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <EditSubscriberModal open={!!editing} onClose={() => setEditing(null)} subscriber={editing} />
      <SubscriberActionModal
        open={!!action}
        onClose={() => setAction(null)}
        kind={action?.kind ?? null}
        subscriber={action?.subscriber ?? null}
      />
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

const EMAIL_STATUS_VARIANT: Record<"SENT" | "FAILED", "success" | "danger"> = {
  SENT: "success",
  FAILED: "danger",
};

const emailLogColumns: ExportColumn<EmailEventEntry>[] = [
  { header: "Status", value: (e) => e.status },
  { header: "Event", value: (e) => e.eventName ?? "—" },
  { header: "Recipient", value: (e) => e.recipientName ?? "—" },
  { header: "Recipient email", value: (e) => e.recipientEmail },
  { header: "Subject", value: (e) => e.subject },
  { header: "Error", value: (e) => e.errorMessage ?? "—" },
  { header: "When", value: (e) => formatDate(e.createdAt) },
];

// Every invite/reminder email attempt across all subscribers -- invite sends
// and bulk reminder sends share the same backend code path, so this one log
// covers both. Admin-only (not shown to planners) since it's a support/ops
// diagnostic tool: it's what confirms a failure is a Resend domain
// verification issue, a bad address, etc. rather than the app being broken.
function EmailLogsTab() {
  const { data, isLoading, isError, refetch } = useAdminEmailEvents();

  if (isError) return <ErrorState title="We couldn't load email logs" onRetry={() => refetch()} />;
  if (isLoading || !data) return <Spinner />;
  if (data.length === 0) {
    return (
      <EmptyState
        title="No email activity yet"
        description="Every invite and RSVP reminder email attempt -- successful or not -- will show up here."
      />
    );
  }

  const failedCount = data.filter((e) => e.status === "FAILED").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {failedCount > 0 ? <Badge variant="danger">{failedCount} failed</Badge> : <span />}
        <ExportMenu data={data} columns={emailLogColumns} filename="email-logs" title="Email Logs" />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Event</th>
              <th className="px-5 py-3">Recipient</th>
              <th className="px-5 py-3">Subject</th>
              <th className="px-5 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((e) => (
              <tr key={e.id}>
                <td className="px-5 py-3.5">
                  <Badge variant={EMAIL_STATUS_VARIANT[e.status]}>{e.status === "SENT" ? "Sent" : "Failed"}</Badge>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{e.eventName ?? "—"}</td>
                <td className="px-5 py-3.5 text-slate-600">
                  {e.recipientName || "—"}
                  <span className="block text-xs text-slate-400">{e.recipientEmail}</span>
                </td>
                <td className="px-5 py-3.5 text-slate-500">
                  {e.subject}
                  {e.status === "FAILED" && e.errorMessage && (
                    <span className="block text-xs text-danger-600">{e.errorMessage}</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-slate-500">{formatRelativeTime(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
