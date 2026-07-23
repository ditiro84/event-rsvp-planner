import { prisma } from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { getOwnedEvent } from "../events/events.service";
import { SubmitRsvpInput } from "./rsvp.schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkRsvpIsOpen(event: any) {
  const deadlinePassed = event.rsvpDeadline ? new Date() > event.rsvpDeadline : false;
  if (!event.rsvpOpen || deadlinePassed) {
    throw new BadRequestError("RSVPs are closed for this event");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function publicEventShape(event: any) {
  const deadlinePassed = event.rsvpDeadline ? new Date() > event.rsvpDeadline : false;
  const cardCount = await prisma.eventInvitationCard.count({ where: { eventId: event.id } });
  return {
    id: event.id,
    name: event.name,
    type: event.type,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    imageUrl: event.imageUrl,
    customMessage: event.customMessage,
    rsvpOpen: event.rsvpOpen && !deadlinePassed,
    rsvpDeadline: event.rsvpDeadline,
    allowPlusOnes: event.allowPlusOnes,
    allowPlusOneNames: event.allowPlusOneNames,
    allowMealSelection: event.allowMealSelection,
    allowDietary: event.allowDietary,
    allowAccessibilityInfo: event.allowAccessibilityInfo,
    allowSpecialRequests: event.allowSpecialRequests,
    hasInvitationCard: cardCount > 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function guestUpdateData(input: SubmitRsvpInput) {
  const email = input.email?.trim().toLowerCase() || null;
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    email: email ?? undefined,
    phone: input.phone || undefined,
    rsvpStatus: input.attending,
    rsvpRespondedAt: new Date(),
    additionalGuestsCount: input.attending === "CONFIRMED" ? input.additionalGuestsCount : 0,
    mealPreference: input.mealPreference || undefined,
    dietaryRequirements: input.dietaryRequirements || undefined,
    accessibilityRequirements: input.accessibilityRequirements || undefined,
    specialNotes: input.message || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function replacePartyMembers(tx: any, guestId: string, input: SubmitRsvpInput) {
  await tx.guestParty.deleteMany({ where: { guestId } });
  if (input.attending === "CONFIRMED" && input.additionalGuestNames.length > 0) {
    await tx.guestParty.createMany({
      data: input.additionalGuestNames.map((fullName) => ({ guestId, fullName })),
    });
  }
}

// Only the minimum information needed to render the public RSVP page.
export async function getPublicEventByToken(token: string) {
  const event = await prisma.event.findUnique({ where: { rsvpToken: token } });
  if (!event) {
    throw new NotFoundError("This RSVP link is invalid");
  }
  return publicEventShape(event);
}

export async function submitRsvp(token: string, input: SubmitRsvpInput) {
  const event = await prisma.event.findUnique({ where: { rsvpToken: token } });
  if (!event) {
    throw new NotFoundError("This RSVP link is invalid");
  }
  checkRsvpIsOpen(event);

  const email = input.email?.trim().toLowerCase() || null;

  // Try to match an existing invited guest by email, then by exact name,
  // so planner-added guests get updated rather than duplicated.
  let guest = email
    ? await prisma.guest.findFirst({ where: { eventId: event.id, email } })
    : null;

  if (!guest) {
    guest = await prisma.guest.findFirst({
      where: {
        eventId: event.id,
        firstName: { equals: input.firstName, mode: "insensitive" },
        lastName: { equals: input.lastName, mode: "insensitive" },
      },
    });
  }

  const guestData = guestUpdateData(input);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const savedGuest = await prisma.$transaction(async (tx: any) => {
    const g = guest
      ? await tx.guest.update({ where: { id: guest.id }, data: guestData })
      : await tx.guest.create({ data: { eventId: event.id, ...guestData } });

    await replacePartyMembers(tx, g.id, input);

    // Confirmed party members lost their seat if the guest un-confirms.
    if (g.rsvpStatus !== "CONFIRMED") {
      await tx.seatingAssignment.deleteMany({ where: { guestId: g.id } });
    }

    return g;
  });

  return savedGuest;
}

// Personalized invite flow: resolves straight from a per-guest invitation
// token (sent via QR code / email / WhatsApp), so there's no ambiguity
// about which guest this is -- no name/email fuzzy matching needed.
export async function getInvitePrefill(invitationToken: string) {
  const invitation = await prisma.eventInvitation.findUnique({
    where: { token: invitationToken },
    include: { event: true, guest: true },
  });
  if (!invitation || !invitation.guest) {
    throw new NotFoundError("This invite link is invalid");
  }

  return {
    event: await publicEventShape(invitation.event),
    guestPrefill: {
      firstName: invitation.guest.firstName,
      lastName: invitation.guest.lastName,
      email: invitation.guest.email,
      phone: invitation.guest.phone,
    },
  };
}

export async function submitRsvpViaInvitation(invitationToken: string, input: SubmitRsvpInput) {
  const invitation = await prisma.eventInvitation.findUnique({
    where: { token: invitationToken },
    include: { event: true, guest: true },
  });
  if (!invitation || !invitation.guest) {
    throw new NotFoundError("This invite link is invalid");
  }
  checkRsvpIsOpen(invitation.event);

  const guestId = invitation.guest.id;
  const guestData = guestUpdateData(input);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const savedGuest = await prisma.$transaction(async (tx: any) => {
    const g = await tx.guest.update({ where: { id: guestId }, data: guestData });
    await replacePartyMembers(tx, g.id, input);
    if (g.rsvpStatus !== "CONFIRMED") {
      await tx.seatingAssignment.deleteMany({ where: { guestId: g.id } });
    }
    return g;
  });

  return savedGuest;
}

export async function getRsvpDashboard(userId: string, eventId: string) {
  const event = await getOwnedEvent(userId, eventId);

  const [confirmed, declined, pending, maybe] = await Promise.all([
    prisma.guest.count({ where: { eventId, rsvpStatus: "CONFIRMED" } }),
    prisma.guest.count({ where: { eventId, rsvpStatus: "DECLINED" } }),
    prisma.guest.count({ where: { eventId, rsvpStatus: "PENDING" } }),
    prisma.guest.count({ where: { eventId, rsvpStatus: "MAYBE" } }),
  ]);

  const nonResponders = await prisma.guest.findMany({
    where: { eventId, rsvpStatus: "PENDING" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  });

  const partyCountAgg = await prisma.guest.aggregate({
    where: { eventId, rsvpStatus: "CONFIRMED" },
    _sum: { additionalGuestsCount: true },
  });

  return {
    rsvpOpen: event.rsvpOpen,
    rsvpDeadline: event.rsvpDeadline,
    rsvpLink: `${event.rsvpToken}`,
    stats: {
      totalInvited: confirmed + declined + pending + maybe,
      confirmed,
      declined,
      pending,
      maybe,
      totalExpectedAttendees: confirmed + (partyCountAgg._sum.additionalGuestsCount ?? 0),
    },
    nonResponders,
  };
}
