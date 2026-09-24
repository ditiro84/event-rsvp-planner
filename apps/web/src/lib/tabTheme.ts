// Per-section signature colour, so switching tabs in the planner dashboard
// (and the equivalent global sections) reads as genuinely different places
// rather than the same brand-purple/coral duotone repeating on every
// screen. Deliberately NOT the invitation-card colour-extraction system
// used on the public RSVP page (see lib/cardTheme.ts) -- this is a fixed,
// hand-picked palette for the *app's own* chrome, not derived from any
// per-event content.
//
// Colour choices avoid the semantic ones (success/warning/danger/info in
// tailwind.config.js) so a page's decorative accent is never confusable
// with a real status signal, and avoid brand/coral's own hues too (those
// stay reserved for primary actions and money-moment CTAs respectively,
// per Button.tsx's variant comment). Admin originally stayed neutral/slate
// on the reasoning that it's a support/utility screen rather than a
// "section" -- overridden on request, so it now gets the same real-colour
// treatment (orange) as every other section, StatCards included.
//
// Every value here is a literal, complete Tailwind class string (never
// built with template interpolation like `bg-${color}-600`) because
// Tailwind's JIT scanner only picks up class names it can see as whole
// strings in a file matched by `content` in tailwind.config.js -- this
// file (a .ts file under src/**) is matched, so these are picked up even
// though they're not directly used as a JSX className here.
export interface TabTheme {
  iconBg: string;
  iconText: string;
  navActiveText: string;
  navActiveBar: string;
  // Border-side twin of navActiveBar, for the rare spot styled with a
  // bottom border instead of an underline bar (e.g. Admin's internal tab
  // strip) -- kept as its own literal class for the same JIT-safety reason
  // as everything else here, rather than reusing navActiveBar's bg- class
  // as a border colour via an inline style.
  navActiveBorder: string;
  statAccent: "purple" | "coral" | "green" | "blue" | "amber" | "rose" | "teal" | "orange";
  // Solid hex twin of iconText/navActiveBar, for the handful of spots that
  // need an inline style (gradients, chart colours) rather than a
  // className -- e.g. accent bars mixing two of these together.
  hex: string;
  // Whole-page background wash for this section (applied to DashboardLayout's
  // <main>, replacing the flat bg-canvas grey/white every tab used to
  // share). Each one blends the tab's own colour with a second colour from
  // elsewhere in the palette -- a genuine mix, not a single flat tint --
  // while staying at the lightest (-50) step and resolving to white/canvas
  // at the far corner so body text and white cards on top stay legible
  // (the same lesson from the RSVP page's earlier contrast bug: a colourful
  // background must never fight the text sitting on it).
  pageBg: string;
}

