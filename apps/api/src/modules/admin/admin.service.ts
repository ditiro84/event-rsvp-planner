import { prisma } from "../../lib/prisma";
import { AuditLogQuery, EmailEventsQuery, PaymentEventsQuery } from "./admin.schema";

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

export async function getEmailEvents(query: EmailEventsQuery) {
  const events = await prisma.emailEvent.findMany({
    where: {
      eventId: query.eventId,
      status: query.status,
    },
    orderBy: { createdAt: "desc" },
    take: query.limit,
    include: {
      event: { select: { name: true } },
    },
  });
  return events.map((e) => ({
    id: e.id,
    eventId: e.eventId,
    eventName: e.event?.name ?? null,
    guestId: e.guestId,
    recipientEmail: e.recipientEmail,
    recipientName: e.recipientName,
    subject: e.subject,
    status: e.status,
    errorMessage: e.errorMessage,
    createdAt: e.createdAt,
  }));
}

// --- Platform-wide analytics ------------------------------------------------
//
// Unlike getAuditLog/getPaymentEvents above (per-event, filterable), this is
// a single cross-subscriber rollup for the Admin > Analytics tab: platform
// totals plus a 30-day trend of signups and events created. Revenue is kept
// as a currency/provider breakdown rather than one blended total -- summing
// cents across USD/GBP/NGN would be meaningless (they're not the same unit
// of value), so there is deliberately no single "total revenue" number.

interface TrendRow {
  day: Date;
  signups: number;
  events: number;
}

async function getSignupsAndEventsTrend(days: number): Promise<{ date: string; signups: number; events: number }[]> {
  // Postgres generate_series backfills every day in the window (including
  // zero-activity days) so the chart has no gaps -- LEFT JOIN counts per day
  // from users/events, defaulting to 0 where there's no match.
  // make_interval(days => n) rather than string-concatenating an interval
  // literal -- avoids any ambiguity in how Postgres resolves `int || text`.
  const rows = await prisma.$queryRaw<TrendRow[]>`
    SELECT
      gs::date AS day,
      COALESCE(u.count, 0)::int AS signups,
      COALESCE(e.count, 0)::int AS events
    FROM generate_series((CURRENT_DATE - make_interval(days => ${days - 1}::int)), CURRENT_DATE, '1 day') AS gs
    LEFT JOIN (
      SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*) AS count
      FROM "users"
      WHERE "createdAt" >= CURRENT_DATE - make_interval(days => ${days - 1}::int)
      GROUP BY 1
    ) u ON u.day = gs::date
    LEFT JOIN (
      SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*) AS count
      FROM "events"
      WHERE "createdAt" >= CURRENT_DATE - make_interval(days => ${days - 1}::int)
      GROUP BY 1
    ) e ON e.day = gs::date
    ORDER BY gs;
  `;
  return rows.map((r) => ({ date: new Date(r.day).toISOString().slice(0, 10), signups: r.signups, events: r.events }));
}

export async function getPlatformAnalytics() {
  const [totalSubscribers, totalEvents, totalGuests, rsvpConfirmed, totalOrdersPaid, revenueGroups, trend] =
    await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.guest.count(),
      prisma.guest.count({ where: { rsvpStatus: "CONFIRMED" } }),
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.order.groupBy({
        by: ["currency", "provider"],
        where: { status: "PAID" },
        _sum: { totalCents: true, platformFeeCents: true },
        _count: { _all: true },
      }),
      getSignupsAndEventsTrend(30),
    ]);

  const revenueByCurrencyAndProvider = revenueGroups
    .map((g) => ({
      currency: g.currency,
      provider: g.provider,
      orderCount: g._count._all,
      totalRevenue: (g._sum.totalCents ?? 0) / 100,
      platformFee: (g._sum.platformFeeCents ?? 0) / 100,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  return {
    totalSubscribers,
    totalEvents,
    totalGuests,
    rsvpConfirmed,
    confirmationRate: totalGuests > 0 ? rsvpConfirmed / totalGuests : 0,
    totalOrdersPaid,
    revenueByCurrencyAndProvider,
    trend,
  };
}
