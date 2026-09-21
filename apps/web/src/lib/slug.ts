// Lowercase, hyphenated version of a name for use as a cosmetic URL segment
// in the RSVP link (see RsvpTab.tsx's rsvpUrl) -- purely a recognizability
// aid so a guest sees "your-event-name" in the link instead of a bare
// opaque token and doesn't mistake it for spam/phishing. Mirrors the
// backend's apps/api/src/lib/slug.ts (used for per-guest invite links) so
// both link types read the same way; kept as a small duplicate rather than
// a shared package since this app doesn't have one set up yet. Not stored,
// not unique, and never the actual lookup key -- see the route comments in
// App.tsx.
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "event";
}
