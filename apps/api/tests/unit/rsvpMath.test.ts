import { describe, expect, it } from "vitest";
import { computeRsvpStats, hasResponded, shouldReleaseSeatOnStatusChange } from "../../src/utils/rsvpMath";

describe("computeRsvpStats", () => {
  it("tallies statuses and expected attendees including accompanying guests", () => {
    const stats = computeRsvpStats([
      { rsvpStatus: "CONFIRMED", additionalGuestsCount: 2 },
      { rsvpStatus: "CONFIRMED", additionalGuestsCount: 0 },
      { rsvpStatus: "DECLINED", additionalGuestsCount: 0 },
      { rsvpStatus: "PENDING", additionalGuestsCount: 0 },
      { rsvpStatus: "MAYBE", additionalGuestsCount: 1 },
    ]);

    expect(stats.totalInvited).toBe(5);
    expect(stats.confirmed).toBe(2);
    expect(stats.declined).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.maybe).toBe(1);
    // 2 confirmed guests + 2 accompanying guests from the first confirmed guest
    expect(stats.totalExpectedAttendees).toBe(4);
  });

  it("returns zeros for an empty guest list", () => {
    const stats = computeRsvpStats([]);
    expect(stats).toEqual({
      totalInvited: 0,
      confirmed: 0,
      declined: 0,
      pending: 0,
      maybe: 0,
      totalExpectedAttendees: 0,
    });
  });
});

describe("hasResponded", () => {
  it("treats CONFIRMED, DECLINED and MAYBE as responded", () => {
    expect(hasResponded("CONFIRMED")).toBe(true);
    expect(hasResponded("DECLINED")).toBe(true);
    expect(hasResponded("MAYBE")).toBe(true);
  });

  it("treats PENDING as not yet responded", () => {
    expect(hasResponded("PENDING")).toBe(false);
  });
});

describe("shouldReleaseSeatOnStatusChange", () => {
  it("releases the seat when a confirmed guest changes away from confirmed", () => {
    expect(shouldReleaseSeatOnStatusChange("CONFIRMED", "DECLINED")).toBe(true);
    expect(shouldReleaseSeatOnStatusChange("CONFIRMED", "PENDING")).toBe(true);
  });

  it("does not release the seat when the guest stays confirmed or was never confirmed", () => {
    expect(shouldReleaseSeatOnStatusChange("CONFIRMED", "CONFIRMED")).toBe(false);
    expect(shouldReleaseSeatOnStatusChange("PENDING", "DECLINED")).toBe(false);
  });
});
