import { roleSeesGuestContactDetails } from "../collaborators/permissions";

// Cuts a guest record down for roles that shouldn't see contact details or
// private notes (caterer, door staff). Owners, admins, coordinators and
// viewers (collaboratorRole undefined or allowed) get the record unchanged.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function redactGuestForRole<T extends Record<string, any>>(guest: T, collaboratorRole?: string): T {
  if (!collaboratorRole || roleSeesGuestContactDetails(collaboratorRole)) return guest;
  return { ...guest, email: null, phone: null, specialNotes: null };
}
