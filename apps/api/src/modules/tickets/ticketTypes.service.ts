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
