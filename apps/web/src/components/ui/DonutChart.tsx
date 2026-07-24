export interface DonutSlice {
  value: number;
  colorClass: string; // Tailwind stroke-* class
}

// Hand-authored multi-slice donut ring (stroke-dasharray per segment) --
// matches the "Response Overview" chart in the rsvp-planner-management
// mockup. Simple flat-fill shape, so authored directly instead of relying
// on Figma's expiring per-slice export URLs.
export function DonutChart({
  slices,
  size = 160,
  strokeWidth = 22,
  centerValue,
  centerLabel,
}: {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerValue: string | number;
  centerLabel: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;

  let offsetSoFar = 0;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-slate-100" />
        {slices.map((slice, i) => {
          const pct = slice.value / total;
          const dash = circumference * pct;
          const gap = circumference - dash;
          const dashoffset = -offsetSoFar * circumference;
          offsetSoFar += pct;
          if (slice.value === 0) return null;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={dashoffset}
              className={slice.colorClass}
            />
          );
        })}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[32px] font-extrabold leading-none text-slate-900">{centerValue}</span>
        <span className="mt-1 text-xs font-medium uppercase text-slate-500">{centerLabel}</span>
      </div>
    </div>
  );
}
