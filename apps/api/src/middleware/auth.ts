import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { verifyAuthToken } from "../utils/jwt";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";
import { prisma } from "../lib/prisma";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function extractToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.[env.cookieName];
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return undefined;
}

// Requires a valid session; rejects the request otherwise.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    throw new UnauthorizedError();
  }
  try {
    const payload = verifyAuthToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    throw new UnauthorizedError("Invalid or expired session");
  }
}

// Attaches userId if present, but does not reject unauthenticated requests.
// Used on routes that behave differently for logged-in owners (not required for MVP but kept for future use).
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyAuthToken(token);
      req.userId = payload.userId;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}

export async function getCurrentUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}

// Requires an authenticated ADMIN account -- rejects everyone else (planners
// included) with 403. Mount after requireAuth. See events.service.ts's
// getOwnedEvent for what admin access unlocks across the app.
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.userId) throw new UnauthorizedError();
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
  if (!user || user.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required");
  }
  next();
}
