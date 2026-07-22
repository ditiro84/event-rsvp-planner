// Pure helpers for RSVP/guest statistics, kept separate from Prisma queries
// so the counting/aggregation rules are unit-testable without a database.

export type RsvpStatus = "PENDING" | "CONFIRMED" | "DECLINED" | "MAYBE";

export interface GuestLike {
  rsvpStatus: RsvpStatus;
  additionalGuestsCount: number;
}

export interface RsvpStats {
  totalInvited: number;
  confirmed: number;
  declined: number;
  pending: number;
  maybe: number;
  totalExpectedAttendees: number;
}

export function computeRsvpStats(guests: GuestLike[]): RsvpStats {
  const confirmed = guests.filter((g) => g.rsvpStatus === "CONFIRMED");
  const declined = guests.filter((g) => g.rsvpStatus === "DECLINED");
  const pending = guests.filter((g) => g.rsvpStatus === "PENDING");
  const maybe = guests.filter((g) => g.rsvpStatus === "MAYBE");

  const totalExpectedAttendees =
    confirmed.length + confirmed.reduce((sum, g) => sum + g.additionalGuestsCount, 0);

  return {
    totalInvited: guests.length,
    confirmed: confirmed.length,
    declined: declined.length,
    pending: pending.length,
    maybe: maybe.length,
    totalExpectedAttendees,
  };
}

// Determines the next RSVP status transition rules: which statuses are
// considered "final" (guest actively responded) vs still awaiting a response.
export function hasResponded(status: RsvpStatus): boolean {
  return status === "CONFIRMED" || status === "DECLINED" || status === "MAYBE";
}

// A guest should free their seat whenever they are no longer confirmed.
export function shouldReleaseSeatOnStatusChange(previous: RsvpStatus, next: RsvpStatus): boolean {
  return previous === "CONFIRMED" && next !== "CONFIRMED";
}
