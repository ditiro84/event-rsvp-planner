import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

// Human-readable resource labels for the audit log summary, matched against
// req.path (relative to the `/:eventId` mount point in events.routes.ts --
// see that file for why this middleware is mounted there specifically).
const RESOURCE_LABELS: { match: RegExp; label: string }[] = [
  { match: /^\/guests/, label: "guest" },
  { match: /^\/seating/, label: "seating" },
  { match: /^\/vendors/, label: "vendor" },
  { match: /^\/products/, label: "product" },
  { match: /^\/orders/, label: "order" },
  { match: /^\/payouts/, label: "payout account" },
  { match: /^\/invitation-card/, label: "invitation card" },
];

const METHOD_VERBS: Record<string, string> = {
  POST: "Created",
  PUT: "Updated",
  PATCH: "Updated",
  DELETE: "Deleted",
};

function describe(method: string, path: string): string {
  const verb = METHOD_VERBS[method] ?? method;
  const resource = RESOURCE_LABELS.find((r) => r.match.test(path))?.label ?? "event";
  return `${verb} ${resource}`;
}

// Mounted at the `/:eventId` prefix in events.routes.ts, after requireAuth,
// so it sees every request under an event (including nested guest/seating/
// vendor/product/order/payout routes) with req.params.eventId already set.
//
// Best-effort, fire-and-forget: whenever an ADMIN user's request actually
// mutates (non-GET, non-error response) an event they don't own, records
// who did what to which event via AdminAuditLog. Registers a listener and
// calls next() immediately -- never adds latency to the real request, and a
// failure writing the log entry is swallowed rather than surfaced, since a
// logging problem shouldn't break the underlying support action.
export function auditAdminEventActions() {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on("finish", () => {
      void logIfAdminAction(req, res).catch(() => undefined);
    });
    next();
  };
}

async function logIfAdminAction(req: Request, res: Response) {
  if (req.method === "GET" || res.statusCode >= 400) return;
  const userId = req.userId;
  const eventId = req.params.eventId;
  if (!userId || !eventId) return;

  const [requester, event] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } }),
    prisma.event.findUnique({ where: { id: eventId }, select: { userId: true, name: true } }),
  ]);
  if (!requester || requester.role !== "ADMIN") return;
  if (!event || event.userId === userId) return; // owner acting on their own event -- not an admin action

  await prisma.adminAuditLog.create({
    data: {
      adminUserId: userId,
      adminEmail: requester.email,
      eventId,
      eventName: event.name,
      method: req.method,
      summary: describe(req.method, req.path),
    },
  });
}
