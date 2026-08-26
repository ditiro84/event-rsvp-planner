import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

// Lightweight, CSS-only hover/focus hint -- no positioning library, no JS
// state. Shows on mouse hover (group-hover) and keyboard focus
// (group-focus-within) so it's usable without a mouse, and is
// pointer-events-none so it never intercepts the click meant for the
// wrapped trigger. Wrap a single icon button or nav item; for elements
// that already show their own visible label (e.g. a labeled primary
// button) a tooltip is usually redundant -- reach for this on icon-only
// controls or to add a short explanation beyond a bare label.
export function Tooltip({
  label,
  children,
  side = "bottom",
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
}) {
  return (
    // h-full so wrapping a flex child that itself relies on a percentage
    // height (e.g. the top-nav tabs, which stretch to fill the header)
    // doesn't quietly collapse it -- harmless everywhere else since a
    // percentage height resolves to auto when the parent's own height
    // isn't explicitly set.
    <span className="group/tooltip relative inline-flex h-full">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 max-w-[220px] whitespace-normal rounded-md bg-slate-900 px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-white opacity-0 shadow-elevated transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          side === "bottom" ? "left-1/2 top-full mt-2 -translate-x-1/2" : "left-1/2 bottom-full mb-2 -translate-x-1/2"
        )}
      >
        {label}
      </span>
    </span>
  );
}
