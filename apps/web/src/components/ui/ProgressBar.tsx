import { cn } from "@/lib/cn";

interface ProgressBarProps {
  value: number;
  max: number;
  accent?: "brand" | "success" | "warning" | "danger";
  className?: string;
  trackClassName?: string;
}

// "brand" fill matches the Figma Progress Metrics component (#4f46e5 /
// brand-600) exactly.
const accentClasses: Record<NonNullable<ProgressBarProps["accent"]>, string> = {
  brand: "bg-brand-600",
  success: "bg-success-600",
  warning: "bg-warning-600",
  danger: "bg-danger-600",
};

// A single visual language for "N of M complete" used across the My Events
// dashboard, Event Readiness overview, and (later) the seating/guest
// screens -- so progress always looks and behaves the same way everywhere.
export function ProgressBar({ value, max, accent = "brand", className, trackClassName }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-200", trackClassName, className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", accentClasses[accent])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// A labeled row combining a title, "x / y" count, and the bar itself --
// the recurring pattern for RSVP progress, seating progress, etc.
export function ProgressStat({
  label,
  value,
  max,
  suffix,
  accent = "brand",
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  accent?: ProgressBarProps["accent"];
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="shrink-0 text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{value}</span> / {max}
          {suffix ? ` ${suffix}` : ""}
        </span>
      </div>
      <ProgressBar value={value} max={max} accent={accent} />
    </div>
  );
}
