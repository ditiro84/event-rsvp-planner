import QRCode from "qrcode";
import { Resend } from "resend";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { getOwnedEventOrCollaborator } from "../events/events.service";
import { checkInGuest, getOwnedGuest } from "./guests.service";
import { eventHasInvitationCard, getInvitationCardBytesForEvent } from "../events/invitationCard.service";
import { formatFromHeader } from "../../utils/email";

// Finds or creates the guest's personalized invitation (a stable token that
// never changes once created, so a QR code or link sent out remains valid
// even if the host regenerates/re-sends later).
export async function getOrCreateInvitation(userId: string, guestId: string) {
  const guest = await getOwnedGuest(userId, guestId);

  let invitation = await prisma.eventInvitation.findUnique({ where: { guestId } });
  if (!invitation) {
    invitation = await prisma.eventInvitation.create({
      data: { eventId: guest.eventId, guestId },
    });
  }
  return { guest, invitation };
}

export function buildInviteUrl(invitationToken: string) {
  return `${env.publicAppUrl}/rsvp/invite/${invitationToken}`;
}

export async function getInviteLink(userId: string, guestId: string) {
  const { guest, invitation } = await getOrCreateInvitation(userId, guestId);
  const url = buildInviteUrl(invitation.token);
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 400 });
  const hasInvitationCard = await eventHasInvitationCard(guest.eventId);
  return {
    url,
    qrDataUrl,
    channel: invitation.channel,
    sentAt: invitation.sentAt,
    guestEmail: guest.email,
    guestPhone: guest.phone,
    hasInvitationCard,
  };
}

