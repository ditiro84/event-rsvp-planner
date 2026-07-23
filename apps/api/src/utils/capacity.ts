// Pure, framework-free helpers for table/seat capacity math.
// Kept separate from the (not-yet-built) seating assignment endpoints so the
// core business rules are unit-testable and reusable once that module lands.

export interface CapacityCheckResult {
  isOverCapacity: boolean;
  remainingSeats: number;
}

export function checkTableCapacity(capacity: number, currentAssignedCount: number): CapacityCheckResult {
  const remainingSeats = capacity - currentAssignedCount;
  return {
    isOverCapacity: currentAssignedCount > capacity,
    remainingSeats,
  };
}

export interface AssignGuestOptions {
  guestRsvpStatus: "PENDING" | "CONFIRMED" | "DECLINED" | "MAYBE";
  alreadyAssignedElsewhere: boolean;
  currentAssignedCount: number;
  tableCapacity: number;
  overrideCapacity?: boolean;
  // How many physical seats this guest's invite actually needs -- the guest
  // themselves plus any accompanying "+1"s (RSVP additionalGuestsCount).
  // Defaults to 1 for a solo guest.
  partySize?: number;
}

export type AssignGuestDecision =
  | { allowed: true; warning?: string }
  | { allowed: false; reason: string };

// Central rule-set for "can this guest be assigned to this table/seat right now?"
export function canAssignGuest(opts: AssignGuestOptions): AssignGuestDecision {
  if (opts.alreadyAssignedElsewhere) {
    return { allowed: false, reason: "Guest is already assigned to another seat" };
  }

  const partySize = opts.partySize ?? 1;
  const wouldBeOverCapacity = opts.currentAssignedCount + partySize > opts.tableCapacity;
  if (wouldBeOverCapacity && !opts.overrideCapacity) {
    return {
      allowed: false,
      reason:
        partySize > 1
          ? `Table doesn't have room for this guest's party of ${partySize}`
          : "Table is at full capacity",
    };
  }

  if (opts.guestRsvpStatus === "DECLINED") {
    return {
      allowed: true,
      warning: "This guest declined the invitation. Assigning them anyway.",
    };
  }

  if (wouldBeOverCapacity && opts.overrideCapacity) {
    return { allowed: true, warning: "Table is now over capacity" };
  }

  return { allowed: true };
}

export function countUnassignedConfirmedGuests(
  guests: { rsvpStatus: string; isAssigned: boolean }[]
): number {
  return guests.filter((g) => g.rsvpStatus === "CONFIRMED" && !g.isAssigned).length;
}
