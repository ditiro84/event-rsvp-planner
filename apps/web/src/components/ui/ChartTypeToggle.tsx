import { BarChart3, LineChart as LineIcon, PieChart as PieIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ChartType = "line" | "bar" | "pie";

const ICONS: Record<ChartType, typeof BarChart3> = {
  line: LineIcon,
  bar: BarChart3,
  pie: PieIcon,
};

const LABELS: Record<ChartType, string> = {
  line: "Line",
  bar: "Bar",
  pie: "Pie",
};

// Small segmented control shared by every chart that offers multiple
// render modes -- pass just the subset of types that make sense for that
// chart (e.g. line/bar for a time series, or line/bar/pie for a
// category breakdown).
export function ChartTypeToggle({
  value,
  onChange,
  options,
}: {
  value: ChartType;
  onChange: (type: ChartType) => void;
  options: ChartType[];
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {options.map((opt) => {
        const Icon = ICONS[opt];
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active ? "bg-white text-brand-700 shadow-soft" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {LABELS[opt]}
          </button>
        );
      })}
    </div>
  );
}
