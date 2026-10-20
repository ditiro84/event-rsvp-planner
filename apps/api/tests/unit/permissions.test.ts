import { describe, expect, it } from "vitest";
import {
  capabilitiesForRole,
  requiredCapability,
  roleHasCapability,
  roleSeesGuestContactDetails,
} from "../../src/modules/collaborators/permissions";
import { redactGuestForRole } from "../../src/modules/guests/guestRedaction";

describe("requiredCapability", () => {
  it("maps event-scoped requests to a capability", () => {
    expect(requiredCapability("GET", "/")).toBe("event:view");
    expect(requiredCapability("PUT", "/")).toBe("event:edit");
    expect(requiredCapability("GET", "/guests")).toBe("guests:read");
    expect(requiredCapability("GET", "/guests/g1")).toBe("guests:read");
    expect(requiredCapability("POST", "/guests")).toBe("guests:write");
    expect(requiredCapability("GET", "/guests/export")).toBe("guests:export");
    expect(requiredCapability("GET", "/guests/g1/invite")).toBe("guests:write");
    expect(requiredCapability("POST", "/guests/g1/checkin")).toBe("checkin");
    expect(requiredCapability("DELETE", "/guests/g1/checkin")).toBe("checkin");
    expect(requiredCapability("POST", "/guests/checkin/scan")).toBe("checkin");
    expect(requiredCapability("GET", "/guests/wristbands/pdf")).toBe("checkin");
    expect(requiredCapability("GET", "/seating/map")).toBe("seating:read");
    expect(requiredCapability("POST", "/seating/assignments")).toBe("seating:write");
    expect(requiredCapability("GET", "/vendors")).toBe("vendors:read");
    expect(requiredCapability("POST", "/vendors")).toBe("vendors:write");
    expect(requiredCapability("GET", "/orders")).toBe("merch:read");
    expect(requiredCapability("POST", "/ticket-types/scan")).toBe("checkin");
    expect(requiredCapability("GET", "/ticket-types")).toBe("tickets:read");
    expect(requiredCapability("GET", "/rsvp")).toBe("rsvp:read");
  });

  it("keeps payouts, team management and unknown routes owner-only", () => {
    expect(requiredCapability("GET", "/payouts")).toBe("owner:only");
    expect(requiredCapability("POST", "/payouts/stripe/connect")).toBe("owner:only");
    expect(requiredCapability("GET", "/collaborators")).toBe("owner:only");
    expect(requiredCapability("GET", "/staff-passes")).toBe("owner:only");
    expect(requiredCapability("GET", "/something-new")).toBe("owner:only");
    expect(requiredCapability("DELETE", "/")).toBe("owner:only");
  });
});

describe("role capabilities", () => {
  it("treats the legacy STAFF role exactly like COORDINATOR", () => {
    expect(capabilitiesForRole("STAFF").sort()).toEqual(capabilitiesForRole("COORDINATOR").sort());
  });

  it("never gives any collaborator role the owner-only capability", () => {
    for (const role of ["STAFF", "COORDINATOR", "CATERER", "DOOR_STAFF", "VIEWER"]) {
      expect(roleHasCapability(role, "owner:only")).toBe(false);
    }
  });

  it("lets a coordinator do everything day-to-day, including money screens", () => {
    for (const cap of ["guests:write", "seating:write", "vendors:read", "merch:write", "tickets:write", "checkin"] as const) {
      expect(roleHasCapability("COORDINATOR", cap)).toBe(true);
    }
  });

  it("limits a caterer to guests and seating, with no money or invites", () => {
    expect(roleHasCapability("CATERER", "guests:read")).toBe(true);
    expect(roleHasCapability("CATERER", "seating:read")).toBe(true);
    for (const cap of ["guests:write", "guests:export", "vendors:read", "merch:read", "tickets:read", "checkin", "rsvp:read"] as const) {
      expect(roleHasCapability("CATERER", cap)).toBe(false);
    }
  });

  it("limits door staff to looking up and checking in guests", () => {
    expect(roleHasCapability("DOOR_STAFF", "checkin")).toBe(true);
    expect(roleHasCapability("DOOR_STAFF", "guests:read")).toBe(true);
    for (const cap of ["guests:write", "seating:read", "vendors:read", "merch:read", "guests:export"] as const) {
      expect(roleHasCapability("DOOR_STAFF", cap)).toBe(false);
    }
  });

  it("makes a viewer strictly read-only and blind to money", () => {
    for (const cap of ["guests:read", "rsvp:read", "seating:read"] as const) {
      expect(roleHasCapability("VIEWER", cap)).toBe(true);
    }
    for (const cap of ["guests:write", "seating:write", "checkin", "vendors:read", "merch:read", "tickets:read"] as const) {
      expect(roleHasCapability("VIEWER", cap)).toBe(false);
    }
  });

  it("rejects unknown roles", () => {
    expect(roleHasCapability("HACKER", "event:view")).toBe(false);
    expect(capabilitiesForRole("HACKER")).toEqual([]);
  });
});

describe("guest redaction", () => {
  const guest = { id: "g1", firstName: "A", email: "a@example.com", phone: "123", specialNotes: "private", mealPreference: "Vegan" };

  it("hides contact details and notes from caterers and door staff", () => {
    expect(roleSeesGuestContactDetails("CATERER")).toBe(false);
    expect(roleSeesGuestContactDetails("DOOR_STAFF")).toBe(false);
    for (const role of ["CATERER", "DOOR_STAFF"]) {
      expect(redactGuestForRole(guest, role)).toEqual({ ...guest, email: null, phone: null, specialNotes: null });
    }
  });

  it("leaves the record alone for owners and other roles", () => {
    expect(redactGuestForRole(guest, undefined)).toBe(guest);
    expect(redactGuestForRole(guest, "COORDINATOR")).toBe(guest);
    expect(redactGuestForRole(guest, "VIEWER")).toBe(guest);
  });
});
