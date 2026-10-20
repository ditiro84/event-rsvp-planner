import type { CollaboratorCapability, EventCollaboratorRole } from "@/types";

// Roles offered when inviting someone. The legacy STAFF role is shown as
// Coordinator (it has the same access) and is not offered for new invites.
export const INVITABLE_ROLES: { value: Exclude<EventCollaboratorRole, "STAFF">; label: string; description: string }[] = [
  {
    value: "COORDINATOR",
    label: "Coordinator",
    description:
      "Manages guests, RSVPs, seating, check-in, vendors, merchandise and tickets. Can't delete the event, connect payouts, or manage the team.",
  },
  {
    value: "CATERER",
    label: "Caterer",
    description: "Sees the guest list (names, meal and dietary needs, no contact details) and the seating plan. Nothing else.",
  },
  {
    value: "DOOR_STAFF",
    label: "Door staff",
    description: "Looks guests up and checks them in at the door. Can't see contact details or change anything else.",
  },
  {
    value: "VIEWER",
    label: "Viewer",
    description: "Read-only view of guests, RSVPs and seating. Never sees money (vendor costs, orders, ticket sales).",
  },
];

export function roleLabel(role: EventCollaboratorRole): string {
  if (role === "STAFF") return "Coordinator";
  return INVITABLE_ROLES.find((r) => r.value === role)?.label ?? role;
}

// capabilities is null for the owner and admins (no limits), and a list for
// an invited collaborator (see permissions.ts on the API).
export function hasCapability(capabilities: CollaboratorCapability[] | null | undefined, capability: CollaboratorCapability) {
  if (!capabilities) return true;
  return capabilities.includes(capability);
}
