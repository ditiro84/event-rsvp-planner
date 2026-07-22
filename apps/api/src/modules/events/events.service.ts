import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { CreateEventInput, UpdateEventInput } from "./events.schema";

// Loads an event and verifies the requesting user owns it.
// Returns NotFound (not Forbidden) for events owned by someone else, so we
// never confirm to an attacker whether a given eventId exists.
export async function getOwnedEvent(userId: string, eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.userId !== userId) {
    throw new NotFoundError("Event not found");
  }
  return event;
}

export async function listEvents(userId: string) {
  return prisma.event.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });
}

export async function createEvent(userId: string, input: CreateEventInput) {
  return prisma.event.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      description: input.description || null,
      date: input.date,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      venueName: input.venueName || null,
      venueAddress: input.venueAddress || null,
      capacity: input.capacity ?? null,
      rsvpDeadline: input.rsvpDeadline ?? null,
      imageUrl: input.imageUrl || null,
      customMessage: input.customMessage || null,
      allowPlusOnes: input.allowPlusOnes ?? true,
      allowPlusOneNames: input.allowPlusOneNames ?? true,
      allowMealSelection: input.allowMealSelection ?? true,
      allowDietary: input.allowDietary ?? true,
      allowAccessibilityInfo: input.allowAccessibilityInfo ?? true,
      allowSpecialRequests: input.allowSpecialRequests ?? true,
    },
  });
}

export async function updateEvent(userId: string, eventId: string, input: UpdateEventInput) {
  await getOwnedEvent(userId, eventId);
  const data: Record<string, unknown> = { ...input };
  if ("imageUrl" in data && data.imageUrl === "") data.imageUrl = null;
  return prisma.event.update({ where: { id: eventId }, data });
}

export async function deleteEvent(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);
  await prisma.event.delete({ where: { id: eventId } });
}

export async function getEventDashboard(userId: string, eventId: string) {
  const event = await getOwnedEvent(userId, eventId);

  const [
    totalGuests,
    confirmed,
    declined,
    pending,
    maybe,
    totalTables,
    assigned,
    vegetarian,
    vegan,
    dietary,
    accessibility,
    checkedIn,
    vip,
  ] = await Promise.all([
    prisma.guest.count({ where: { eventId } }),
    prisma.guest.count({ where: { eventId, rsvpStatus: "CONFIRMED" } }),
    prisma.guest.count({ where: { eventId, rsvpStatus: "DECLINED" } }),
    prisma.guest.count({ where: { eventId, rsvpStatus: "PENDING" } }),
    prisma.guest.count({ where: { eventId, rsvpStatus: "MAYBE" } }),
    prisma.table.count({ where: { eventId } }),
    prisma.seatingAssignment.count({ where: { table: { eventId } } }),
    prisma.guest.count({
      where: { eventId, mealPreference: { contains: "vegetarian", mode: "insensitive" } },
    }),
    prisma.guest.count({
      where: { eventId, mealPreference: { contains: "vegan", mode: "insensitive" } },
    }),
    prisma.guest.count({
      where: { eventId, AND: [{ dietaryRequirements: { not: null } }, { dietaryRequirements: { not: "" } }] },
    }),
    prisma.guest.count({
      where: {
        eventId,
        AND: [{ accessibilityRequirements: { not: null } }, { accessibilityRequirements: { not: "" } }],
      },
    }),
    prisma.guest.count({ where: { eventId, checkedIn: true } }),
    prisma.guest.count({ where: { eventId, isVip: true } }),
  ]);

  const unassignedConfirmed = await prisma.guest.count({
    where: { eventId, rsvpStatus: "CONFIRMED", seatAssignment: null },
  });

  // Expected attendees = confirmed guests + their accompanying party members.
  const partyCountAgg = await prisma.guest.aggregate({
    where: { eventId, rsvpStatus: "CONFIRMED" },
    _sum: { additionalGuestsCount: true },
  });
  const totalExpectedAttendees = confirmed + (partyCountAgg._sum.additionalGuestsCount ?? 0);

  return {
    event,
    stats: {
      totalGuests,
      confirmed,
      declined,
      pending,
      maybe,
      totalExpectedAttendees,
      totalTables,
      assignedGuests: assigned,
      unassignedConfirmedGuests: unassignedConfirmed,
      vegetarian,
      vegan,
      withDietaryRequirements: dietary,
      withAccessibilityRequirements: accessibility,
      checkedIn,
      vip,
    },
  };
}
