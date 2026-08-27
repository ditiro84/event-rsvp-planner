import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { getOwnedEvent } from "../events/events.service";
import { checkInGuestByToken } from "../guests/invite.service";
import { checkInTicketByCode } from "../tickets/ticketTypes.service";

// Owner/admin-managed CRUD -- same reasoning as collaborators.service.ts,
// only the event owner can hand out or revoke a door-check-in pass.

export async function listStaffPasses(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);
  return prisma.eventStaffPass.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createStaffPass(userId: string, eventId: string, name: string) {
  await getOwnedEvent(userId, eventId);
  return prisma.eventStaffPass.create({ data: { eventId, name } });
}

// Soft revoke (active: false) rather than deleting the row, so the pass
// still shows up in the list with a "Revoked" state for a paper trail of
// who had door access and when it was cut off -- see the mid-event
// dismissal use case this exists for. The token stops matching
// getStaffPassContext immediately either way.
export async function revokeStaffPass(userId: string, eventId: string, passId: string) {
  await getOwnedEvent(userId, eventId);
  const pass = await prisma.eventStaffPass.findUnique({ where: { id: passId } });
  if (!pass || pass.eventId !== eventId) {
    throw new NotFoundError("Staff pass not found");
  }
  return prisma.eventStaffPass.update({
    where: { id: passId },
    data: { active: false, revokedAt: new Date() },
  });
}

// --- Public (no-account) side -- mounted at /api/staff, see staffPasses.routes.ts ---

export async function getStaffPassContext(passToken: string) {
  const pass = await prisma.eventStaffPass.findUnique({ where: { token: passToken } });
  if (!pass || !pass.active) {
    throw new NotFoundError("This staff link is no longer active. Ask the event planner for a new one.");
  }
  const event = await prisma.event.findUnique({
    where: { id: pass.eventId },
    select: { id: true, userId: true, name: true, date: true, venueName: true },
  });
  if (!event) {
    throw new NotFoundError("This staff link is no longer active. Ask the event planner for a new one.");
  }
  return { pass, event };
}

export async function staffCheckInGuest(passToken: string, guestInviteToken: string) {
  const { pass, event } = await getStaffPassContext(passToken);
  const guest = await checkInGuestByToken(event.userId, event.id, guestInviteToken, `Staff pass: ${pass.name}`);
  return guest;
}

export async function staffCheckInTicket(passToken: string, code: string) {
  const { pass, event } = await getStaffPassContext(passToken);
  const result = await checkInTicketByCode(event.userId, event.id, code, `Staff pass: ${pass.name}`);
  return result;
}
