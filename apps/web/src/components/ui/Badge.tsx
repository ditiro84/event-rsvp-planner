import { cn } from "@/lib/cn";
import type { RsvpStatus } from "@/types";

const statusStyles: Record<RsvpStatus, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DECLINED: "bg-red-50 text-red-700 ring-red-600/20",
  PENDING: "bg-slate-100 text-slate-600 ring-slate-500/20",
  MAYBE: "bg-amber-50 text-amber-700 ring-amber-600/20",
};

export function RsvpStatusBadge({ status }: { status: RsvpStatus }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", statusStyles[status])}>
      {label}
    </span>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700", className)}>
      {children}
    </span>
  );
}
