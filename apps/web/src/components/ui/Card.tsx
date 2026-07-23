import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl2 border border-slate-200/80 bg-white shadow-card", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-slate-100 px-5 py-4", className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "green" | "amber" | "red" | "purple";
  icon?: React.ReactNode;
}

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "text-slate-900",
  green: "text-success-600",
  amber: "text-warning-600",
  red: "text-danger-600",
  purple: "text-brand-600",
};

const iconAccentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "bg-slate-100 text-slate-500",
  green: "bg-success-50 text-success-600",
  amber: "bg-warning-50 text-warning-600",
  red: "bg-danger-50 text-danger-600",
  purple: "bg-brand-50 text-brand-600",
};

export function StatCard({ label, value, hint, accent = "default", icon }: StatCardProps) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">{label}</p>
          <p className={cn("mt-1.5 text-2xl font-semibold tracking-tight", accentClasses[accent])}>{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        {icon && (
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconAccentClasses[accent])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
