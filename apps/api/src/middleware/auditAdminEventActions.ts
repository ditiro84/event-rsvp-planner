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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Snapshot = Record<string, any> | null;

// Narrower than RESOURCE_LABELS above on purpose: RESOURCE_LABELS matches
// any path under a resource (list, create, sub-actions like a guest
// check-in) just to pick a label word, but a "before" snapshot only makes
// sense for a request that targets exactly one existing record by id --
// otherwise we'd either have no id to look up (a list/create route) or
// risk snapshotting the wrong thing (e.g. /guests/:id/checkin is a
// check-out action, not a guest deletion, even though it's a DELETE under
// /guests). Only used when req.method === "DELETE" -- see beforeSnapshot
// below; creates/updates get their "after" state from the response body
// instead (see capturedBody).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DELETE_SNAPSHOT_RULES: { match: RegExp; before: (eventId: string, id: string) => Promise<Snapshot> }[] = [
  {
    match: /^\/guests\/([^/]+)$/,
    before: async (_eventId, id) => {
      const g = await prisma.guest.findUnique({
        where: { id },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          groupName: true,
          rsvpStatus: true,
          additionalGuestsCount: true,
          isVip: true,
        },
      });
      return g ? { name: `${g.firstName} ${g.lastName}`.trim(), ...g } : null;
    },
  },
  {
    match: /^\/vendors\/([^/]+)$/,
    before: async (_eventId, id) =>
      prisma.vendor.findUnique({
        where: { id },
        select: {
          name: true,
          category: true,
          status: true,
          contactName: true,
          email: true,
          phone: true,
          costCents: true,
          currency: true,
        },
      }),
  },
  {
    match: /^\/products\/([^/]+)$/,
    before: async (_eventId, id) =>
      prisma.product.findUnique({
        where: { id },
        select: { name: true, size: true, priceCents: true, currency: true },
      }),
  },
  {
    match: /^\/payouts\/([^/]+)$/,
    before: async (_eventId, id) =>
      prisma.eventPayoutAccount.findUnique({
        where: { id },
        select: {
          currency: true,
          provider: true,
          stripeOnboardingComplete: true,
          paystackBankName: true,
          paystackAccountLast4: true,
          paypalEmail: true,
        },
      }),
  },
  {
    match: /^\/layout\/objects\/([^/]+)$/,
    before: async (_eventId, id) =>
      prisma.layoutObject.findUnique({
        where: { id },
        select: { type: true, label: true },
      }),
  },
  {
    match: /^\/tables\/([^/]+)$/,
    before: async (_eventId, id) =>
      prisma.table.findUnique({
        where: { id },
        select: { name: true, shape: true, capacity: true },
      }),
  },
  {
    // Singleton per event (one card, keyed on eventId itself) -- no :id
    // segment, so the capture group is unused and `id` in `before` is "".
    match: /^\/invitation-card$/,
    before: async (eventId) =>
      prisma.eventInvitationCard.findUnique({
        where: { eventId },
        select: { fileName: true, mimeType: true, size: true },
      }),
  },
  {
    // The event itself -- root of the `/:eventId` mount, so req.path here
    // is "/" once Express strips the matched prefix.
    match: /^\/?$/,
    before: async (eventId) =>
      prisma.event.findUnique({
        where: { id: eventId },
        select: { name: true, type: true, date: true, venueName: true, venueAddress: true, isPublic: true },
      }),
  },
];

function findDeleteSnapshotRule(path: string) {
  for (const rule of DELETE_SNAPSHOT_RULES) {
    const m = rule.match.exec(path);
    if (m) return { before: rule.before, id: m[1] ?? "" };
  }
  return undefined;
}

// The response envelope is always `{ success: true, data: {...} }` (see
// apiResponse.ts's `ok`), where `data` is usually a single-key wrapper like
// `{ guest }` or `{ vendor }`. Unwrap that one extra layer so `details`
// holds the record itself -- the admin UI shouldn't need to know each
// endpoint's own wrapper key just to show what changed.
function extractDetails(body: unknown): Snapshot {
  if (!body || typeof body !== "object") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (body as any).data;
  if (!data || typeof data !== "object") return null;
  const values = Object.values(data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return values.length === 1 && typeof values[0] === "object" && values[0] !== null ? (values[0] as any) : data;
}

// Mounted at the `/:eventId` prefix in events.routes.ts, after requireAuth,
// so it sees every request under an event (including nested guest/seating/
// vendor/product/order/payout routes) with req.params.eventId already set.
//
// Best-effort, fire-and-forget: whenever an ADMIN user's request actually
// mutates (non-GET, non-error response) an event they don't own, records
// who did what to which event via AdminAuditLog -- including a `details`
// snapshot of what was actually created/updated/deleted, not just a
// one-line summary, so a deleted record isn't gone without a trace. A
// failure writing the log entry (or capturing details) is swallowed rather
// than surfaced, since a logging problem shouldn't break the underlying
// support action.
export function auditAdminEventActions() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Capture the response body for create/update actions -- controllers
    // return the freshly created/updated record via `ok(res, {...})`,
    // already stripped of anything sensitive by the controller's own
    // serializer (e.g. payouts never returns raw account numbers). Deletes
    // return 204 with no body, so those rely on the "before" snapshot
    // captured below instead.
    let capturedBody: unknown;
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      capturedBody = body;
      return originalJson(body);
    }) as typeof res.json;

    // For deletes, the row is gone by the time res.on("finish") runs below
    // -- fetch it now, before the route handler has a chance to remove it.
    let beforeSnapshotPromise: Promise<Snapshot> | null = null;
    if (req.method === "DELETE") {
      const rule = findDeleteSnapshotRule(req.path);
      const eventId = req.params.eventId;
      if (rule && eventId) {
        beforeSnapshotPromise = rule.before(eventId, rule.id).catch(() => null);
      }
    }

    res.on("finish", () => {
      void logIfAdminAction(req, res, capturedBody, beforeSnapshotPromise).catch(() => undefined);
    });
    next();
  };
}

async function logIfAdminAction(
  req: Request,
  res: Response,
  capturedBody: unknown,
  beforeSnapshotPromise: Promise<Snapshot> | null
) {
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

  const details =
    req.method === "DELETE" ? await (beforeSnapshotPromise ?? Promise.resolve(null)) : extractDetails(capturedBody);

  await prisma.adminAuditLog.create({
    data: {
      adminUserId: userId,
      adminEmail: requester.email,
      eventId,
      eventName: event.name,
      method: req.method,
      summary: describe(req.method, req.path),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details: (details ?? undefined) as any,
    },
  });
}
