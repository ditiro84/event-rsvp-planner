import { cn } from "@/lib/cn";
import type { RsvpStatus } from "@/types";

// Matches the Figma design system's "Status Badges" component: a tinted
// background, solid border in the semantic color, and darker-weight text
// for contrast (rather than the previous ring-based treatment). Note MAYBE
// maps to a neutral slate treatment per the Figma spec -- Pending is the
// one that owns the warning/amber color, not Maybe.
const statusStyles: Record<RsvpStatus, string> = {
  CONFIRMED: "bg-success-50 text-success-800 border border-success-500",
  DECLINED: "bg-danger-50 text-danger-800 border border-danger-500",
  PENDING: "bg-warning-50 text-warning-800 border border-warning-500",
  MAYBE: "bg-slate-50 text-slate-700 border border-slate-500",
};

export function RsvpStatusBadge({ status }: { status: RsvpStatus }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        statusStyles[status]
      )}
    >
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
  variant?: "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "unassigned";
}) {
  const variants: Record<NonNullable<typeof variant>, string> = {
    neutral: "bg-slate-100 text-slate-700",
    brand: "bg-brand-50 text-brand-700",
    success: "bg-success-50 text-success-800 border border-success-500",
    warning: "bg-warning-50 text-warning-800 border border-warning-500",
    danger: "bg-danger-50 text-danger-800 border border-danger-500",
    info: "bg-info-50 text-info-800 border border-info-500",
    // "Unassigned" seating status -- the one accent in the Figma design
    // system that isn't part of the core brand/semantic scale (stock
    // Tailwind purple, distinct from the indigo brand color).
    unassigned: "bg-purple-50 text-purple-800 border border-purple-400",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", variants[variant], className)}>
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
