import { DonutChart } from "./DonutChart";

export interface CategoryDatum {
  label: string;
  value: number;
}

interface PaletteEntry {
  stroke: string;
  fill: string;
  bg: string;
}

// Fixed, fully-literal palette -- Tailwind's JIT scanner needs the complete
// class name to appear as text somewhere in source; computing it via string
// concatenation at runtime (e.g. `bg-${color}`) would get silently purged
// from the production build. Cycled by category index.
const PALETTE: PaletteEntry[] = [
  { stroke: "stroke-brand-600", fill: "fill-brand-600", bg: "bg-brand-600" },
  { stroke: "stroke-success-500", fill: "fill-success-500", bg: "bg-success-500" },
  { stroke: "stroke-info-500", fill: "fill-info-500", bg: "bg-info-500" },
  { stroke: "stroke-warning-500", fill: "fill-warning-500", bg: "bg-warning-500" },
  { stroke: "stroke-danger-500", fill: "fill-danger-500", bg: "bg-danger-500" },
  { stroke: "stroke-brand-300", fill: "fill-brand-300", bg: "bg-brand-300" },
  { stroke: "stroke-success-700", fill: "fill-success-700", bg: "bg-success-700" },
  { stroke: "stroke-info-700", fill: "fill-info-700", bg: "bg-info-700" },
];

export function paletteColor(index: number): PaletteEntry {
  return PALETTE[index % PALETTE.length];
}

// One metric across a handful of named categories (not a time series) --
// used for the revenue-by-currency-and-provider breakdown. Pie mode
// delegates to DonutChart plus a label legend (DonutChart's own legend is
// just colored dots with no label); bar/line modes are a small authored SVG
// matching TrendChart's grid conventions.
export function CategoryChart({
  data,
  chartType,
  height = 220,
  totalLabel = "Total",
}: {
  data: CategoryDatum[];
  chartType: "line" | "bar" | "pie";
  height?: number;
  totalLabel?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (chartType === "pie") {
    return (
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
        <DonutChart
          slices={data.map((d, i) => ({ value: d.value, colorClass: paletteColor(i).stroke }))}
          centerValue={total}
          centerLabel={totalLabel}
        />
        <div className="space-y-1.5">
          {data.map((d, i) => (
            <div key={d.label} className="flex items-center gap-2 text-sm">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${paletteColor(i).bg}`} />
              <span className="text-slate-700">{d.label}</span>
              <span className="text-slate-400">
                {d.value} ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const width = 640;
  const paddingLeft = 32;
  const paddingBottom = 34;
  const paddingTop = 12;
  const plotWidth = width - paddingLeft - 8;
  const plotHeight = height - paddingTop - paddingBottom;
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const slotWidth = data.length > 0 ? plotWidth / data.length : plotWidth;
  const barWidth = slotWidth * 0.5;

  function xFor(i: number) {
    return paddingLeft + i * slotWidth + slotWidth / 2;
  }
  function yFor(v: number) {
    return paddingTop + plotHeight - (v / maxValue) * plotHeight;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Breakdown by category">
      {[0, 0.5, 1].map((frac) => (
        <line
          key={frac}
          x1={paddingLeft}
          x2={width - 8}
          y1={paddingTop + plotHeight * (1 - frac)}
          y2={paddingTop + plotHeight * (1 - frac)}
          className="stroke-slate-100"
          strokeWidth={1}
        />
      ))}
      <text x={4} y={paddingTop + 4} className="fill-slate-400 text-[9px]">
        {maxValue}
      </text>
      <text x={4} y={paddingTop + plotHeight} className="fill-slate-400 text-[9px]">
        0
      </text>

      {chartType === "bar" &&
        data.map((d, i) => {
          const barHeight = (d.value / maxValue) * plotHeight;
          return (
            <rect
              key={d.label}
              x={xFor(i) - barWidth / 2}
              y={paddingTop + plotHeight - barHeight}
              width={barWidth}
              height={Math.max(barHeight, 0)}
              rx={2}
              className={paletteColor(i).fill}
            />
          );
        })}

      {chartType === "line" && (
        <>
          <polyline
            points={data.map((d, i) => `${xFor(i)},${yFor(d.value)}`).join(" ")}
            fill="none"
            strokeWidth={2}
            className="stroke-brand-600"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {data.map((d, i) => (
            <circle key={d.label} cx={xFor(i)} cy={yFor(d.value)} r={3.5} className={paletteColor(i).fill} />
          ))}
        </>
      )}

      {data.map((d, i) => (
        <text key={d.label} x={xFor(i)} y={height - 6} textAnchor="middle" className="fill-slate-500 text-[9px]">
          {d.label.length > 14 ? `${d.label.slice(0, 13)}…` : d.label}
        </text>
      ))}
    </svg>
  );
}
