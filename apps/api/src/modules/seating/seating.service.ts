import { prisma } from "../../lib/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors";
import { getOwnedEvent } from "../events/events.service";
import { canAssignGuest } from "../../utils/capacity";
import {
  AssignGuestInput,
  CreateLayoutObjectInput,
  CreateTableInput,
  UpdateLayoutInput,
  UpdateLayoutObjectInput,
  UpdateTableInput,
} from "./seating.schema";

// ---------------------------------------------------------------------------
// Venue layout (canvas settings + decor objects)
// ---------------------------------------------------------------------------

export async function getOrCreateLayout(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);

  let layout = await prisma.venueLayout.findUnique({
    where: { eventId },
    include: { objects: { orderBy: { createdAt: "asc" } } },
  });

  if (!layout) {
    layout = await prisma.venueLayout.create({
      data: { eventId },
      include: { objects: { orderBy: { createdAt: "asc" } } },
    });
  }

  return layout;
}

export async function updateLayout(userId: string, eventId: string, input: UpdateLayoutInput) {
  const layout = await getOrCreateLayout(userId, eventId);
  return prisma.venueLayout.update({
    where: { id: layout.id },
    data: input,
    include: { objects: { orderBy: { createdAt: "asc" } } },
  });
}

export async function createLayoutObject(userId: string, eventId: string, input: CreateLayoutObjectInput) {
  const layout = await getOrCreateLayout(userId, eventId);
  return prisma.layoutObject.create({
    data: { ...input, venueLayoutId: layout.id },
  });
}

async function getOwnedLayoutObject(userId: string, eventId: string, objectId: string) {
  await getOwnedEvent(userId, eventId);
  const object = await prisma.layoutObject.findUnique({
    where: { id: objectId },
    include: { venueLayout: true },
  });
  if (!object || object.venueLayout.eventId !== eventId) {
    throw new NotFoundError("Layout object not found");
  }
  return object;
}

export async function updateLayoutObject(
  userId: string,
  eventId: string,
  objectId: string,
  input: UpdateLayoutObjectInput
) {
  await getOwnedLayoutObject(userId, eventId, objectId);
  return prisma.layoutObject.update({ where: { id: objectId }, data: input });
}

export async function deleteLayoutObject(userId: string, eventId: string, objectId: string) {
  await getOwnedLayoutObject(userId, eventId, objectId);
  await prisma.layoutObject.delete({ where: { id: objectId } });
}

// ---------------------------------------------------------------------------
// Tables & seats
// ---------------------------------------------------------------------------

// Each seat holds at most one of: a real guest's assignment, or a named
// party member's ("+1"'s) own assignment. Both are real rows now -- a
// guest's accompanying names each get their own seat, so table occupancy is
// simply "how many seats have either kind of assignment," no derived math.
const tableInclude = {
  seats: {
    orderBy: { seatNumber: "asc" as const },
    include: {
      assignment: {
        include: {
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              rsvpStatus: true,
              isVip: true,
              additionalGuestsCount: true,
            },
          },
        },
      },
      partyAssignment: {
        include: {
          partyMember: {
            select: { id: true, fullName: true, guestId: true },
          },
        },
      },
    },
  },
};

export async function listTables(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);
  return prisma.table.findMany({
    where: { eventId },
    include: tableInclude,
    orderBy: { createdAt: "asc" },
  });
}

export async function getOwnedTable(userId: string, eventId: string, tableId: string) {
  await getOwnedEvent(userId, eventId);
  const table = await prisma.table.findUnique({ where: { id: tableId }, include: tableInclude });
  if (!table || table.eventId !== eventId) {
    throw new NotFoundError("Table not found");
  }
  return table;
}

export async function createTable(userId: string, eventId: string, input: CreateTableInput) {
  await getOwnedEvent(userId, eventId);
  return prisma.table.create({
    data: {
      eventId,
      name: input.name,
      shape: input.shape,
      capacity: input.capacity,
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      rotation: input.rotation,
      seats: {
        create: Array.from({ length: input.capacity }, (_, i) => ({ seatNumber: i + 1 })),
      },
    },
    include: tableInclude,
  });
}

