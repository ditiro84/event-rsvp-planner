import { prisma } from "../../lib/prisma";
import { AuditLogQuery, PaymentEventsQuery } from "./admin.schema";

// Cross-subscriber views for support -- unlike everything under
// /api/events/:eventId (which reuses the exact same planner-facing
// endpoints via getOwnedEvent's admin bypass, see events.service.ts), these
// two list views have no owner-scoped equivalent to reuse: a planner only
// ever sees their own users.findMany({ id: userId }) / events.findMany({
// userId }), never a cross-account list.

export async function listAllUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { events: true } },
    },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    eventCount: u._count.events,
  }));
}

export async function listAllEvents() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      date: true,
      createdAt: true,
      userId: true,
      user: { select: { name: true, email: true } },
      _count: { select: { guests: true, orders: true } },
    },
  });
  return events.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    date: e.date,
    createdAt: e.createdAt,
    owner: { id: e.userId, name: e.user.name, email: e.user.email },
    guestCount: e._count.guests,
    orderCount: e._count.orders,
  }));
}

export async function getAuditLog(query: AuditLogQuery) {
  return prisma.adminAuditLog.findMany({
    where: {
      eventId: query.eventId,
      adminUserId: query.adminUserId,
    },
    orderBy: { createdAt: "desc" },
    take: query.limit,
  });
}

export async function getPaymentEvents(query: PaymentEventsQuery) {
  const events = await prisma.paymentEvent.findMany({
    where: {
      eventId: query.eventId,
      orderId: query.orderId,
      status: query.status,
      provider: query.provider,
    },
    orderBy: { createdAt: "desc" },
    take: query.limit,
    include: {
      order: { select: { guestName: true, guestEmail: true, status: true } },
      event: { select: { name: true } },
    },
  });
  return events.map((e) => ({
    id: e.id,
    eventId: e.eventId,
    eventName: e.event?.name ?? null,
    orderId: e.orderId,
    guestName: e.order?.guestName ?? null,
    guestEmail: e.order?.guestEmail ?? null,
    orderStatus: e.order?.status ?? null,
    provider: e.provider,
    type: e.type,
    status: e.status,
    amount: e.amountCents !== null ? e.amountCents / 100 : null,
    currency: e.currency,
    message: e.message,
    rawPayload: e.rawPayload,
    createdAt: e.createdAt,
  }));
}
