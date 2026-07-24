import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

const iconToneClasses = {
  brand: "bg-brand-100 text-brand-600",
  danger: "bg-danger-50 text-danger-600",
} as const;

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  tone = "brand",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  tone?: keyof typeof iconToneClasses;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl2 border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center",
        className
      )}
    >
      {icon && (
        <div className={cn("mb-4 flex h-14 w-14 items-center justify-center rounded-full", iconToneClasses[tone])}>
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Shared "this request failed" state -- used wherever a page-level query can
// error (as opposed to just legitimately having no data yet), so a failed
// fetch never looks like an empty list or hangs on a spinner forever.
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this. Check your connection and try again.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      tone="danger"
      icon={<AlertTriangle className="h-6 w-6" />}
      title={title}
      description={description}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        )
      }
      className={className}
    />
  );
}
