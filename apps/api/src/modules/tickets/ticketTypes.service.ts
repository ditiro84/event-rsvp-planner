import { prisma } from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { getOwnedEvent } from "../events/events.service";
import { CreateTicketTypeInput, UpdateTicketTypeInput } from "./ticketTypes.schema";

function toCents(amount: number | null | undefined): number | null | undefined {
  if (amount === null) return null;
  if (amount === undefined) return undefined;
  return Math.round(amount * 100);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTicketType(ticketType: any) {
  const remaining =
    ticketType.quantityTotal === null ? null : Math.max(ticketType.quantityTotal - ticketType.quantitySold, 0);
  return {
    id: ticketType.id,
    eventId: ticketType.eventId,
    name: ticketType.name,
    description: ticketType.description,
    price: ticketType.priceCents / 100,
    currency: ticketType.currency,
    quantityTotal: ticketType.quantityTotal,
    quantitySold: ticketType.quantitySold,
    quantityRemaining: remaining,
    salesStartAt: ticketType.salesStartAt,
    salesEndAt: ticketType.salesEndAt,
    minPerOrder: ticketType.minPerOrder,
    maxPerOrder: ticketType.maxPerOrder,
    sortOrder: ticketType.sortOrder,
    isActive: ticketType.isActive,
    createdAt: ticketType.createdAt,
    updatedAt: ticketType.updatedAt,
  };
}

export async function getOwnedTicketType(userId: string, eventId: string, ticketTypeId: string) {
  await getOwnedEvent(userId, eventId);
  const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
  if (!ticketType || ticketType.eventId !== eventId) {
    throw new NotFoundError("Ticket type not found");
  }
  return ticketType;
}

export async function listTicketTypes(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);
  const ticketTypes = await prisma.ticketType.findMany({ where: { eventId }, orderBy: { sortOrder: "asc" } });
  return ticketTypes.map(serializeTicketType);
}

function validateOrderBounds(input: { minPerOrder?: number; maxPerOrder?: number }) {
  if (input.minPerOrder !== undefined && input.maxPerOrder !== undefined && input.minPerOrder > input.maxPerOrder) {
    throw new BadRequestError("Minimum tickets per order can't be greater than the maximum");
  }
}