export const TAB_THEME: Record<string, TabTheme> = {
  overview: {
    iconBg: "bg-brand-50",
    iconText: "text-brand-600",
    navActiveText: "text-brand-600",
    navActiveBar: "bg-brand-600",
    navActiveBorder: "border-brand-600",
    statAccent: "purple",
    hex: "#9d3fff",
    pageBg: "bg-gradient-to-br from-brand-50 via-white to-coral-50/60",
  },
  guests: {
    iconBg: "bg-teal-50",
    iconText: "text-teal-600",
    navActiveText: "text-teal-600",
    navActiveBar: "bg-teal-600",
    navActiveBorder: "border-teal-600",
    statAccent: "teal",
    hex: "#0d9488",
    pageBg: "bg-gradient-to-br from-teal-50 via-white to-brand-50/50",
  },
  rsvp: {
    iconBg: "bg-fuchsia-50",
    iconText: "text-fuchsia-600",
    navActiveText: "text-fuchsia-600",
    navActiveBar: "bg-fuchsia-600",
    navActiveBorder: "border-fuchsia-600",
    statAccent: "rose",
    hex: "#c026d3",
    pageBg: "bg-gradient-to-br from-fuchsia-50 via-white to-coral-50/50",
  },
  vendors: {
    iconBg: "bg-sky-50",
    iconText: "text-sky-600",
    navActiveText: "text-sky-600",
    navActiveBar: "bg-sky-600",
    navActiveBorder: "border-sky-600",
    statAccent: "blue",
    hex: "#0284c7",
    pageBg: "bg-gradient-to-br from-sky-50 via-white to-teal-50/50",
  },
  merchandise: {
    // Kept on the app's existing money/shop colour (coral) rather than
    // inventing a new one -- it's already what "buy this" means everywhere
    // else in the app (Button's "accent" variant, ticket/merch CTAs).
    iconBg: "bg-coral-50",
    iconText: "text-coral-600",
    navActiveText: "text-coral-600",
    navActiveBar: "bg-coral-600",
    navActiveBorder: "border-coral-600",
    statAccent: "coral",
    hex: "#f92d06",
    pageBg: "bg-gradient-to-br from-coral-50 via-white to-brand-50/50",
  },
  tickets: {
    iconBg: "bg-indigo-50",
    iconText: "text-indigo-600",
    navActiveText: "text-indigo-600",
    navActiveBar: "bg-indigo-600",
    navActiveBorder: "border-indigo-600",
    statAccent: "purple",
    hex: "#4f46e5",
    pageBg: "bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50/50",
  },
  seating: {
    iconBg: "bg-lime-50",
    iconText: "text-lime-700",
    navActiveText: "text-lime-700",
    navActiveBar: "bg-lime-600",
    navActiveBorder: "border-lime-600",
    statAccent: "green",
    hex: "#4d7c0f",
    pageBg: "bg-gradient-to-br from-lime-50 via-white to-teal-50/50",
  },
  checkin: {
    iconBg: "bg-rose-50",
    iconText: "text-rose-600",
    navActiveText: "text-rose-600",
    navActiveBar: "bg-rose-600",
    navActiveBorder: "border-rose-600",
    statAccent: "rose",
    hex: "#e11d48",
    pageBg: "bg-gradient-to-br from-rose-50 via-white to-coral-50/50",
  },
  team: {
    iconBg: "bg-cyan-50",
    iconText: "text-cyan-600",
    navActiveText: "text-cyan-600",
    navActiveBar: "bg-cyan-600",
    navActiveBorder: "border-cyan-600",
    statAccent: "blue",
    hex: "#0891b2",
    pageBg: "bg-gradient-to-br from-cyan-50 via-white to-sky-50/50",
  },
  // Global (outside any single event) sections below.
  events: {
    iconBg: "bg-brand-50",
    iconText: "text-brand-600",
    navActiveText: "text-brand-600",
    navActiveBar: "bg-brand-600",
    navActiveBorder: "border-brand-600",
    statAccent: "purple",
    hex: "#9d3fff",
    pageBg: "bg-gradient-to-br from-brand-50 via-white to-coral-50/60",
  },
  analytics: {
    iconBg: "bg-info-50",
    iconText: "text-info-600",
    navActiveText: "text-info-600",
    navActiveBar: "bg-info-600",
    navActiveBorder: "border-info-600",
    statAccent: "blue",
    hex: "#2563eb",
    pageBg: "bg-gradient-to-br from-info-50 via-white to-sky-50/50",
  },
  admin: {
    iconBg: "bg-orange-50",
    iconText: "text-orange-600",
    navActiveText: "text-orange-600",
    navActiveBar: "bg-orange-600",
    navActiveBorder: "border-orange-600",
    statAccent: "orange",
    hex: "#ea580c",
    pageBg: "bg-gradient-to-br from-orange-50 via-white to-sky-50/50",
  },
};

// Safe accessor -- falls back to the brand look for any key not in the map
// above, so a future new tab never renders unstyled.
export function getTabTheme(key: string): TabTheme {
  return TAB_THEME[key] ?? TAB_THEME.overview;
}
