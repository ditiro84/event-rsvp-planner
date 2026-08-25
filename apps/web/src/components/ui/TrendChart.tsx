export interface TrendSeries {
  label: string;
  colorClass: string; // Tailwind stroke-* class
  values: number[];
}

// Hand-authored multi-line/bar trend chart -- same "small authored SVG"
// approach as DonutChart.tsx rather than pulling in a charting library for
// one admin-only screen. Renders a fixed number of evenly-spaced points
// along the x-axis (the caller supplies one value per day) with a light
// grid and no interactivity, which is enough for a 30-day glance. `bar`
// mode groups each series' bar side by side within a day's slot.
export function TrendChart({
  series,
  dates,
  height = 150,
  chartType = "line",
}: {
  series: TrendSeries[];
  dates: string[];
  height?: number;
  chartType?: "line" | "bar";
}) {
  const width = 640;
  const paddingLeft = 34;
  const paddingBottom = 26;
  const paddingTop = 14;
  const plotWidth = width - paddingLeft - 8;
  const plotHeight = height - paddingTop - paddingBottom;

  const maxValue = Math.max(1, ...series.flatMap((s) => s.values));
  const stepX = dates.length > 1 ? plotWidth / (dates.length - 1) : 0;

  function pointsFor(values: number[]) {
    return values
      .map((v, i) => {
        const x = paddingLeft + i * stepX;
        const y = paddingTop + plotHeight - (v / maxValue) * plotHeight;
        return `${x},${y}`;
      })
      .join(" ");
  }

  // Bar mode divides the plot into one slot per date, with each series'
  // bar side by side inside that slot (a small gap between slots keeps
  // adjacent days visually separated).
  const barSlotWidth = dates.length > 0 ? plotWidth / dates.length : plotWidth;
  const barGroupPadding = barSlotWidth * 0.25;
  const barWidth = series.length > 0 ? (barSlotWidth - barGroupPadding) / series.length : 0;

  // Sparse x-axis labels (first, middle, last) -- printing all 30 dates
  // would overlap at this width.
  const labelIndices = dates.length > 1 ? [0, Math.floor((dates.length - 1) / 2), dates.length - 1] : [0];

  return (
    <div className="max-w-xl">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Trend over time">
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
        {chartType === "line" &&
          series.map((s) => (
            <polyline
              key={s.label}
              points={pointsFor(s.values)}
              fill="none"
              strokeWidth={2}
              className={s.colorClass}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

        {chartType === "bar" &&
          dates.map((_, i) =>
            series.map((s, si) => {
              const value = s.values[i] ?? 0;
              const barHeight = (value / maxValue) * plotHeight;
              const x = paddingLeft + i * barSlotWidth + barGroupPadding / 2 + si * barWidth;
              const y = paddingTop + plotHeight - barHeight;
              return (
                <rect
                  key={`${s.label}-${i}`}
                  x={x}
                  y={y}
                  width={Math.max(barWidth - 1, 0.5)}
                  height={Math.max(barHeight, 0)}
                  rx={1}
                  className={s.colorClass.replace("stroke-", "fill-")}
                />
              );
            })
          )}
        {labelIndices.map((i) => (
          <text
            key={i}
            x={paddingLeft + i * stepX}
            y={height - 6}
            textAnchor={i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"}
            className="fill-slate-400 text-[10px]"
          >
            {dates[i]?.slice(5)}
          </text>
        ))}
      </svg>
      <div className="mt-2 flex items-center gap-4">
        {series.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`h-2 w-2 rounded-full ${s.colorClass.replace("stroke-", "bg-")}`} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