export async function createTicketType(userId: string, eventId: string, input: CreateTicketTypeInput) {
  await getOwnedEvent(userId, eventId);
  validateOrderBounds(input);

  // New ticket types are appended to the end of the display order, same
  // convention as LandingService.createService.
  const last = await prisma.ticketType.findFirst({ where: { eventId }, orderBy: { sortOrder: "desc" } });

  const ticketType = await prisma.ticketType.create({
    data: {
      eventId,
      name: input.name,
      description: input.description || null,
      priceCents: toCents(input.price)!,
      currency: input.currency,
      quantityTotal: input.quantityTotal ?? null,
      salesStartAt: input.salesStartAt ?? null,
      salesEndAt: input.salesEndAt ?? null,
      minPerOrder: input.minPerOrder ?? 1,
      maxPerOrder: input.maxPerOrder ?? 10,
      isActive: input.isActive ?? true,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  return serializeTicketType(ticketType);
}

export async function updateTicketType(
  userId: string,
  eventId: string,
  ticketTypeId: string,
  input: UpdateTicketTypeInput
) {
  const existing = await getOwnedTicketType(userId, eventId, ticketTypeId);
  validateOrderBounds({
    minPerOrder: input.minPerOrder ?? existing.minPerOrder,
    maxPerOrder: input.maxPerOrder ?? existing.maxPerOrder,
  });

  // Selling below what's already sold would make quantityRemaining negative
  // -- block it rather than silently oversell/undersell.
  if (input.quantityTotal !== undefined && input.quantityTotal !== null && input.quantityTotal < existing.quantitySold) {
    throw new BadRequestError(
      `Can't set capacity below the ${existing.quantitySold} tickets already sold for this type`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = { ...input };
  delete data.price;
  if ("price" in input) data.priceCents = toCents(input.price);

  const ticketType = await prisma.ticketType.update({ where: { id: ticketTypeId }, data });
  return serializeTicketType(ticketType);
}

export async function deleteTicketType(userId: string, eventId: string, ticketTypeId: string) {
  const existing = await getOwnedTicketType(userId, eventId, ticketTypeId);
  if (existing.quantitySold > 0) {
    throw new BadRequestError(
      "This ticket type has sales on it and can't be deleted -- hide it (set inactive) instead."
    );
  }
  await prisma.ticketType.delete({ where: { id: ticketTypeId } });
}

// Atomically reserves capacity for a set of {ticketTypeId, quantity} items --
// called inside the same transaction that creates a PENDING ticket order
// (see tickets/checkout.service.ts createTicketCheckoutSession), per the
// design note on TicketType.quantitySold in schema.prisma. A single
// UPDATE ... WHERE guard (not a read-then-write) is what makes this
// race-safe under concurrent checkouts for the same ticket type -- two
// buyers racing for the last ticket can't both succeed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function reserveTickets(tx: any, items: { ticketTypeId: string; quantity: number }[]) {
  for (const item of items) {
    const affected: number = await tx.$executeRaw`
      UPDATE ticket_types
      SET "quantitySold" = "quantitySold" + ${item.quantity}
      WHERE id = ${item.ticketTypeId}
        AND "isActive" = true
        AND ("quantityTotal" IS NULL OR "quantityTotal" - "quantitySold" >= ${item.quantity})
    `;
    if (affected === 0) {
      throw new BadRequestError("Not enough tickets remaining for one of the ticket types in your order");
    }
  }
}

// Reverses reserveTickets -- called when a reserved order is later cancelled
// or its checkout session/PayPal capture fails, so the capacity goes back
// on sale instead of leaking away on every abandoned checkout.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function releaseTickets(tx: any, items: { ticketTypeId: string; quantity: number }[]) {
  for (const item of items) {
    await tx.$executeRaw`
      UPDATE ticket_types
      SET "quantitySold" = GREATEST("quantitySold" - ${item.quantity}, 0)
      WHERE id = ${item.ticketTypeId}
    `;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeScannedTicket(ticket: any) {
  return {
    id: ticket.id,
    code: ticket.code,
    status: ticket.status,
    attendeeName: ticket.attendeeName,
    ticketTypeName: ticket.ticketType?.name ?? "Ticket",
    checkedInAt: ticket.checkedInAt,
  };
}

// Door check-in via QR scan of a Ticket's own `code` -- deliberately a
// separate credential from EventInvitation.token (the private RSVP flow's
// wristband QR, see guests/invite.service.ts checkInGuestByToken): ticket
// buyers never go through the guest list at all, so there's no Guest row to
// key off here. Idempotent like the guest scan flow -- re-scanning an
// already-checked-in ticket doesn't error, but the `alreadyCheckedIn` flag
// lets the scan UI flag a possible duplicate/shared ticket to staff.
export async function checkInTicketByCode(userId: string, eventId: string, code: string, checkedInBy?: string) {
  await getOwnedEvent(userId, eventId);

  const ticket = await prisma.ticket.findUnique({ where: { code }, include: { ticketType: true } });
  if (!ticket || ticket.ticketType.eventId !== eventId) {
    throw new NotFoundError("This QR code doesn't match a ticket for this event");
  }
  if (ticket.status === "CANCELLED") {
    throw new BadRequestError("This ticket has been cancelled and can't be used for entry");
  }

  const alreadyCheckedIn = ticket.status === "CHECKED_IN";
  const updated = alreadyCheckedIn
    ? ticket
    : await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "CHECKED_IN", checkedInAt: new Date(), checkedInBy: checkedInBy ?? null },
        include: { ticketType: true },
      });

  return { ticket: serializeScannedTicket(updated), alreadyCheckedIn };
}

export async function reorderTicketTypes(userId: string, eventId: string, orderedIds: string[]) {
  await getOwnedEvent(userId, eventId);

  // Unlike LandingService (a global, admin-only list), ticket types are
  // scoped per-event -- verify every id in the requested order actually
  // belongs to this event before touching anything, so one event's reorder
  // request can't repoint a row that belongs to someone else's event.
  const existing = await prisma.ticketType.findMany({ where: { eventId }, select: { id: true } });
  const existingIds = new Set(existing.map((t) => t.id));
  const allBelongToEvent = orderedIds.every((id) => existingIds.has(id));
  if (!allBelongToEvent) {
    throw new BadRequestError("One or more ticket types don't belong to this event");
  }

  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.ticketType.update({ where: { id }, data: { sortOrder: index } }))
  );
  return listTicketTypes(userId, eventId);
}
