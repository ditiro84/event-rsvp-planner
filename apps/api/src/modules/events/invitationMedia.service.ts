import { prisma } from "../../lib/prisma";
import { getOwnedEventOrCollaborator } from "./events.service";
import { BadRequestError, NotFoundError } from "../../lib/errors";

const IMAGE_PDF_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime"]);
const ALLOWED_MIME_TYPES = new Set([...IMAGE_PDF_MIME_TYPES, ...VIDEO_MIME_TYPES]);

const MAX_IMAGE_PDF_SIZE_BYTES = 8 * 1024 * 1024; // 8MB -- unchanged from the old single-card cap
// Kept well below the image/PDF cap on purpose: these bytes are served
// straight out of Postgres with no CDN in front (see serveBytes.ts's Range
// support, which helps playback but doesn't make this fast at scale), so a
// short reel-style clip is the target, not a proper video upload.
const MAX_VIDEO_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_ITEMS_PER_EVENT = 8;

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const META_SELECT = {
  id: true,
  position: true,
  mimeType: true,
  fileName: true,
  size: true,
  createdAt: true,
} as const;

export async function listInvitationMedia(userId: string, eventId: string) {
  await getOwnedEventOrCollaborator(userId, eventId);
  return prisma.eventInvitationMedia.findMany({
    where: { eventId },
    orderBy: { position: "asc" },
    select: META_SELECT,
  });
}

export async function uploadInvitationMedia(userId: string, eventId: string, file: UploadedFile) {
  await getOwnedEventOrCollaborator(userId, eventId);

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestError("Invitation media must be a PDF, PNG, JPEG, or MP4/MOV video");
  }
  const isVideo = VIDEO_MIME_TYPES.has(file.mimetype);
  const maxSize = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_PDF_SIZE_BYTES;
  if (file.size > maxSize) {
    throw new BadRequestError(
      isVideo
        ? "Video clips must be 15MB or smaller -- keep it short, like a quick reel"
        : "Invitation media must be 8MB or smaller"
    );
  }

  const count = await prisma.eventInvitationMedia.count({ where: { eventId } });
  if (count >= MAX_ITEMS_PER_EVENT) {
    throw new BadRequestError(`You can only add up to ${MAX_ITEMS_PER_EVENT} invitation media items`);
  }

  const last = await prisma.eventInvitationMedia.findFirst({
    where: { eventId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const nextPosition = (last?.position ?? -1) + 1;

  return prisma.eventInvitationMedia.create({
    data: {
      eventId,
      position: nextPosition,
      data: file.buffer,
      mimeType: file.mimetype,
      fileName: file.originalname,
      size: file.size,
    },
    select: META_SELECT,
  });
}

export async function deleteInvitationMediaItem(userId: string, eventId: string, mediaId: string) {
  await getOwnedEventOrCollaborator(userId, eventId);
  const item = await prisma.eventInvitationMedia.findFirst({ where: { id: mediaId, eventId } });
  if (!item) {
    throw new NotFoundError("Invitation media item not found");
  }
  await prisma.eventInvitationMedia.delete({ where: { id: mediaId } });
}

// Body is the event's full set of media IDs in the new display order --
// validated to be exactly the current set (no partial updates, no
// smuggling in an ID from another event) before writing new positions.
export async function reorderInvitationMedia(userId: string, eventId: string, orderedIds: string[]) {
  await getOwnedEventOrCollaborator(userId, eventId);
  const items = await prisma.eventInvitationMedia.findMany({ where: { eventId }, select: { id: true } });
  const existingIds = new Set(items.map((i: { id: string }) => i.id));
  if (orderedIds.length !== items.length || !orderedIds.every((id) => existingIds.has(id))) {
    throw new BadRequestError("Reorder list must include exactly the event's current invitation media items");
  }
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.eventInvitationMedia.update({ where: { id }, data: { position: index } }))
  );
}

// Host-side download (authenticated) -- used for the preview/download in
// the app itself.
export async function getInvitationMediaFile(userId: string, eventId: string, mediaId: string) {
  await getOwnedEventOrCollaborator(userId, eventId);
  const item = await prisma.eventInvitationMedia.findFirst({ where: { id: mediaId, eventId } });
  if (!item) {
    throw new NotFoundError("Invitation media item not found");
  }
  return item;
}

// --- Public lookups (no auth) -- back the per-item file links shown on the
// public RSVP page, for both the shared event link and a personalized
// invite link. -------------------------------------------------------------

export async function getInvitationMediaFileByEventToken(rsvpToken: string, mediaId: string) {
  const event = await prisma.event.findUnique({ where: { rsvpToken }, select: { id: true } });
  if (!event) {
    throw new NotFoundError("This RSVP link is invalid");
  }
  const item = await prisma.eventInvitationMedia.findFirst({ where: { id: mediaId, eventId: event.id } });
  if (!item) {
    throw new NotFoundError("Invitation media item not found");
  }
  return item;
}

export async function getInvitationMediaFileByInvitationToken(invitationToken: string, mediaId: string) {
  const invitation = await prisma.eventInvitation.findUnique({
    where: { token: invitationToken },
    select: { eventId: true },
  });
  if (!invitation) {
    throw new NotFoundError("This invite link is invalid");
  }
  const item = await prisma.eventInvitationMedia.findFirst({
    where: { id: mediaId, eventId: invitation.eventId },
  });
  if (!item) {
    throw new NotFoundError("Invitation media item not found");
  }
  return item;
}

// The ordered metadata list embedded directly in the public RSVP event
// payload (see rsvp.service.ts's publicEventShape) -- small enough (capped
// at MAX_ITEMS_PER_EVENT, metadata only, no bytes) that there's no need for
// a separate public "list" endpoint the way there is for the file bytes
// themselves.
export async function listInvitationMediaMetaForEvent(eventId: string) {
  return prisma.eventInvitationMedia.findMany({
    where: { eventId },
    orderBy: { position: "asc" },
    select: { id: true, mimeType: true, fileName: true },
  });
}

// Internal helper for attaching a card to invite emails -- the first IMAGE
// or PDF item in position order (never video: most mail clients strip or
// mishandle large/video attachments, and a short clip is better
// experienced on the RSVP page anyway). No auth check here since the
// caller (invite.service.ts) has already verified the host owns the
// guest/event this belongs to.
export async function getPrimaryAttachableMediaForEvent(eventId: string) {
  return prisma.eventInvitationMedia.findFirst({
    where: { eventId, mimeType: { in: [...IMAGE_PDF_MIME_TYPES] } },
    orderBy: { position: "asc" },
  });
}

export async function eventHasInvitationMedia(eventId: string) {
  const count = await prisma.eventInvitationMedia.count({ where: { eventId } });
  return count > 0;
}
