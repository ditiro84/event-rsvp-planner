import { describe, expect, it } from "vitest";
import { canAssignGuest, checkTableCapacity, countUnassignedConfirmedGuests } from "../../src/utils/capacity";

describe("checkTableCapacity", () => {
  it("reports remaining seats when under capacity", () => {
    const result = checkTableCapacity(8, 5);
    expect(result.isOverCapacity).toBe(false);
    expect(result.remainingSeats).toBe(3);
  });

  it("flags over-capacity tables", () => {
    const result = checkTableCapacity(8, 9);
    expect(result.isOverCapacity).toBe(true);
    expect(result.remainingSeats).toBe(-1);
  });
});

describe("canAssignGuest", () => {
  it("allows assignment when there is room and guest is unassigned", () => {
    const decision = canAssignGuest({
      guestRsvpStatus: "CONFIRMED",
      alreadyAssignedElsewhere: false,
      currentAssignedCount: 3,
      tableCapacity: 8,
    });
    expect(decision.allowed).toBe(true);
  });

  it("rejects assignment when the guest already has a seat", () => {
    const decision = canAssignGuest({
      guestRsvpStatus: "CONFIRMED",
      alreadyAssignedElsewhere: true,
      currentAssignedCount: 3,
      tableCapacity: 8,
    });
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.reason).toMatch(/already assigned/i);
    }
  });

  it("rejects assignment over capacity without override", () => {
    const decision = canAssignGuest({
      guestRsvpStatus: "CONFIRMED",
      alreadyAssignedElsewhere: false,
      currentAssignedCount: 8,
      tableCapacity: 8,
    });
    expect(decision.allowed).toBe(false);
  });

  it("allows over-capacity assignment when explicitly overridden, with a warning", () => {
    const decision = canAssignGuest({
      guestRsvpStatus: "CONFIRMED",
      alreadyAssignedElsewhere: false,
      currentAssignedCount: 8,
      tableCapacity: 8,
      overrideCapacity: true,
    });
    expect(decision.allowed).toBe(true);
    if (decision.allowed) {
      expect(decision.warning).toMatch(/over capacity/i);
    }
  });

  it("warns (but allows) assigning a declined guest", () => {
    const decision = canAssignGuest({
      guestRsvpStatus: "DECLINED",
      alreadyAssignedElsewhere: false,
      currentAssignedCount: 2,
      tableCapacity: 8,
    });
    expect(decision.allowed).toBe(true);
    if (decision.allowed) {
      expect(decision.warning).toMatch(/declined/i);
    }
  });
});

describe("countUnassignedConfirmedGuests", () => {
  it("counts only confirmed guests without a seat", () => {
    const count = countUnassignedConfirmedGuests([
      { rsvpStatus: "CONFIRMED", isAssigned: false },
      { rsvpStatus: "CONFIRMED", isAssigned: true },
      { rsvpStatus: "DECLINED", isAssigned: false },
      { rsvpStatus: "PENDING", isAssigned: false },
      { rsvpStatus: "CONFIRMED", isAssigned: false },
    ]);
    expect(count).toBe(2);
  });
});
