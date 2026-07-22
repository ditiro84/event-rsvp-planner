import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)} {...props} />;
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
}

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "text-slate-900",
  green: "text-emerald-600",
  amber: "text-amber-600",
  red: "text-red-600",
  purple: "text-brand-600",
};

export function StatCard({ label, value, hint, accent = "default" }: StatCardProps) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold", accentClasses[accent])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}
