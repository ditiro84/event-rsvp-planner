import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

// Variant/state colors match the Figma design system's "Buttons Component
// Stack" states matrix (Default / Hover / Disabled per variant).
const variants = {
  primary: "bg-brand-600 text-white shadow-soft hover:bg-brand-800 focus-visible:outline-brand-600",
  secondary:
    "bg-white text-slate-900 border border-slate-300 shadow-soft hover:border-brand-600 hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-slate-400",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-brand-600 focus-visible:outline-slate-400",
  danger: "bg-danger-500 text-white shadow-soft hover:bg-danger-800 focus-visible:outline-danger-600",
};

// Heights match the Figma spec exactly (Large 48px / Medium 40px / Small
// 32px) so buttons line up consistently with inputs of the same row.
const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
