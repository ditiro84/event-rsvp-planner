import { prisma } from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { CreateEventInput, UpdateEventInput } from "./events.schema";

const ALLOWED_COVER_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_COVER_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

function slugifyEventName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "event";
}

// Appends -2, -3, ... on collision, same pattern as articles.service.ts's
// ensureUniqueSlug -- names aren't guaranteed unique, but publicSlug must
// be (it's the public ticket page URL, /tickets/:slug).
async function ensureUniqueEventSlug(base: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.event.findUnique({ where: { publicSlug: slug } });
    if (!existing) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

// Loads an event, allowing either the owning planner or an ADMIN (support)
// account through. Returns NotFound (not Forbidden) either way there's no
// access, so we never confirm to an attacker whether a given eventId exists.
//
// This is the single ownership choke point every module (guests, seating,
// vendors, products, orders, payouts, insights, invitation cards) calls
// before touching an event -- so an ADMIN passed in here gets read/write
// access everywhere those modules already allow the owner to act, by
// design (see the admin support-access decision). A short blocklist of
// actions deliberately does NOT use this function and calls
// getOwnedEventStrict instead, so admin access never extends to them
// regardless of role: deleting an event outright (see deleteEvent below),
// and connecting/changing a payout account's financial details (see
// payouts.service.ts connectStripe/connectPaystack/connectPaypal).
export async function getOwnedEvent(userId: string, eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError("Event not found");
  if (event.userId === userId) return event;

  const requester = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (requester?.role === "ADMIN") return event;

  throw new NotFoundError("Event not found");
}

// Owner-only, no admin bypass -- see getOwnedEvent's blocklist note above.
export async function getOwnedEventStrict(userId: string, eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.userId !== userId) {
    throw new NotFoundError("Event not found");
  }
  return event;
}

// Same as getOwnedEvent, but also lets in a registered EventCollaborator
// (staff added to this one event -- see EventCollaborator in schema.prisma).
// Swapped in for getOwnedEvent across the modules staff should be able to
// use day-to-day: guests, RSVP, seating, check-in, vendors, merchandise,
// tickets, insights. Deliberately NOT used by payouts.service.ts (financial
// account access), deleteEvent, or the collaborators/staff-passes module
// itself -- those stay on getOwnedEvent/getOwnedEventStrict so a
// collaborator can never manage money or manage other staff. Collaborator
// access is re-checked from the DB on every call (no caching), so removing
// a collaborator revokes access on their very next request.
export async function getOwnedEventOrCollaborator(userId: string, eventId: string) {
  try {
    return await getOwnedEvent(userId, eventId);
  } catch {
    const collaborator = await prisma.eventCollaborator.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (!collaborator) throw new NotFoundError("Event not found");
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundError("Event not found");
    return event;
  }
}

// Whether this specific user has EventCollaborator (staff) access to this
// event -- deliberately NOT the same thing as "isn't the owner": an admin
// using the support-mode bypass in getOwnedEvent above also isn't the
// owner, but they aren't a collaborator either, and the two need different
// UI treatment (see the "Support view" vs "Staff access" badges in
// DashboardLayout.tsx). Callers that already have a batch of eventIds
// (listEvents below) should check membership in that set instead of calling
// this per-event.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function isUserEventCollaborator(userId: string, eventId: string) {
  // NOTE: typed as `any` -- this sandbox can't run `prisma generate` (see
  // DEPLOYMENT.md), so the locally stubbed PrismaClient type doesn't know
  // about EventCollaborator yet; tightens back up once generated in CI.
  const collaborator = await (prisma as any).eventCollaborator.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  return !!collaborator;
}

export interface EventGuestSummary {
  totalGuests: number;
  confirmed: number;
  pending: number;
  declined: number;
  maybe: number;
  assignedGuests: number;
  totalTables: number;
}