// Every guest's invitation link, creating one where it doesn't exist yet --
// feeds the wristband/badge PDF export (see guests.wristbands.pdf.ts). Runs
// sequentially rather than Promise.all since eventInvitation.create needs a
// per-guest existence check first; fine for a print job's guest-list size.
export async function getGuestsWithInviteLinks(userId: string, eventId: string) {
  await getOwnedEventOrCollaborator(userId, eventId);

  const guests = await prisma.guest.findMany({
    where: { eventId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  const results: { firstName: string; lastName: string; inviteUrl: string }[] = [];
  for (const guest of guests) {
    let invitation = await prisma.eventInvitation.findUnique({ where: { guestId: guest.id } });
    if (!invitation) {
      invitation = await prisma.eventInvitation.create({ data: { eventId, guestId: guest.id } });
    }
    results.push({
      firstName: guest.firstName,
      lastName: guest.lastName,
      inviteUrl: buildInviteUrl(invitation.token),
    });
  }
  return results;
}

// Door check-in via QR/wristband scan: staff scan the same invitation QR
// code already generated for the guest's invite (see getInviteLink /
// sendInviteEmail) instead of searching the guest list by name -- no
// separate "wristband" model or QR needed, the invitation token already
// uniquely identifies the guest. Idempotent: re-scanning an
// already-checked-in guest just returns their current state (checkInGuest
// upserts) rather than erroring, since staff will often scan the same
// wristband twice by accident.
export async function checkInGuestByToken(userId: string, eventId: string, token: string, checkedInBy?: string) {
  await getOwnedEventOrCollaborator(userId, eventId);

  const invitation = await prisma.eventInvitation.findUnique({ where: { token } });
  if (!invitation || invitation.eventId !== eventId || !invitation.guestId) {
    throw new NotFoundError("This QR code doesn't match a guest for this event");
  }

  return checkInGuest(userId, invitation.guestId, checkedInBy);
}

export async function markInviteSent(userId: string, guestId: string, channel: string) {
  const { invitation } = await getOrCreateInvitation(userId, guestId);
  return prisma.eventInvitation.update({
    where: { id: invitation.id },
    data: { channel, sentAt: new Date() },
  });
}

function getResendClient() {
  if (!env.resendApiKey || !env.resendFromEmail) {
    throw new BadRequestError(
      "Email sending isn't configured yet. Add RESEND_API_KEY and RESEND_FROM_EMAIL to enable invite emails."
    );
  }
  return { client: new Resend(env.resendApiKey), from: env.resendFromEmail };
}


function inviteEmailHtml(
  eventName: string,
  guestFirstName: string,
  url: string,
  eventDetails: string,
  qrDataUrl: string
) {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="font-size: 20px; color: #1e293b;">You're invited to ${eventName}!</h1>
      <p style="color: #334155; font-size: 15px;">Hi ${guestFirstName},</p>
      <p style="color: #334155; font-size: 15px;">${eventDetails}</p>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${url}" style="background: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          RSVP now
        </a>
      </p>
      <p style="color: #64748b; font-size: 13px; text-align: center;">
        Or scan the QR code below to open your invite on your phone.
      </p>
      <p style="text-align: center;">
        <img src="${qrDataUrl}" alt="QR code" width="180" height="180" />
      </p>
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
        Can't click the button, or QR not showing? Copy this link: ${url}
      </p>
    </div>
  `;
}

export async function sendInviteEmail(userId: string, guestId: string) {
  const { client, from } = getResendClient();
  const { guest, invitation } = await getOrCreateInvitation(userId, guestId);

  if (!guest.email) {
    throw new BadRequestError("This guest doesn't have an email address on file.");
  }

  const event = await prisma.event.findUnique({
    where: { id: guest.eventId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!event) {
    throw new BadRequestError("Event not found.");
  }

  const url = buildInviteUrl(invitation.token);
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 360 });
  const qrBase64 = qrDataUrl.split(",")[1];

  const eventDetails = [
    event.date ? new Date(event.date).toLocaleDateString(undefined, { dateStyle: "long" }) : null,
    event.venueName,
  ]
    .filter(Boolean)
    .join(" · ");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attachments: any[] = [
    {
      filename: "invite-qr.png",
      content: qrBase64,
      contentType: "image/png",
    },
  ];

  // If the host has uploaded a designed invitation card (PDF/PNG/JPEG),
  // attach it too so the guest gets the real invite, not just a QR code.
  const card = await getInvitationCardBytesForEvent(guest.eventId);
  if (card) {
    attachments.push({
      filename: card.fileName,
      content: card.data,
      contentType: card.mimeType,
    });
  }

  const subject = `You're invited to ${event.name}`;
  const recipientName = `${guest.firstName} ${guest.lastName}`.trim();

  const { error } = await client.emails.send({
    from: formatFromHeader(event.name, from),
    to: guest.email,
    replyTo: event.user.email,
    subject,
    // The QR is embedded directly as a data URI (works in the large majority
    // of email clients) and also attached as a PNG so it's easy to save.
    html: inviteEmailHtml(event.name, guest.firstName, url, eventDetails || "We'd love for you to join us.", qrDataUrl),
    attachments,
  });

  // Logged here (not in bulkSendInviteEmails) so a single "Send Invite"
  // click from the Guests tab is covered too, not just bulk reminders --
  // this is the one place every outbound invite/reminder email passes
  // through. See GET /guests/email-events for where this surfaces.
  await prisma.emailEvent.create({
    data: {
      eventId: guest.eventId,
      guestId: guest.id,
      recipientEmail: guest.email,
      recipientName,
      subject,
      status: error ? "FAILED" : "SENT",
      errorMessage: error?.message ?? null,
    },
  });

  if (error) {
    throw new BadRequestError(`Failed to send invite email: ${error.message}`);
  }

  await prisma.eventInvitation.update({
    where: { id: invitation.id },
    data: { channel: "email", sentAt: new Date() },
  });

  return { sent: true };
}

export async function bulkSendInviteEmails(userId: string, eventId: string, guestIds?: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { eventId, email: { not: null } };
  if (guestIds && guestIds.length > 0) {
    where.id = { in: guestIds };
  }
  const guests = await prisma.guest.findMany({ where, select: { id: true, email: true } });

  const results: { guestId: string; sent: boolean; error?: string }[] = [];
  for (const guest of guests) {
    try {
      await sendInviteEmail(userId, guest.id);
      results.push({ guestId: guest.id, sent: true });
    } catch (err) {
      results.push({ guestId: guest.id, sent: false, error: (err as Error).message });
    }
  }

  return {
    total: guests.length,
    sent: results.filter((r) => r.sent).length,
    failed: results.filter((r) => !r.sent).length,
    results,
  };
}
