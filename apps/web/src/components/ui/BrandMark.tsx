import { cn } from "@/lib/cn";

// The app's actual brand mark (also the favicon/app-icon source) -- an
// abstract violet/cyan bolt shape, already colorful on its own so it's
// rendered bare rather than boxed in a solid colour tile like the
// Sparkles/Share2 placeholder icons it replaces (see SiteHeader,
// SiteFooter, DashboardLayout, AuthLayout). Referenced as a static asset
// (not inlined) since the source SVG uses several blur filters that are
// easiest to keep exactly as exported.
export function BrandMark({ className }: { className?: string }) {
  return <img src="/favicon.svg" alt="" className={cn("h-8 w-8", className)} />;
}
