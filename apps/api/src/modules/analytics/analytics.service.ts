import { prisma } from "../../lib/prisma";

// Cross-event aggregate stats for the planner's Analytics page. Everything
// here is derived from existing Event/Guest/Table/Vendor rows -- there is
// no separate metrics/snapshot table, so figures always reflect current
// data (no historical trend lines yet; that would need periodic snapshots,
// which is a bigger addition than this MVP scope).
export async function getAnalyticsOverview(userId: string) {
  const events = await prisma.event.findMany({
    where: { userId },
    select: { id: true, name: true, date: true },
    orderBy: { date: "asc" },
  });

  if (events.length === 0) {
    return {
      totalEvents: 0,
      upcomingEvents: 0,
      pastEvents: 0,
      totalGuests: 0,
      confirmed: 0,
      declined: 0,
      pending: 0,
      maybe: 0,
      confirmationRate: 0,
      responseRate: 0,
      checkedIn: 0,
      checkInRate: 0,
      totalVendors: 0,
      vendorsBooked: 0,
      totalVendorSpend: 0,
      byEvent: [],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventIds = events.map((e: any) => e.id);
  const now = new Date();

  const [guests, vendors] = await Promise.all([
    prisma.guest.findMany({
      where: { eventId: { in: eventIds } },
      select: { eventId: true, rsvpStatus: true, checkedIn: true },
    }),
    prisma.vendor.findMany({
      where: { eventId: { in: eventIds } },
      select: { eventId: true, status: true, costCents: true },
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const guestsByEvent = new Map<string, any[]>();
  for (const g of guests) {
    if (!guestsByEvent.has(g.eventId)) guestsByEvent.set(g.eventId, []);
    guestsByEvent.get(g.eventId)!.push(g);
  }

  let totalGuests = 0;
  let confirmed = 0;
  let declined = 0;
  let pending = 0;
  let maybe = 0;
  let checkedIn = 0;
  let upcomingEvents = 0;
  let pastEvents = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byEvent = events.map((event: any) => {
    const eventGuests = guestsByEvent.get(event.id) ?? [];
    const eConfirmed = eventGuests.filter((g) => g.rsvpStatus === "CONFIRMED").length;
    const eDeclined = eventGuests.filter((g) => g.rsvpStatus === "DECLINED").length;
    const ePending = eventGuests.filter((g) => g.rsvpStatus === "PENDING").length;
    const eMaybe = eventGuests.filter((g) => g.rsvpStatus === "MAYBE").length;
    const eCheckedIn = eventGuests.filter((g) => g.checkedIn).length;

    totalGuests += eventGuests.length;
    confirmed += eConfirmed;
    declined += eDeclined;
    pending += ePending;
    maybe += eMaybe;
    checkedIn += eCheckedIn;
    if (new Date(event.date) >= now) upcomingEvents += 1;
    else pastEvents += 1;

    return {
      eventId: event.id,
      eventName: event.name,
      date: event.date,
      totalGuests: eventGuests.length,
      confirmed: eConfirmed,
      declined: eDeclined,
      pending: ePending,
      maybe: eMaybe,
      checkedIn: eCheckedIn,
    };
  });

  const totalVendors = vendors.length;
  const vendorsBooked = vendors.filter((v: { status: string }) => v.status === "BOOKED" || v.status === "CONFIRMED").length;
  const totalVendorSpend = vendors.reduce((sum: number, v: { costCents: number | null }) => sum + (v.costCents ?? 0), 0) / 100;

  return {
    totalEvents: events.length,
    upcomingEvents,
    pastEvents,
    totalGuests,
    confirmed,
    declined,
    pending,
    maybe,
    confirmationRate: totalGuests > 0 ? confirmed / totalGuests : 0,
    responseRate: totalGuests > 0 ? (confirmed + declined + maybe) / totalGuests : 0,
    checkedIn,
    checkInRate: confirmed > 0 ? checkedIn / confirmed : 0,
    totalVendors,
    vendorsBooked,
    totalVendorSpend,
    byEvent,
  };
}
