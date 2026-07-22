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
}

export type AssignGuestDecision =
  | { allowed: true; warning?: string }
  | { allowed: false; reason: string };

// Central rule-set for "can this guest be assigned to this table/seat right now?"
export function canAssignGuest(opts: AssignGuestOptions): AssignGuestDecision {
  if (opts.alreadyAssignedElsewhere) {
    return { allowed: false, reason: "Guest is already assigned to another seat" };
  }

  const wouldBeOverCapacity = opts.currentAssignedCount + 1 > opts.tableCapacity;
  if (wouldBeOverCapacity && !opts.overrideCapacity) {
    return { allowed: false, reason: "Table is at full capacity" };
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