// Lightweight per-event counts for the "My Events" dashboard -- enough to
// show RSVP/seating progress on each card and roll up cross-event totals,
// without each card triggering its own dashboard-style query (this stays
// as three grouped queries total, regardless of how many events the user
// has).
export async function listEvents(userId: string) {
  // Events this user owns, plus events they've been added to as staff (see
  // EventCollaborator) -- collaboratorEventIds is a second query rather
  // than a single OR'd findMany so the "isCollaborator" flag below can be
  // computed cheaply per event without re-deriving it from a join.
  // NOTE: typed as `any` -- this sandbox can't run `prisma generate` (see
  // DEPLOYMENT.md), so the locally stubbed PrismaClient type doesn't know
  // about EventCollaborator yet; tightens back up once generated in CI.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const collaborations = await (prisma as any).eventCollaborator.findMany({
    where: { userId },
    select: { eventId: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const collaboratorEventIds = collaborations.map((c: any) => c.eventId as string);

  const events = await prisma.event.findMany({
    where: collaboratorEventIds.length > 0 ? { OR: [{ userId }, { id: { in: collaboratorEventIds } }] } : { userId },
    orderBy: { date: "asc" },
  });
  if (events.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventIds = events.map((e: any) => e.id);

  const [guests, tableCounts] = await Promise.all([
    prisma.guest.findMany({
      where: { eventId: { in: eventIds } },
      select: { eventId: true, rsvpStatus: true, seatAssignment: { select: { id: true } } },
    }),
    prisma.table.groupBy({
      by: ["eventId"],
      where: { eventId: { in: eventIds } },
      _count: { _all: true },
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableCountByEvent = new Map<string, number>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tableCounts.map((t: any) => [t.eventId as string, t._count._all as number])
  );

  const summaryByEvent = new Map<string, EventGuestSummary>();
  for (const id of eventIds) {
    summaryByEvent.set(id, {
      totalGuests: 0,
      confirmed: 0,
      pending: 0,
      declined: 0,
      maybe: 0,
      assignedGuests: 0,
      totalTables: tableCountByEvent.get(id) ?? 0,
    });
  }
  for (const guest of guests) {
    const summary = summaryByEvent.get(guest.eventId);
    if (!summary) continue;
    summary.totalGuests += 1;
    if (guest.rsvpStatus === "CONFIRMED") summary.confirmed += 1;
    else if (guest.rsvpStatus === "PENDING") summary.pending += 1;
    else if (guest.rsvpStatus === "DECLINED") summary.declined += 1;
    else if (guest.rsvpStatus === "MAYBE") summary.maybe += 1;
    if (guest.seatAssignment) summary.assignedGuests += 1;
  }

  // isCollaborator reflects real EventCollaborator membership, not just
  // "userId !== event.userId" -- that broader check would also be true for
  // an admin viewing another subscriber's event via the support-mode bypass
  // in getOwnedEvent, which is a different thing (see isUserEventCollaborator
  // above).
  const collaboratorEventIdSet = new Set(collaboratorEventIds);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return events.map((event: any) => ({
    ...event,
    isCollaborator: collaboratorEventIdSet.has(event.id),
    guestSummary: summaryByEvent.get(event.id)!,
  }));
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
  const existing = await getOwnedEventOrCollaborator(userId, eventId);
  const data: Record<string, unknown> = { ...input };
  if ("imageUrl" in data && data.imageUrl === "") data.imageUrl = null;

  // Generate publicSlug once, the first time an event goes public -- never
  // overwritten afterward (immutable, same as Article.slug), so the
  // /tickets/:slug URL a planner has already shared stays valid forever.
  if (input.isPublic && !existing.publicSlug) {
    data.publicSlug = await ensureUniqueEventSlug(slugifyEventName(existing.name));
  }

  return prisma.event.update({ where: { id: eventId }, data });
}

export async function uploadEventCoverImage(userId: string, eventId: string, file: UploadedFile) {
  await getOwnedEventOrCollaborator(userId, eventId);

  if (!ALLOWED_COVER_IMAGE_TYPES.has(file.mimetype)) {
    throw new BadRequestError("Cover image must be a PNG, JPEG, or WEBP file");
  }
  if (file.size > MAX_COVER_IMAGE_BYTES) {
    throw new BadRequestError("Cover image must be 5MB or smaller");
  }

  return prisma.event.update({
    where: { id: eventId },
    data: { coverImageData: file.buffer, coverImageMimeType: file.mimetype },
  });
}

// Internal (no auth) -- used by both the authenticated host download route
// and the public ticket-page cover image route.
export async function getEventCoverImageBytes(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { coverImageData: true, coverImageMimeType: true },
  });
  if (!event || !event.coverImageData || !event.coverImageMimeType) {
    throw new NotFoundError("This event has no cover image");
  }
  return { data: event.coverImageData, mimeType: event.coverImageMimeType };
}

export async function deleteEvent(userId: string, eventId: string) {
  await getOwnedEventStrict(userId, eventId);
  await prisma.event.delete({ where: { id: eventId } });
}

export async function getEventDashboard(userId: string, eventId: string) {
  const event = await getOwnedEventOrCollaborator(userId, eventId);

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
