import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface StepperStep {
  label: string;
  status: "completed" | "current" | "upcoming";
  statusLabel: string;
}

// The four-stage planning stepper from the Event Overview mockup (Guests ->
// RSVP -> Seating -> Check-in). Status per step is derived from real
// dashboard stats rather than hardcoded, so it reflects each event's actual
// progress.
export function Stepper({ steps }: { steps: StepperStep[] }) {
  return (
    <div className="flex w-full items-center gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      {steps.map((step, i) => (
        <div key={step.label} className="flex flex-1 items-center gap-6">
          <div className="flex flex-1 items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                step.status === "completed" && "bg-success-600 text-white",
                step.status === "current" && "bg-brand-600 text-white",
                step.status === "upcoming" && "bg-slate-200 text-slate-500"
              )}
            >
              {step.status === "completed" ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <div className="flex flex-col gap-0.5 whitespace-nowrap">
              <span className={cn("text-sm font-semibold", step.status === "upcoming" ? "text-slate-500" : "text-slate-900")}>
                {step.label}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  step.status === "completed" && "text-slate-400",
                  step.status === "current" && "text-brand-600",
                  step.status === "upcoming" && "text-slate-400"
                )}
              >
                {step.statusLabel}
              </span>
            </div>
          </div>
          {i < steps.length - 1 && <div className="h-px w-10 shrink-0 bg-slate-200" />}
        </div>
      ))}
    </div>
  );
}
