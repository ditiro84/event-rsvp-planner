// Lowercase, hyphenated version of a name for use as a cosmetic URL segment
// (see buildInviteUrl / RsvpTab.tsx's rsvpUrl) -- purely a recognizability
// aid so a guest sees "your-event-name" in the link instead of a bare
// opaque token and doesn't mistake it for spam/phishing. Not stored, not
// unique, and never the actual lookup key: the token that follows it in the
// path is still what the server looks guests up by (see rsvp.service.ts),
// so this never needs a uniqueness check the way Event.publicSlug does for
// the ticketing feature's /tickets/:slug page.
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "event";
}
