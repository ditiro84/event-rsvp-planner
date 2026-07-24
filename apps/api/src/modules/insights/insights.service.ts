import { prisma } from "../../lib/prisma";
import { getOwnedEvent } from "../events/events.service";

export type InsightSeverity = "ACTION_REQUIRED" | "UPDATE";

export interface Insight {
  id: string;
  eventId: string;
  eventName: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  link: string;
}

// "Needs Attention" insights are computed on the fly from current guest/RSVP
// data rather than stored -- there is no separate insights table to keep in
// sync, and an insight simply stops appearing once the underlying condition
// (e.g. an unassigned VIP) is resolved. This mirrors the readiness checks
// already shown per-event on the Overview tab, rolled up across all of a
// planner's events for the My Events dashboard.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildEventInsights(event: any, guests: any[]): Insight[] {
  const insights: Insight[] = [];
  const confirmed = guests.filter((g) => g.rsvpStatus === "CONFIRMED");
  const pending = guests.filter((g) => g.rsvpStatus === "PENDING" || g.rsvpStatus === "MAYBE");
  const unassignedConfirmed = confirmed.filter((g) => !g.seatAssignment);
  const unassignedVips = unassignedConfirmed.filter((g) => g.isVip);
  const missingMeal = event.allowMealSelection
    ? confirmed.filter((g) => !g.mealPreference || !g.mealPreference.trim())
    : [];

  if (event.rsvpDeadline && event.rsvpOpen) {
    const daysLeft = Math.ceil((new Date(event.rsvpDeadline).getTime() - Date.now()) / 86400000);
    if (daysLeft >= 0 && daysLeft <= 7) {
      insights.push({
        id: `${event.id}-deadline`,
        eventId: event.id,
        eventName: event.name,
        severity: "ACTION_REQUIRED",
        title: `RSVP deadline approaching for ${event.name}`,
        description:
          daysLeft === 0
            ? "The RSVP deadline is today."
            : `The RSVP deadline is in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
        link: `/events/${event.id}/rsvp`,
      });
    }
  }

  for (const vip of unassignedVips.slice(0, 5)) {
    insights.push({
      id: `${event.id}-unassigned-vip-${vip.id}`,
      eventId: event.id,
      eventName: event.name,
      severity: "ACTION_REQUIRED",
      title: `Unassigned VIP: ${vip.firstName} ${vip.lastName}`,
      description: `${vip.firstName} ${vip.lastName} is confirmed but has no table seat.`,
      link: `/events/${event.id}/seating`,
    });
  }
  const remainingUnassigned = unassignedConfirmed.length - unassignedVips.length;
  if (remainingUnassigned > 0) {
    insights.push({
      id: `${event.id}-unassigned-rollup`,
      eventId: event.id,
      eventName: event.name,
      severity: "ACTION_REQUIRED",
      title: `${remainingUnassigned} confirmed guest${remainingUnassigned === 1 ? "" : "s"} need${
        remainingUnassigned === 1 ? "s" : ""
      } a seat`,
      description: `${event.name} has ${remainingUnassigned} confirmed guest${
        remainingUnassigned === 1 ? "" : "s"
      } without a table assignment.`,
      link: `/events/${event.id}/seating`,
    });
  }

  if (missingMeal.length > 0) {
    insights.push({
      id: `${event.id}-menu`,
      eventId: event.id,
      eventName: event.name,
      severity: "UPDATE",
      title: `Menu selections outstanding for ${event.name}`,
      description: `${missingMeal.length} confirmed guest${missingMeal.length === 1 ? "" : "s"} ${
        missingMeal.length === 1 ? "hasn't" : "haven't"
      } picked a meal option yet.`,
      link: `/events/${event.id}/guests`,
    });
  }

  if (pending.length > 0) {
    insights.push({
      id: `${event.id}-pending`,
      eventId: event.id,
      eventName: event.name,
      severity: "UPDATE",
      title: `${pending.length} guest${pending.length === 1 ? "" : "s"} yet to respond to ${event.name}`,
      description: `${pending.length} invited guest${pending.length === 1 ? " has" : "s have"} not responded yet.`,
      link: `/events/${event.id}/guests`,
    });
  }

  return insights;
}

const SEVERITY_RANK: Record<InsightSeverity, number> = { ACTION_REQUIRED: 0, UPDATE: 1 };

export async function listInsights(userId: string, eventId?: string) {
  const events = eventId
    ? [await getOwnedEvent(userId, eventId)]
    : await prisma.event.findMany({ where: { userId }, orderBy: { date: "asc" } });

  if (events.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventIds = events.map((e: any) => e.id);
  const guests = await prisma.guest.findMany({
    where: { eventId: { in: eventIds } },
    select: {
      id: true,
      eventId: true,
      firstName: true,
      lastName: true,
      rsvpStatus: true,
      isVip: true,
      mealPreference: true,
      seatAssignment: { select: { id: true } },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const guestsByEvent = new Map<string, any[]>();
  for (const g of guests) {
    if (!guestsByEvent.has(g.eventId)) guestsByEvent.set(g.eventId, []);
    guestsByEvent.get(g.eventId)!.push(g);
  }

  const allInsights = events.flatMap((event: any) => buildEventInsights(event, guestsByEvent.get(event.id) ?? []));

  allInsights.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  return allInsights;
}
