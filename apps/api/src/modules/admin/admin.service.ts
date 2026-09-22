import { prisma } from "../../lib/prisma";
import { AuditLogQuery, EditSubscriberInput, EmailEventsQuery, PaymentEventsQuery } from "./admin.schema";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors";

// Cross-subscriber views for support -- unlike everything under
// /api/events/:eventId (which reuses the exact same planner-facing
// endpoints via getOwnedEvent's admin bypass, see events.service.ts), these
// two list views have no owner-scoped equivalent to reuse: a planner only
// ever sees their own users.findMany({ id: userId }) / events.findMany({
// userId }), never a cross-account list.

// Subscribers with at least one real (PAID or MANUAL) order on any of their
// events -- these are the ones hard Delete has to refuse, since deleting the
// subscriber cascades to their events and orders (onDelete: Cascade in
// schema.prisma), which would destroy real transaction/revenue records.
// Archive is unaffected by this -- it never deletes anything.
async function getUserIdsWithPaymentHistory(): Promise<Set<string>> {
  const rows = await prisma.order.findMany({
    where: { status: { in: ["PAID", "MANUAL"] } },
    select: { event: { select: { userId: true } } },
    distinct: ["eventId"],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Set(rows.map((r: any) => r.event.userId));
}

export async function listAllUsers() {
  const [users, paymentUserIds] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        archivedAt: true,
        _count: { select: { events: true } },
      },
    }),
    getUserIdsWithPaymentHistory(),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return users.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    archivedAt: u.archivedAt,
    eventCount: u._count.events,
    // Whether the "permanently delete" action is available for this
    // subscriber -- false once they have any paid/manual order on record,
    // an admin account, or are already archived (archive first, always).
    canHardDelete: u.role !== "ADMIN" && !paymentUserIds.has(u.id),
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


// --- Subscriber management (Admin > Subscribers) ----------------------------
//
// Edit is a plain field patch. Archive/Restore/Delete are more involved --
// see the design notes on User.archivedAt / Event.archivedAt in
// schema.prisma for the overall approach (archive is the safe, reversible
// default; hard delete is only offered when there's no payment history to
// lose).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeAdminAuditLog(adminUserId: string, method: string, summary: string, details?: Record<string, any>) {
  const admin = await prisma.user.findUnique({ where: { id: adminUserId }, select: { email: true } });
  await prisma.adminAuditLog.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { adminUserId, adminEmail: admin?.email ?? "unknown", method, summary, details: details as any },
  });
}

export async function editSubscriber(adminUserId: string, targetUserId: string, input: EditSubscriberInput) {
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError("Subscriber not found");

  if (input.email && input.email.toLowerCase() !== target.email.toLowerCase()) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError("An account with this email already exists");
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { name: input.name, email: input.email },
    select: { id: true, name: true, email: true, role: true, createdAt: true, archivedAt: true },
  });

  await writeAdminAuditLog(adminUserId, "PATCH", `Edited subscriber ${target.email}`, {
    before: { name: target.name, email: target.email },
    after: { name: updated.name, email: updated.email },
  });
  return updated;
}

export async function archiveSubscriber(adminUserId: string, targetUserId: string) {
  if (targetUserId === adminUserId) throw new BadRequestError("You can't archive your own account");

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError("Subscriber not found");
  if (target.role === "ADMIN") throw new BadRequestError("Admin accounts can't be archived");
  if (target.archivedAt) throw new BadRequestError("This subscriber is already archived");

  const archivedAt = new Date();
  const [, eventsArchived] = await prisma.$transaction([
    prisma.user.update({ where: { id: targetUserId }, data: { archivedAt } }),
    // Stamped with the SAME timestamp as the user, not just "now" again, so
    // restoreSubscriber can tell these events apart from one a planner might
    // one day be able to archive individually.
    prisma.event.updateMany({ where: { userId: targetUserId, archivedAt: null }, data: { archivedAt } }),
  ]);

  await writeAdminAuditLog(
    adminUserId,
    "ARCHIVE",
    `Archived subscriber ${target.email} (and their events -- RSVP/ticket pages closed to new activity)`,
    { email: target.email, name: target.name, eventsArchived: eventsArchived.count }
  );
}

export async function restoreSubscriber(adminUserId: string, targetUserId: string) {
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError("Subscriber not found");
  if (!target.archivedAt) throw new BadRequestError("This subscriber isn't archived");

  const [, eventsRestored] = await prisma.$transaction([
    prisma.user.update({ where: { id: targetUserId }, data: { archivedAt: null } }),
    prisma.event.updateMany({
      where: { userId: targetUserId, archivedAt: target.archivedAt },
      data: { archivedAt: null },
    }),
  ]);

  await writeAdminAuditLog(adminUserId, "RESTORE", `Restored subscriber ${target.email}`, {
    email: target.email,
    name: target.name,
    eventsRestored: eventsRestored.count,
  });
}

// Permanent, cascading delete -- refused whenever the subscriber has any
// paid/manual order on record (see getUserIdsWithPaymentHistory above), so
// this is really only ever available for accounts with no real transaction
// history (test accounts, never-used signups, etc). Everything else must go
// through archiveSubscriber instead.
export async function hardDeleteSubscriber(adminUserId: string, targetUserId: string) {
  if (targetUserId === adminUserId) throw new BadRequestError("You can't delete your own account");

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError("Subscriber not found");
  if (target.role === "ADMIN") throw new BadRequestError("Admin accounts can't be deleted");

  const paidOrder = await prisma.order.findFirst({
    where: { status: { in: ["PAID", "MANUAL"] }, event: { userId: targetUserId } },
    select: { id: true },
  });
  if (paidOrder) {
    throw new BadRequestError(
      "This subscriber has paid orders on record, so they can't be permanently deleted -- archive them instead."
    );
  }

  // Counted before the delete below, since the cascade removes these rows
  // too -- this is the only chance to record how much this action actually
  // took with it.
  const eventCount = await prisma.event.count({ where: { userId: targetUserId } });

  // onDelete: Cascade on Event.user (and everything cascading from Event in
  // turn) removes every event, guest, RSVP, order, etc. this subscriber
  // owns in the same operation.
  await prisma.user.delete({ where: { id: targetUserId } });

  await writeAdminAuditLog(adminUserId, "DELETE", `Permanently deleted subscriber ${target.email} (${target.id})`, {
    email: target.email,
    name: target.name,
    createdAt: target.createdAt,
    eventsDeleted: eventCount,
  });
}
