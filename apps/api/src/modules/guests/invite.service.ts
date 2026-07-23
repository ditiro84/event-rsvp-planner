import QRCode from "qrcode";
import { Resend } from "resend";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { BadRequestError } from "../../lib/errors";
import { getOwnedGuest } from "./guests.service";

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
  return {
    url,
    qrDataUrl,
    channel: invitation.channel,
    sentAt: invitation.sentAt,
    guestEmail: guest.email,
    guestPhone: guest.phone,
  };
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

  const event = await prisma.event.findUnique({ where: { id: guest.eventId } });
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

  const { error } = await client.emails.send({
    from,
    to: guest.email,
    subject: `You're invited to ${event.name}`,
    // The QR is embedded directly as a data URI (works in the large majority
    // of email clients) and also attached as a PNG so it's easy to save.
    html: inviteEmailHtml(event.name, guest.firstName, url, eventDetails || "We'd love for you to join us.", qrDataUrl),
    attachments: [
      {
        filename: "invite-qr.png",
        content: qrBase64,
        contentType: "image/png",
      },
    ],
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
