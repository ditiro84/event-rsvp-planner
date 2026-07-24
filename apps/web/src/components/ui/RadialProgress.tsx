import { cn } from "@/lib/cn";

interface RadialProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  accent?: "brand" | "success" | "warning" | "danger";
  label?: string;
  sublabel?: string;
  className?: string;
  // Renders just the ring (no card chrome, no label rows) -- for embedding
  // inside a caller's own layout, e.g. the Check-in tab's capacity panel.
  bare?: boolean;
}

// Matches the Figma "progress-indicator-card" pattern from the Event
// Overview mockup (RSVP / Seating / Check-in readiness rings) -- a plain
// stroke-dasharray SVG ring rather than an imported asset, since it's a
// flat-fill shape that's simpler and more reliable to hand-author than to
// depend on Figma's expiring export URLs.
const strokeClasses: Record<NonNullable<RadialProgressProps["accent"]>, string> = {
  brand: "stroke-brand-600",
  success: "stroke-success-600",
  warning: "stroke-warning-600",
  danger: "stroke-danger-600",
};

export function RadialProgress({
  value,
  max,
  size = 110,
  strokeWidth = 10,
  accent = "brand",
  label,
  sublabel,
  className,
  bare = false,
}: RadialProgressProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  const ring = (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-slate-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-[stroke-dashoffset] duration-500 ease-out", strokeClasses[accent])}
        />
      </svg>
      <span className="absolute text-[22px] font-bold text-slate-900">{Math.round(pct)}%</span>
    </div>
  );

  if (bare) return <div className={className}>{ring}</div>;

  return (
    <div className={cn("flex flex-1 flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card", className)}>
      {ring}
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{sublabel}</p>
      </div>
    </div>
  );
}
