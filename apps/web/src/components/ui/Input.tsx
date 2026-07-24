import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}

export function Field({ label, error, hint, htmlFor, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-slate-600">{hint}</p>}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Default state uses a subtle slate-tinted fill that "pops" white on
// focus -- matching the Figma design system's Form Input Fields component
// (Default / Active-Focus / Error / Disabled states).
const baseInputClass =
  "w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(baseInputClass, error && "border-danger-500 bg-danger-50 focus:border-danger-500 focus:ring-danger-100", className)}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(baseInputClass, "min-h-[90px]", className)} {...props} />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(baseInputClass, className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn("h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500", className)}
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";