// Reconciles the table's seat rows with a new capacity: grows by appending
// seats, shrinks by removing the highest-numbered seats first. If a seat
// slated for removal is occupied -- by a guest or by one of their named
// party members -- that guest's *entire* party is unassigned as a unit (not
// deleted), and the caller is told who, so the UI can surface it instead of
// silently dropping someone's seat or leaving a party half-seated.
export async function updateTable(userId: string, eventId: string, tableId: string, input: UpdateTableInput) {
  const table = await getOwnedTable(userId, eventId, tableId);

  const unassignedGuestNames: string[] = [];

  if (input.capacity !== undefined && input.capacity !== table.capacity) {
    const currentCount = table.seats.length;
    if (input.capacity > currentCount) {
      await prisma.seat.createMany({
        data: Array.from({ length: input.capacity - currentCount }, (_, i) => ({
          tableId,
          seatNumber: currentCount + i + 1,
        })),
      });
    } else if (input.capacity < currentCount) {
      const seatsToRemove = table.seats
        .slice()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => b.seatNumber - a.seatNumber)
        .slice(0, currentCount - input.capacity);

      const guestIdsToUnseat = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const seat of seatsToRemove as any[]) {
        if (seat.assignment) {
          guestIdsToUnseat.add(seat.assignment.guestId);
          unassignedGuestNames.push(`${seat.assignment.guest.firstName} ${seat.assignment.guest.lastName}`);
        }
        if (seat.partyAssignment) {
          guestIdsToUnseat.add(seat.partyAssignment.partyMember.guestId);
          unassignedGuestNames.push(seat.partyAssignment.partyMember.fullName);
        }
      }

      if (guestIdsToUnseat.size > 0) {
        // Deleting the Seat alone is not enough: Seat -> (Party)SeatingAssignment
        // is onDelete: SetNull, so the assignment row would survive with
        // seatId cleared but tableId still set -- i.e. still "seated" with no
        // seat. Delete the assignments outright so the whole party frees up.
        const guestIds = Array.from(guestIdsToUnseat);
        await prisma.seatingAssignment.deleteMany({ where: { guestId: { in: guestIds } } });
        await prisma.partySeatingAssignment.deleteMany({
          where: { partyMember: { guestId: { in: guestIds } } },
        });
      }

      await prisma.seat.deleteMany({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: { in: (seatsToRemove as any[]).map((s) => s.id) } },
      });
    }
  }

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: {
      name: input.name,
      shape: input.shape,
      capacity: input.capacity,
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      rotation: input.rotation,
    },
    include: tableInclude,
  });

  return { table: updated, unassignedGuestNames };
}

export async function deleteTable(userId: string, eventId: string, tableId: string) {
  await getOwnedTable(userId, eventId, tableId);
  await prisma.table.delete({ where: { id: tableId } });
}

// ---------------------------------------------------------------------------
// Full seating map (layout + tables + unassigned confirmed guests)
// ---------------------------------------------------------------------------

