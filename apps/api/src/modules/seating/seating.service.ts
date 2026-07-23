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

const tableInclude = {
  seats: {
    orderBy: { seatNumber: "asc" as const },
    include: {
      assignment: {
        include: {
          guest: {
            select: { id: true, firstName: true, lastName: true, rsvpStatus: true, isVip: true },
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
// slated for removal is occupied, that guest is unassigned (not deleted) and
// the caller is told who, so the UI can surface it instead of silently
// dropping a guest's seat.
export async function updateTable(userId: string, eventId: string, tableId: string, input: UpdateTableInput) {
  const table = await getOwnedTable(userId, eventId, tableId);

  let unassignedGuestNames: string[] = [];

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const occupiedSeatsToRemove = seatsToRemove.filter((s: any) => s.assignment);
      unassignedGuestNames = occupiedSeatsToRemove
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((s: any) => `${s.assignment!.guest.firstName} ${s.assignment!.guest.lastName}`);

      if (occupiedSeatsToRemove.length > 0) {
        // Deleting the Seat alone is not enough: Seat -> SeatingAssignment is
        // onDelete: SetNull (from the assignment's side), so the assignment
        // row would survive with seatId cleared but tableId still set --
        // i.e. the guest would stay "seated" at this table with no seat.
        // Delete the assignment outright so the guest actually frees up.
        await prisma.seatingAssignment.deleteMany({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          where: { guestId: { in: occupiedSeatsToRemove.map((s: any) => s.assignment!.guestId) } },
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.seat.deleteMany({ where: { id: { in: seatsToRemove.map((s: any) => s.id) } } });
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
      select: { id: true, firstName: true, lastName: true, additionalGuestsCount: true, isVip: true, mealPreference: true },
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
    include: { seatAssignment: true },
  });
  if (!guest || guest.eventId !== eventId) {
    throw new NotFoundError("Guest not found");
  }

  const table = await prisma.table.findUnique({
    where: { id: input.tableId },
    include: { seats: { include: { assignment: true } } },
  });
  if (!table || table.eventId !== eventId) {
    throw new NotFoundError("Table not found");
  }

  let targetSeat = null as (typeof table.seats)[number] | null;
  if (input.seatId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    targetSeat = table.seats.find((s: any) => s.id === input.seatId) ?? null;
    if (!targetSeat) {
      throw new NotFoundError("Seat not found on this table");
    }
    if (targetSeat.assignment && targetSeat.assignment.guestId !== input.guestId) {
      throw new ConflictError("That seat is already taken");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentAssignedCount = table.seats.filter((s: any) => s.assignment).length;

  const decision = canAssignGuest({
    guestRsvpStatus: guest.rsvpStatus,
    // We always resolve "already seated elsewhere" ourselves by moving the
    // guest (clearing their old assignment) below, so the capacity rule
    // engine only needs to reason about the target table's headcount.
    alreadyAssignedElsewhere: false,
    currentAssignedCount,
    tableCapacity: table.capacity,
    overrideCapacity: input.overrideCapacity,
  });

  if (!decision.allowed) {
    throw new ConflictError(decision.reason);
  }

  if (!targetSeat) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    targetSeat = table.seats.find((s: any) => !s.assignment) ?? null;
    if (!targetSeat && !input.overrideCapacity) {
      throw new ConflictError("No free seats at this table");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignment = await prisma.$transaction(async (tx: any) => {
    // Moving a guest: clear any prior assignment first (guestId is unique on
    // SeatingAssignment, so this is required before creating the new row).
    if (guest.seatAssignment) {
      await tx.seatingAssignment.delete({ where: { guestId: guest.id } });
    }
    return tx.seatingAssignment.create({
      data: {
        guestId: guest.id,
        tableId: table.id,
        seatId: targetSeat?.id ?? null,
      },
      include: { guest: true, table: true, seat: true },
    });
  });

  return { assignment, warning: decision.allowed ? decision.warning : undefined };
}

export async function unassignGuest(userId: string, eventId: string, guestId: string) {
  await getOwnedEvent(userId, eventId);

  const guest = await prisma.guest.findUnique({ where: { id: guestId } });
  if (!guest || guest.eventId !== eventId) {
    throw new NotFoundError("Guest not found");
  }

  const existing = await prisma.seatingAssignment.findUnique({ where: { guestId } });
  if (!existing) {
    throw new BadRequestError("Guest is not currently seated");
  }

  await prisma.seatingAssignment.delete({ where: { guestId } });
}
