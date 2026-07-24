import { cn } from "@/lib/cn";

// Shared initials avatar -- the app has no guest photo uploads, so every
// mockup's "guest photo" is represented as a colored initials circle
// instead (reused across Guests and RSVP tables).
export function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function Avatar({
  firstName,
  lastName,
  size = "md",
  className,
}: {
  firstName: string;
  lastName: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700",
        size === "md" ? "h-9 w-9 text-xs" : "h-8 w-8 text-[11px]",
        className
      )}
    >
      {initials(firstName, lastName)}
    </span>
  );
}
