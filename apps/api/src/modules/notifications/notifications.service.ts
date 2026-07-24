import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { ListNotificationsQuery } from "./notifications.schema";

export async function listNotifications(userId: string, query: ListNotificationsQuery) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };
  if (query.unreadOnly === "true") where.read = false;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return { notifications, unreadCount };
}

export async function markRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.userId !== userId) {
    throw new NotFoundError("Notification not found");
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true, readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  });
}

// --- Generation triggers ----------------------------------------------------
// Notifications are created as a side effect of the action that causes them
// (a guest RSVPing, a vendor status change). Keeping generation as small,
// targeted helpers called from the relevant service -- rather than a
// generic event bus -- keeps this easy to reason about at the app's current
// size, matching the rest of the codebase's direct-call style.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function notifyRsvpChange(eventOwnerId: string, event: { id: string; name: string }, guest: any) {
  if (guest.rsvpStatus !== "CONFIRMED" && guest.rsvpStatus !== "DECLINED") return;

  const guestName = `${guest.firstName} ${guest.lastName}`.trim();
  const confirmed = guest.rsvpStatus === "CONFIRMED";

  await prisma.notification.create({
    data: {
      userId: eventOwnerId,
      eventId: event.id,
      type: confirmed ? "RSVP_CONFIRMED" : "RSVP_DECLINED",
      title: confirmed ? `${guestName} confirmed for ${event.name}` : `${guestName} declined ${event.name}`,
      body: confirmed
        ? `${guestName} confirmed their RSVP.`
        : `${guestName} won't be attending.`,
      link: `/events/${event.id}/guests`,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function notifyVendorStatusChanged(userId: string, vendor: any) {
  const event = await prisma.event.findUnique({ where: { id: vendor.eventId }, select: { name: true } });
  if (!event) return;

  const statusLabel = String(vendor.status).replace(/_/g, " ").toLowerCase();

  await prisma.notification.create({
    data: {
      userId,
      eventId: vendor.eventId,
      type: "VENDOR_STATUS_CHANGED",
      title: `${vendor.name} is now ${statusLabel}`,
      body: `Vendor status updated for ${event.name}.`,
      link: `/events/${vendor.eventId}/vendors`,
    },
  });
}
