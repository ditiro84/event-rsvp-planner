import { Resend } from "resend";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors";
import { getOwnedEvent } from "../events/events.service";
import { formatFromHeader } from "../../utils/email";

// Collaborator management is deliberately owner/admin-only -- every function
// below calls getOwnedEvent (not getOwnedEventOrCollaborator), so a staff
// member added to an event can never add or remove other staff, same
// reasoning as why they can't reach the payout account. See EventCollaborator
// in schema.prisma for the full design note.

function getResendClient() {
  if (!env.resendApiKey || !env.resendFromEmail) return null;
  return { client: new Resend(env.resendApiKey), from: env.resendFromEmail };
}

async function logEmailAttempt(
  eventId: string,
  recipientEmail: string,
  subject: string,
  error: string | null
) {
  await prisma.emailEvent.create({
    data: {
      eventId,
      recipientEmail,
      subject,
      status: error ? "FAILED" : "SENT",
      errorMessage: error,
    },
  });
}

async function sendCollaboratorEmail(eventId: string, eventName: string, to: string, alreadyRegistered: boolean) {
  const resend = getResendClient();
  const subject = `You've been added to ${eventName} on Gadaova`;
  // Email sending is optional (see RESEND_API_KEY/RESEND_FROM_EMAIL in
  // env.ts) -- the collaborator row itself is already created either way,
  // so a missing/failing send never blocks the invite from working, it
  // just means the planner has to share the news themselves.
  if (!resend) {
    await logEmailAttempt(eventId, to, subject, "Email sending isn't configured (RESEND_API_KEY/RESEND_FROM_EMAIL).");
    return;
  }

  const actionUrl = alreadyRegistered ? `${env.publicAppUrl}/login` : `${env.publicAppUrl}/register`;
  const actionLabel = alreadyRegistered ? "Log in to view it" : "Create your account to get access";
  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="font-size: 20px; color: #1e293b;">You've been added to ${eventName}</h1>
      <p style="color: #334155; font-size: 15px;">
        You now have staff access to <strong>${eventName}</strong> on Gadaova.
        ${alreadyRegistered ? "" : "Register with this email address and it'll be there waiting for you."}
      </p>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${actionUrl}" style="background: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          ${actionLabel}
        </a>
      </p>
    </div>
  `;

  const { client, from } = resend;
  const { error } = await client.emails.send({
    from: formatFromHeader(eventName, from),
    to,
    subject,
    html,
  });
  await logEmailAttempt(eventId, to, subject, error?.message ?? null);
}

export async function listCollaborators(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);

  const [collaborators, pendingInvites] = await Promise.all([
    prisma.eventCollaborator.findMany({
      where: { eventId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.eventCollaboratorInvite.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { collaborators, pendingInvites };
}

export async function inviteCollaborator(userId: string, eventId: string, email: string) {
  const event = await getOwnedEvent(userId, eventId);

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    if (existingUser.id === userId) {
      throw new BadRequestError("You're already the owner of this event.");
    }
    const alreadyCollaborator = await prisma.eventCollaborator.findUnique({
      where: { eventId_userId: { eventId, userId: existingUser.id } },
    });
    if (alreadyCollaborator) {
      throw new ConflictError("This person already has staff access to this event.");
    }
    const collaborator = await prisma.eventCollaborator.create({
      data: { eventId, userId: existingUser.id, invitedByUserId: userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    await sendCollaboratorEmail(eventId, event.name, email, true);
    return { collaborator, pendingInvite: null };
  }

  const existingInvite = await prisma.eventCollaboratorInvite.findUnique({
    where: { eventId_email: { eventId, email } },
  });
  if (existingInvite) {
    throw new ConflictError("An invite has already been sent to this email for this event.");
  }
  const pendingInvite = await prisma.eventCollaboratorInvite.create({
    data: { eventId, email, invitedByUserId: userId },
  });
  await sendCollaboratorEmail(eventId, event.name, email, false);
  return { collaborator: null, pendingInvite };
}

export async function removeCollaborator(userId: string, eventId: string, collaboratorId: string) {
  await getOwnedEvent(userId, eventId);
  const collaborator = await prisma.eventCollaborator.findUnique({ where: { id: collaboratorId } });
  if (!collaborator || collaborator.eventId !== eventId) {
    throw new NotFoundError("Staff member not found");
  }
  await prisma.eventCollaborator.delete({ where: { id: collaboratorId } });
}

export async function cancelCollaboratorInvite(userId: string, eventId: string, inviteId: string) {
  await getOwnedEvent(userId, eventId);
  const invite = await prisma.eventCollaboratorInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.eventId !== eventId) {
    throw new NotFoundError("Invite not found");
  }
  await prisma.eventCollaboratorInvite.delete({ where: { id: inviteId } });
}

// Called right after a new account is created (see registerUser in
// auth.service.ts) -- any staff invite sent to this email before they
// registered becomes real access immediately, without the planner having
// to do anything twice.
export async function resolvePendingCollaboratorInvites(userId: string, email: string) {
  const invites = await prisma.eventCollaboratorInvite.findMany({ where: { email } });
  if (invites.length === 0) return;

  for (const invite of invites) {
    await prisma.eventCollaborator.create({
      data: { eventId: invite.eventId, userId, invitedByUserId: invite.invitedByUserId },
    });
  }
  await prisma.eventCollaboratorInvite.deleteMany({ where: { email } });
}
