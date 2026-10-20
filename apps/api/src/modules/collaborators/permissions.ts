// Role-based access for event collaborators (registered accounts added to a
// single event). The owner and admins are never limited by this file; it only
// narrows what a collaborator can do inside the one event they were added to.
//
// STAFF is the original single role. It is treated exactly like COORDINATOR so
// anyone who already had access keeps all of it.

export type CollaboratorRole = "STAFF" | "COORDINATOR" | "CATERER" | "DOOR_STAFF" | "VIEWER";

export type Capability =
  | "event:view"
  | "event:edit"
  | "guests:read"
  | "guests:export"
  | "guests:write"
  | "rsvp:read"
  | "checkin"
  | "seating:read"
  | "seating:write"
  | "vendors:read"
  | "vendors:write"
  | "merch:read"
  | "merch:write"
  | "tickets:read"
  | "tickets:write"
  | "media:read"
  | "media:write"
  // Payouts, delete event, team management and anything not listed here.
  // No collaborator role has it, so those stay owner-only.
  | "owner:only";

const COORDINATOR_CAPABILITIES: Capability[] = [
  "event:view",
  "event:edit",
  "guests:read",
  "guests:export",
  "guests:write",
  "rsvp:read",
  "checkin",
  "seating:read",
  "seating:write",
  "vendors:read",
  "vendors:write",
  "merch:read",
  "merch:write",
  "tickets:read",
  "tickets:write",
  "media:read",
  "media:write",
];

export const ROLE_CAPABILITIES: Record<CollaboratorRole, ReadonlySet<Capability>> = {
  STAFF: new Set(COORDINATOR_CAPABILITIES),
  COORDINATOR: new Set(COORDINATOR_CAPABILITIES),
  // Sees who is coming and where they sit, with meal and dietary needs. No
  // contact details, money or invitations.
  CATERER: new Set<Capability>(["event:view", "guests:read", "seating:read"]),
  // Looks guests up and checks them in. No contact details, money or editing.
  DOOR_STAFF: new Set<Capability>(["event:view", "guests:read", "checkin"]),
  // Read-only view of the guest list, RSVPs, seating and invitation media.
  // Never sees money (vendor costs, orders, ticket sales).
  VIEWER: new Set<Capability>(["event:view", "guests:read", "rsvp:read", "seating:read", "media:read"]),
};

export const COLLABORATOR_ROLE_LABELS: Record<CollaboratorRole, string> = {
  STAFF: "Coordinator",
  COORDINATOR: "Coordinator",
  CATERER: "Caterer",
  DOOR_STAFF: "Door staff",
  VIEWER: "Viewer",
};

export function isCollaboratorRole(value: unknown): value is CollaboratorRole {
  return typeof value === "string" && value in ROLE_CAPABILITIES;
}

export function roleHasCapability(role: string, capability: Capability): boolean {
  if (!isCollaboratorRole(role)) return false;
  return ROLE_CAPABILITIES[role].has(capability);
}

export function capabilitiesForRole(role: string): Capability[] {
  if (!isCollaboratorRole(role)) return [];
  return Array.from(ROLE_CAPABILITIES[role]);
}

// Roles that must not see guest contact details (email, phone) or free-text
// notes: the guest records they receive are cut down to what the job needs.
export function roleSeesGuestContactDetails(role: string): boolean {
  return role === "STAFF" || role === "COORDINATOR" || role === "VIEWER";
}

// Maps an event-scoped request to the capability it needs. `path` is the part
// after /api/events/:eventId (for example "/guests/abc/checkin"). Anything not
// recognised needs owner:only, so a new route is closed to collaborators until
// someone deliberately opens it here.
export function requiredCapability(method: string, path: string): Capability {
  const segments = path.split("/").filter(Boolean);
  const read = method === "GET" || method === "HEAD";
  const [first, second, third] = segments;

  switch (first) {
    case undefined:
      if (read) return "event:view";
      return method === "PUT" || method === "PATCH" ? "event:edit" : "owner:only";
    case "dashboard":
      return read ? "event:view" : "owner:only";
    case "rsvp":
      return read ? "rsvp:read" : "owner:only";
    case "cover-image":
      return read ? "event:view" : "event:edit";
    case "invitation-media":
      return read ? "media:read" : "media:write";
    case "guests": {
      if (second === "checkin" || third === "checkin" || second === "wristbands") return "checkin";
      if (second === "export") return "guests:export";
      if (read && segments.length <= 2) return "guests:read";
      return "guests:write";
    }
    case "seating":
      return read ? "seating:read" : "seating:write";
    case "vendors":
      return read ? "vendors:read" : "vendors:write";
    case "products":
    case "orders":
      return read ? "merch:read" : "merch:write";
    case "ticket-types":
      if (second === "scan") return "checkin";
      return read ? "tickets:read" : "tickets:write";
    default:
      return "owner:only";
  }
}