export async function getSeatingMap(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);

  const [layout, tables, unassignedGuests] = await Promise.all([
    getOrCreateLayout(userId, eventId),
    prisma.table.findMany({ where: { eventId }, include: tableInclude, orderBy: { createdAt: "asc" } }),
    prisma.guest.findMany({
      where: { eventId, rsvpStatus: "CONFIRMED", seatAssignment: null },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        additionalGuestsCount: true,
        isVip: true,
        mealPreference: true,
        party: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  return { layout, tables, unassignedGuests };
}

// ---------------------------------------------------------------------------
// Seating assignments
// ---------------------------------------------------------------------------

export async function assignGuest(userId: string, eventId: string, input: AssignGuestInput) {
  await getOwnedEvent(userId, eventId);

  const guest = await prisma.guest.findUnique({
    where: { id: input.guestId },
    include: { seatAssignment: true, party: { include: { seatAssignment: true } } },
  });
  if (!guest || guest.eventId !== eventId) {
    throw new NotFoundError("Guest not found");
  }

  const table = await prisma.table.findUnique({
    where: { id: input.tableId },
    include: tableInclude,
  });
  if (!table || table.eventId !== eventId) {
    throw new NotFoundError("Table not found");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seats = table.seats as any[];

  // "Free for this move": nobody's sitting there, OR it's already held by
  // this exact guest or one of their own party members -- we're about to
  // replace their whole party's placement below, so their current seats
  // don't count against them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isFreeForThisMove = (seat: any) => {
    const heldByThisGuest = seat.assignment && seat.assignment.guestId === guest.id;
    const heldByThisGuestsParty = seat.partyAssignment && seat.partyAssignment.partyMember.guestId === guest.id;
    return (!seat.assignment && !seat.partyAssignment) || heldByThisGuest || heldByThisGuestsParty;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let anchorSeat: any = null;
  if (input.seatId) {
    anchorSeat = seats.find((s) => s.id === input.seatId) ?? null;
    if (!anchorSeat) {
      throw new NotFoundError("Seat not found on this table");
    }
    if (!isFreeForThisMove(anchorSeat)) {
      throw new ConflictError("That seat is already taken");
    }
  }

  const partySize = 1 + guest.party.length;
  const freeSeats = seats.filter(isFreeForThisMove);
  const currentAssignedCount = seats.length - freeSeats.length;

  const decision = canAssignGuest({
    guestRsvpStatus: guest.rsvpStatus,
    // We always resolve "already seated elsewhere" ourselves by moving the
    // guest (clearing their old assignment) below, so the capacity rule
    // engine only needs to reason about the target table's headcount.
    alreadyAssignedElsewhere: false,
    currentAssignedCount,
    tableCapacity: table.capacity,
    overrideCapacity: input.overrideCapacity,
    partySize,
  });

  if (!decision.allowed) {
    throw new ConflictError(decision.reason);
  }

  if (!anchorSeat) {
    anchorSeat = freeSeats[0] ?? null;
    if (!anchorSeat && !input.overrideCapacity) {
      throw new ConflictError("No free seats at this table");
    }
  }

  // Give each named party member their own seat, picked from the seats
  // nearest the guest's anchor seat (searching outward by seat number,
  // alternating +1/-1, wrapping around the table) so the party reads as
  // sitting together instead of scattered.
  const partySeatIds: (string | null)[] = [];
  if (anchorSeat) {
    const n = seats.length;
    const anchorIndex = seats.findIndex((s) => s.id === anchorSeat.id);
    const claimed = new Set<string>([anchorSeat.id]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stillFree = (seat: any) => isFreeForThisMove(seat) && !claimed.has(seat.id);

    for (let i = 0; i < guest.party.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let picked: any = null;
      for (let dist = 1; dist < n && !picked; dist++) {
        for (const dir of [1, -1]) {
          const idx = (((anchorIndex + dir * dist) % n) + n) % n;
          const candidate = seats[idx];
          if (stillFree(candidate)) {
            picked = candidate;
            break;
          }
        }
      }
      if (picked) claimed.add(picked.id);
      partySeatIds.push(picked ? picked.id : null);
    }
  } else {
    for (let i = 0; i < guest.party.length; i++) partySeatIds.push(null);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignment = await prisma.$transaction(async (tx: any) => {
    // Moving a guest: clear any prior assignment first (guestId is unique on
    // SeatingAssignment, so this is required before creating the new row).
    // Same for each party member's own assignment.
    if (guest.seatAssignment) {
      await tx.seatingAssignment.delete({ where: { guestId: guest.id } });
    }
    if (guest.party.length > 0) {
      await tx.partySeatingAssignment.deleteMany({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { partyMemberId: { in: guest.party.map((p: any) => p.id) } },
      });
    }

    const created = await tx.seatingAssignment.create({
      data: { guestId: guest.id, tableId: table.id, seatId: anchorSeat?.id ?? null },
      include: { guest: true, table: true, seat: true },
    });

    for (let i = 0; i < guest.party.length; i++) {
      await tx.partySeatingAssignment.create({
        data: {
          partyMemberId: guest.party[i].id,
          tableId: table.id,
          seatId: partySeatIds[i],
        },
      });
    }

    return created;
  });

  return { assignment, partySize, warning: decision.allowed ? decision.warning : undefined };
}

// Unassigns a guest AND every named party member that came with them --
// they were seated together as a unit, so they're freed together too.
export async function unassignGuest(userId: string, eventId: string, guestId: string) {
  await getOwnedEvent(userId, eventId);

  const guest = await prisma.guest.findUnique({ where: { id: guestId }, include: { party: true } });
  if (!guest || guest.eventId !== eventId) {
    throw new NotFoundError("Guest not found");
  }

  const existing = await prisma.seatingAssignment.findUnique({ where: { guestId } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partyMemberIds = guest.party.map((p: any) => p.id);
  const partySeatedCount = partyMemberIds.length
    ? await prisma.partySeatingAssignment.count({ where: { partyMemberId: { in: partyMemberIds } } })
    : 0;

  if (!existing && partySeatedCount === 0) {
    throw new BadRequestError("Guest is not currently seated");
  }

  if (existing) {
    await prisma.seatingAssignment.delete({ where: { guestId } });
  }
  if (partyMemberIds.length > 0) {
    await prisma.partySeatingAssignment.deleteMany({ where: { partyMemberId: { in: partyMemberIds } } });
  }
}

// Unassigns a single named party member's seat, leaving the primary guest
// and any other party members seated where they are.
export async function unassignPartyMember(userId: string, eventId: string, partyMemberId: string) {
  await getOwnedEvent(userId, eventId);

  const member = await prisma.guestParty.findUnique({
    where: { id: partyMemberId },
    include: { guest: true },
  });
  if (!member || member.guest.eventId !== eventId) {
    throw new NotFoundError("Party member not found");
  }

  const existing = await prisma.partySeatingAssignment.findUnique({ where: { partyMemberId } });
  if (!existing) {
    throw new BadRequestError("This guest is not currently seated");
  }

  await prisma.partySeatingAssignment.delete({ where: { partyMemberId } });
}
