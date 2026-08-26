# 10 — Roles and Permissions

## 10.1 Roles

The schema defines exactly two roles via `UserRole` (CONFIRMED, `apps/api/prisma/schema.prisma`): `PLANNER` (default for every new registration) and `ADMIN`. There is no self-service path to become `ADMIN` — no route accepts a client-supplied `role` value on registration (`auth.schema.ts` `registerSchema` has no `role` field). How the first admin account is created is UNKNOWN from the routes/services reviewed in this pass — Not determined from the available source code/project artefacts (likely a direct database update or a seed script; `apps/api/prisma/seed.ts` is referenced in `package.json`'s `seed` script but its contents were not read in this documentation pass).

A third "role" — **unauthenticated guest/ticket buyer** — is not a database role at all; it is anyone reaching a public route (`/api/rsvp/*`, `/api/shop/*`, `/api/tickets/*`, `/api/articles/*`, `/api/landing/*`) with no session, authorized purely by possessing an unguessable token/slug (see [14-security-documentation.md](14-security-documentation.md) §14.3).

## 10.2 Permission matrix

| Capability | PLANNER (own event) | PLANNER (other's event) | ADMIN (own event) | ADMIN (other's event) | Unauthenticated |
|---|---|---|---|---|---|
| Register / log in | ✅ | ✅ | ✅ | ✅ | ✅ (register/login itself) |
| View/edit own profile (`/auth/me`) | ✅ | — | ✅ | — | ❌ |
| Create event | ✅ | — | ✅ | — | ❌ |
| Read event | ✅ | ❌ (404) | ✅ | ✅ | ❌ |
| Update event | ✅ | ❌ (404) | ✅ | ✅ | ❌ |
| Delete event | ✅ | ❌ (404) | ✅ | ❌ (404 — no admin bypass) | ❌ |
| Guests / seating / vendors / merchandise / ticket types CRUD | ✅ | ❌ (404) | ✅ | ✅ (audited) | ❌ |
| Connect/change payout account (Stripe/Paystack/PayPal) | ✅ | ❌ (404) | ✅ | ❌ (404 — no admin bypass) | ❌ |
| View own orders/payment events for an event | ✅ | ❌ (404) | ✅ | ✅ | ❌ |
| Submit an RSVP (via token) | — | — | — | — | ✅ (rate-limited) |
| Browse merchandise shop / buy (via token) | — | — | — | — | ✅ (rate-limited) |
| Buy public tickets (via slug) | — | — | — | — | ✅ (rate-limited) |
| Door check-in scan (guest QR or ticket code) | ✅ (own event) | ❌ | ✅ | ✅ (audited) | ❌ |
| List all subscribers / all events (`/admin/users`, `/admin/events`) | ❌ | ❌ | ✅ | ✅ | ❌ |
| View admin audit log / cross-subscriber payment events | ❌ | ❌ | ✅ | ✅ | ❌ |
| View platform-wide analytics | ❌ | ❌ | ✅ | ✅ | ❌ |
| Author/publish/delete articles | ❌ | ❌ | ✅ | ✅ | ❌ |
| Manage landing "Services" cards | ❌ | ❌ | ✅ | ✅ | ❌ |
| Read published articles / active services / landing content | ✅ | ✅ | ✅ | ✅ | ✅ |

CONFIRMED — derived directly from `apps/api/src/middleware/auth.ts` (`requireAuth`, `requireAdmin`), `apps/api/src/modules/events/events.service.ts` (`getOwnedEvent` vs `getOwnedEventStrict`), `apps/api/src/modules/payouts/payouts.service.ts` (all three `connect*` functions call `getOwnedEventStrict`), and the route-level `requireAdmin` gating on `admin.routes.ts`, `articles.admin.routes.ts`, `landing.admin.routes.ts`.

## 10.3 Notes on the "admin bypass" model

Rather than a parallel `/api/admin/events/:id/*` API, EventFlow's admin support access works by having the **owner-scoped** endpoints (`/api/events/:eventId/*` and everything nested under it) accept an ADMIN caller as if they owned the event, via `getOwnedEvent`'s explicit role check. This is a deliberate architectural choice (INFERRED intent from code comments in `events.service.ts`: "so an ADMIN passed in here gets read/write access everywhere those modules already allow the owner to act, by design") that guarantees admin support access can never functionally diverge from what a planner can do to their own event — there is no separate admin code path to fall out of sync. Two specific actions are explicitly excluded from this bypass (owner-only, enforced via `getOwnedEventStrict`): deleting an event outright, and creating/changing a payout account's financial connection details.

## 10.4 Audit trail scope

`auditAdminEventActions` (CONFIRMED, `apps/api/src/middleware/auditAdminEventActions.ts`) logs **only** when all of the following are true: the request method is not `GET`, the response status is `< 400`, the requester's role is `ADMIN`, and the target event's `userId` is **not** the requester's own id. A planner acting on their own event is never logged by this middleware (there is nothing anomalous to record). An admin's read-only (`GET`) actions on a subscriber's event are also never logged — only mutations are audited.
