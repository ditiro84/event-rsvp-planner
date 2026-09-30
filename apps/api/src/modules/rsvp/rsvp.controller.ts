import { Request, Response } from "express";
import { ok } from "../../lib/apiResponse";
import { submitRsvpSchema } from "./rsvp.schema";
import * as service from "./rsvp.service";
import * as mediaService from "../events/invitationMedia.service";
import { serveBytesWithRangeSupport } from "../../utils/serveBytes";

export async function getPublicEvent(req: Request, res: Response) {
  const event = await service.getPublicEventByToken(req.params.token);
  return ok(res, { event });
}

export async function submit(req: Request, res: Response) {
  const input = submitRsvpSchema.parse(req.body);
  const guest = await service.submitRsvp(req.params.token, input);
  return ok(res, {
    message: "Your RSVP has been recorded. Thank you!",
    guest: { id: guest.id, firstName: guest.firstName, lastName: guest.lastName, rsvpStatus: guest.rsvpStatus },
  });
}

export async function dashboard(req: Request, res: Response) {
  const result = await service.getRsvpDashboard(req.userId!, req.params.eventId);
  return ok(res, result);
}

export async function getPublicEventViaInvite(req: Request, res: Response) {
  const result = await service.getInvitePrefill(req.params.invitationToken);
  return ok(res, result);
}

export async function submitViaInvite(req: Request, res: Response) {
  const input = submitRsvpSchema.parse(req.body);
  const guest = await service.submitRsvpViaInvitation(req.params.invitationToken, input);
  return ok(res, {
    message: "Your RSVP has been recorded. Thank you!",
    guest: { id: guest.id, firstName: guest.firstName, lastName: guest.lastName, rsvpStatus: guest.rsvpStatus },
  });
}

export async function getInvitationMediaFileByToken(req: Request, res: Response) {
  const item = await mediaService.getInvitationMediaFileByEventToken(req.params.token, req.params.mediaId);
  serveBytesWithRangeSupport(req, res, item.data, item.mimeType, item.fileName);
}

export async function getInvitationMediaFileByInviteToken(req: Request, res: Response) {
  const item = await mediaService.getInvitationMediaFileByInvitationToken(
    req.params.invitationToken,
    req.params.mediaId
  );
  serveBytesWithRangeSupport(req, res, item.data, item.mimeType, item.fileName);
}
