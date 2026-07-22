import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { getOwnedEvent } from "../events/events.service";
import { shouldReleaseSeatOnStatusChange } from "../../utils/rsvpMath";
import { CreateGuestInput, ListGuestsQuery, UpdateGuestInput } from "./guests.schema";

export async function getOwnedGuest(userId: string, guestId: string) {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: { event: true, seatAssignment: { include: { table: true, seat: true } } },
  });
  if (!guest || guest.event.userId !== userId) {
    throw new NotFoundError("Guest not found");
  }
  return guest;
}

export async function listGuests(userId: string, eventId: string, query: ListGuestsQuery) {
  await getOwnedEvent(userId, eventId);

  // NOTE: typed as `any` here because this sandbox could not run `prisma generate`
  // (see DEPLOYMENT.md); once generated, this can be tightened back to Prisma.GuestWhereInput.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { eventId };

  if (query.search) {
    const term = query.search.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { groupName: { contains: term, mode: "insensitive" } },
    ];
  }
  if (query.status) where.rsvpStatus = query.status;
  if (query.assigned === "true") where.seatAssignment = { isNot: null };
  if (query.assigned === "false") where.seatAssignment = { is: null };
  if (query.checkedIn === "true") where.checkedIn = true;
  if (query.checkedIn === "false") where.checkedIn = false;
  if (query.vip === "true") where.isVip = true;
  if (query.dietary === "true") {
    where.AND = [{ dietaryRequirements: { not: null } }, { dietaryRequirements: { not: "" } }];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderBy: any[] = (() => {
    const dir = query.sortDir ?? "asc";
    switch (query.sortBy) {
      case "rsvpStatus":
        return [{ rsvpStatus: dir }];
      case "createdAt":
        return [{ createdAt: dir }];
      default:
        return [{ lastName: dir }, { firstName: dir }];
    }
  })();

  const guests = await prisma.guest.findMany({
    where,
    orderBy,
    include: { seatAssignment: { include: { table: true, seat: true } }, party: true },
  });

  return guests;
}

export async function createGuest(userId: string, eventId: string, input: CreateGuestInput) {
  await getOwnedEvent(userId, eventId);
  return prisma.guest.create({
    data: {
      eventId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email || null,
      phone: input.phone || null,
      groupName: input.groupName || null,
      rsvpStatus: input.rsvpStatus ?? "PENDING",
      additionalGuestsCount: input.additionalGuestsCount ?? 0,
      mealPreference: input.mealPreference || null,
      dietaryRequirements: input.dietaryRequirements || null,
      accessibilityRequirements: input.accessibilityRequirements || null,
      specialNotes: input.specialNotes || null,
      isVip: input.isVip ?? false,
    },
  });
}

export async function updateGuest(userId: string, guestId: string, input: UpdateGuestInput) {
  const existing = await getOwnedGuest(userId, guestId);
  const data: Record<string, unknown> = { ...input };
  if ("email" in data && data.email === "") data.email = null;

  const updated = await prisma.guest.update({ where: { id: guestId }, data });

  // If a guest is moved away from CONFIRMED, free their seat automatically.
  if (shouldReleaseSeatOnStatusChange(existing.rsvpStatus, updated.rsvpStatus)) {
    await prisma.seatingAssignment.deleteMany({ where: { guestId } });
  }

  return updated;
}

export async function deleteGuest(userId: string, guestId: string) {
  await getOwnedGuest(userId, guestId);
  await prisma.guest.delete({ where: { id: guestId } });
}

export async function bulkCreateGuests(
  userId: string,
  eventId: string,
  rows: CreateGuestInput[]
) {
  await getOwnedEvent(userId, eventId);
  const result = await prisma.$transaction(
    rows.map((row) =>
      prisma.guest.create({
        data: {
          eventId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email || null,
          phone: row.phone || null,
          groupName: row.groupName || null,
          rsvpStatus: row.rsvpStatus ?? "PENDING",
          additionalGuestsCount: row.additionalGuestsCount ?? 0,
          mealPreference: row.mealPreference || null,
          dietaryRequirements: row.dietaryRequirements || null,
          accessibilityRequirements: row.accessibilityRequirements || null,
          specialNotes: row.specialNotes || null,
          isVip: row.isVip ?? false,
        },
      })
    )
  );
  return result;
}

export async function getGuestsForExport(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);
  return prisma.guest.findMany({
    where: { eventId },
    include: { seatAssignment: { include: { table: true, seat: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}
