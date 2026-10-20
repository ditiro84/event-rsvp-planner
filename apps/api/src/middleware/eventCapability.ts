import { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { requiredCapability, roleHasCapability } from "../modules/collaborators/permissions";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // Set for requests made by an EventCollaborator (not the owner or an
      // admin). Services read it to trim responses (see guestRedaction.ts).
      eventCollaboratorRole?: string;
    }
  }
}

// Mounted on /api/events/:eventId (after requireAuth). Owners and admins have
// no collaborator row, so they pass straight through to the existing checks.
// A collaborator is allowed only if their role has the capability the request
// needs (see requiredCapability); otherwise 403.
export function eventCapabilityGate() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.userId;
    const eventId = req.params.eventId;
    if (!userId || !eventId) return next();

    const collaborator = await prisma.eventCollaborator.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { role: true },
    });
    if (!collaborator) return next();

    const needed = requiredCapability(req.method, req.path);
    if (!roleHasCapability(collaborator.role, needed)) {
      throw new ForbiddenError("Your role on this event doesn't allow this action.");
    }
    req.eventCollaboratorRole = collaborator.role;
    next();
  };
}
