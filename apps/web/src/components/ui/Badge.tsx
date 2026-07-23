import { cn } from "@/lib/cn";
import type { RsvpStatus } from "@/types";

const statusStyles: Record<RsvpStatus, string> = {
  CONFIRMED: "bg-success-50 text-success-700 ring-success-600/20",
  DECLINED: "bg-danger-50 text-danger-700 ring-danger-600/20",
  PENDING: "bg-slate-100 text-slate-600 ring-slate-500/20",
  MAYBE: "bg-warning-50 text-warning-700 ring-warning-600/20",
};

export function RsvpStatusBadge({ status }: { status: RsvpStatus }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        statusStyles[status]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

export function Badge({
  children,
  className,
  variant = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "neutral" | "brand" | "success" | "warning" | "danger" | "info";
}) {
  const variants: Record<NonNullable<typeof variant>, string> = {
    neutral: "bg-slate-100 text-slate-700",
    brand: "bg-brand-50 text-brand-700",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-700",
    danger: "bg-danger-50 text-danger-700",
    info: "bg-info-50 text-info-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}

// Upcoming / Today / Past -- computed from an event's date, used on My
// Events cards so a planner can scan the list and immediately see what's
// imminent without reading every date.
export function EventStatusBadge({ date }: { date: string }) {
  const eventDate = new Date(date);
  const today = new Date();
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((eventDay.getTime() - todayDay.getTime()) / 86400000);

  if (diffDays === 0) return <Badge variant="warning">Today</Badge>;
  if (diffDays < 0) return <Badge variant="neutral">Past</Badge>;
  if (diffDays <= 7) return <Badge variant="brand">In {diffDays} day{diffDays === 1 ? "" : "s"}</Badge>;
  return <Badge variant="info">Upcoming</Badge>;
}
