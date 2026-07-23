import { prisma } from "../../lib/prisma";
import { getOwnedEvent } from "./events.service";
import { BadRequestError, NotFoundError } from "../../lib/errors";

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export async function getInvitationCardMeta(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);
  const card = await prisma.eventInvitationCard.findUnique({
    where: { eventId },
    select: { fileName: true, mimeType: true, size: true, createdAt: true },
  });
  return card;
}

export async function uploadInvitationCard(userId: string, eventId: string, file: UploadedFile) {
  await getOwnedEvent(userId, eventId);

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestError("Invitation card must be a PDF, PNG, or JPEG file");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new BadRequestError("Invitation card must be 8MB or smaller");
  }

  const card = await prisma.eventInvitationCard.upsert({
    where: { eventId },
    create: {
      eventId,
      data: file.buffer,
      mimeType: file.mimetype,
      fileName: file.originalname,
      size: file.size,
    },
    update: {
      data: file.buffer,
      mimeType: file.mimetype,
      fileName: file.originalname,
      size: file.size,
    },
    select: { fileName: true, mimeType: true, size: true, createdAt: true },
  });

  return card;
}

export async function deleteInvitationCard(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);
  await prisma.eventInvitationCard.deleteMany({ where: { eventId } });
}

// Host-side download (authenticated) -- used for the preview/download button
// in the app itself.
export async function getInvitationCardFile(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);
  const card = await prisma.eventInvitationCard.findUnique({ where: { eventId } });
  if (!card) {
    throw new NotFoundError("No invitation card has been uploaded for this event");
  }
  return card;
}

// Public lookups (no auth) -- these back the shareable link that gets
// embedded in WhatsApp messages and shown on the public RSVP page.
export async function getInvitationCardByEventToken(rsvpToken: string) {
  const event = await prisma.event.findUnique({ where: { rsvpToken }, select: { id: true } });
  if (!event) {
    throw new NotFoundError("This RSVP link is invalid");
  }
  const card = await prisma.eventInvitationCard.findUnique({ where: { eventId: event.id } });
  if (!card) {
    throw new NotFoundError("No invitation card is available for this event");
  }
  return card;
}

export async function getInvitationCardByInvitationToken(invitationToken: string) {
  const invitation = await prisma.eventInvitation.findUnique({
    where: { token: invitationToken },
    select: { eventId: true },
  });
  if (!invitation) {
    throw new NotFoundError("This invite link is invalid");
  }
  const card = await prisma.eventInvitationCard.findUnique({ where: { eventId: invitation.eventId } });
  if (!card) {
    throw new NotFoundError("No invitation card is available for this event");
  }
  return card;
}

// Internal helper for attaching the card to invite emails -- no auth check
// here since the caller (invite.service.ts) has already verified the host
// owns the guest/event this card belongs to.
export async function getInvitationCardBytesForEvent(eventId: string) {
  return prisma.eventInvitationCard.findUnique({ where: { eventId } });
}

export async function eventHasInvitationCard(eventId: string) {
  const count = await prisma.eventInvitationCard.count({ where: { eventId } });
  return count > 0;
}
