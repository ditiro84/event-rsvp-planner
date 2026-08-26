# 09 — API Documentation

All endpoints below are CONFIRMED directly from the route files listed per module. Base path for every route is `/api` (mounted in `apps/api/src/app.ts`). "Auth" column: **Public** = no authentication; **Auth** = `requireAuth` (valid session, any role); **Admin** = `requireAuth` + `requireAdmin`. Response envelope for all endpoints (CONFIRMED, `apps/api/src/lib/apiResponse.ts`): success responses are `{success: true, data: ...}`; errors are `{success: false, error: {code, message, details?}}`.

## 9.1 Auth — `/api/auth` (`auth.routes.ts`)

| Method | Path | Auth | Rate limit | Purpose |
|---|---|---|---|---|
| POST | `/register` | Public | 30/15min | Create account, set session cookie |
| POST | `/login` | Public | 30/15min | Authenticate, set session cookie |
| POST | `/logout` | Public | — | Clear session cookie |
| GET | `/me` | Auth | — | Current user profile |

## 9.2 Events — `/api/events` (`events.routes.ts`)

All routes below `router.use(requireAuth)`; every `/:eventId/*` route additionally runs `auditAdminEventActions()`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List the caller's events + guest/table summary |
| POST | `/` | Create event |
| GET | `/:eventId` | Get one event |
| PUT | `/:eventId` | Update event (owner or admin) |
| DELETE | `/:eventId` | Delete event (owner only, no admin bypass) |
| GET | `/:eventId/dashboard` | Per-event stats dashboard |
| GET | `/:eventId/rsvp` | RSVP dashboard (delegates to `rsvp.controller.dashboard`) |
| GET | `/:eventId/invitation-card` | Invitation card metadata |
| GET | `/:eventId/invitation-card/file` | Download invitation card bytes |
| POST | `/:eventId/invitation-card` | Upload/replace invitation card (multipart, ≤8MB) |
| DELETE | `/:eventId/invitation-card` | Delete invitation card |
| GET | `/:eventId/cover-image` | Download event cover image |
| POST | `/:eventId/cover-image` | Upload cover image (multipart, ≤5MB) |

Nested under `/:eventId/*` (each its own router, `mergeParams`): `guests`, `seating`, `vendors`, `products`, `orders`, `payouts`, `ticket-types` — see §9.3–9.9.

## 9.3 Guests — `/api/events/:eventId/guests` (`guests.routes.ts`) and `/api/guests/:guestId` (`guestById.routes.ts`)

| Method | Path (relative to `/guests`) | Purpose |
|---|---|---|
| GET | `/` | List/search/filter guests |
| POST | `/` | Create guest |
| POST | `/import` | Bulk CSV import (multipart) |
| GET | `/export` | Export guest list as CSV |
| GET | `/export/pdf` | Export guest list as PDF |
| GET | `/wristbands/pdf` | Export printable QR wristbands/badges PDF |
| GET | `/:guestId` | Get one guest |
| PUT | `/:guestId` | Update guest |
| DELETE | `/:guestId` | Delete guest |
| POST | `/:guestId/checkin` | Manual check-in |
| DELETE | `/:guestId/checkin` | Check-out (undo) |
| POST | `/checkin/scan` | Door check-in by scanning invitation QR token |
| GET | `/:guestId/invite` | Get/create invite link + QR |
| POST | `/:guestId/invite/mark-sent` | Mark invite sent via a given channel |
| POST | `/:guestId/invite/email` | Send invite email (Resend) |
| POST | `/invites/send-email` | Bulk-send invite emails |

`guestById.routes.ts`, mounted at `/api/guests`, exposes `GET/PUT/DELETE /:guestId` again as a top-level, explicitly `requireAuth`-gated alternative path to the same service functions (CONFIRMED — imports the same `guests.controller.ts`).

## 9.4 Seating — `/api/events/:eventId/seating` (`seating.routes.ts`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/map` | Full seating map (layout + tables + unassigned confirmed guests) |
| GET | `/map/export/pdf` | Seating map as PDF |
| GET | `/layout` | Get (or auto-create) venue layout |
| PUT | `/layout` | Update layout settings |
| POST | `/layout/objects` | Add a decor object |
| PUT | `/layout/objects/:objectId` | Update a decor object |
| DELETE | `/layout/objects/:objectId` | Delete a decor object |
| GET | `/tables` | List tables |
| POST | `/tables` | Create table (auto-creates its seats) |
| PUT | `/tables/:tableId` | Update table (may reconcile seat count) |
| DELETE | `/tables/:tableId` | Delete table |
| POST | `/assignments` | Assign a guest (+ party) to a table/seat |
| DELETE | `/assignments/:guestId` | Unassign a guest (+ party) |
| DELETE | `/assignments/party/:partyMemberId` | Unassign a single named party member |

## 9.5 Vendors — `/api/events/:eventId/vendors` (`vendors.routes.ts`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List vendors (filter by status/category) |
| GET | `/summary` | Totals + per-currency cost breakdown |
| POST | `/` | Create vendor |
| PUT | `/:vendorId` | Update vendor |
| DELETE | `/:vendorId` | Delete vendor |

## 9.6 Merchandise — planner side (`/api/events/:eventId/products`, `/orders`) and guest side (`/api/shop`)

`products.routes.ts` (planner, auth via parent router):

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List products (+ sold counts) |
| POST | `/` | Create product |
| PUT | `/:productId` | Update product |
| DELETE | `/:productId` | Delete product |
| GET | `/:productId/image` | Download product image |
| POST | `/:productId/image` | Upload product image (multipart, ≤5MB) |

`orders.routes.ts` (planner, auth via parent router):

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List non-pending orders for the event |
| GET | `/summary` | Total sales / order count / items sold |
| GET | `/payment-events` | Every payment attempt logged for this event |

`shop.routes.ts` (public, mounted at `/api/shop`):

| Method | Path | Rate limit | Purpose |
|---|---|---|---|
| GET | `/:token/products` | 60/min | Public shop listing (by `rsvpToken`) |
| GET | `/products/:productId/image` | 60/min | Public product image |
| POST | `/:token/checkout` | 20/15min | Start checkout |
| POST | `/:token/checkout/paypal/capture` | 20/15min | Capture an approved PayPal order |

`webhook.routes.ts` (public, mounted directly in `app.ts` at `/api/webhooks`, **before** the JSON body parser):

| Method | Path | Purpose |
|---|---|---|
| POST | `/stripe` | Stripe webhook (raw body, signature-verified) |
| POST | `/paystack` | Paystack webhook (raw body, HMAC-SHA512-verified) |

## 9.7 Payouts — `/api/events/:eventId/payouts` (`payouts.routes.ts`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List payout accounts (with live Stripe re-sync for incomplete ones) |
| POST | `/stripe/connect` | Create/resume Stripe Express onboarding, returns Account Link URL |
| GET | `/paystack/banks` | Nigerian bank list (for the connect form dropdown) |
| POST | `/paystack/connect` | Connect a Paystack Subaccount |
| POST | `/paypal/connect` | Save a PayPal payee email |
| DELETE | `/:payoutAccountId` | Disconnect a payout account |

## 9.8 Tickets — planner side (`/api/events/:eventId/ticket-types`) and public side (`/api/tickets`)

`ticketTypes.routes.ts` (planner, auth via parent router):

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List ticket types |
| POST | `/` | Create ticket type |
| POST | `/reorder` | Reorder ticket types |
| POST | `/scan` | Door check-in by scanning a ticket's code |
| PUT | `/:ticketTypeId` | Update ticket type |
| DELETE | `/:ticketTypeId` | Delete (blocked if `quantitySold > 0`) |

`checkout.routes.ts` (public, mounted at `/api/tickets`):

| Method | Path | Rate limit | Purpose |
|---|---|---|---|
| GET | `/events/:slug` | 60/min | Public event + on-sale ticket types |
| GET | `/events/:slug/cover-image` | 60/min | Public cover image |
| GET | `/orders/:orderId` | 60/min | Order + issued ticket codes (confirmation page) |
| POST | `/events/:slug/checkout` | 20/15min | Reserve capacity + start checkout |
| POST | `/events/:slug/checkout/paypal/capture` | 20/15min | Capture an approved PayPal ticket order |

## 9.9 RSVP — `/api/rsvp` (`rsvp.routes.ts`, fully public)

| Method | Path | Rate limit | Purpose |
|---|---|---|---|
| GET | `/invite/:invitationToken` | 60/min | Public event + guest prefill via personal invite token |
| POST | `/invite/:invitationToken` | 20/15min (configurable) | Submit RSVP via personal invite token |
| GET | `/invite/:invitationToken/invitation-card` | 60/min | Invitation card via invite token |
| GET | `/:token/invitation-card` | 60/min | Invitation card via shared event token |
| GET | `/:token` | 60/min | Public event via shared token |
| POST | `/:token` | 20/15min (configurable) | Submit RSVP via shared token |

## 9.10 Notifications — `/api/notifications` (`notifications.routes.ts`, all Auth)

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List notifications (optional `unreadOnly`) |
| PUT | `/read-all` | Mark all read |
| PUT | `/:notificationId/read` | Mark one read |

## 9.11 Insights — `/api/insights` (`insights.routes.ts`, Auth)

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | "Needs Attention" insights, optionally scoped to one `eventId` query param |

## 9.12 Analytics — `/api/analytics` (`analytics.routes.ts`, Auth)

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Cross-event analytics overview for the caller |

## 9.13 Admin — `/api/admin/*` (all Admin-only)

`admin.routes.ts` (mounted at `/api/admin`):

| Method | Path | Purpose |
|---|---|---|
| GET | `/users` | All subscribers |
| GET | `/events` | All events (with owner info) |
| GET | `/audit-log` | Admin action audit log (filterable) |
| GET | `/payment-events` | Cross-subscriber payment event log (filterable) |
| GET | `/analytics` | Platform-wide analytics rollup |

`articles.admin.routes.ts` (mounted at `/api/admin/articles`):

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List all articles |
| POST | `/` | Create article |
| GET | `/:articleId` | Get one article |
| PUT | `/:articleId` | Update article |
| DELETE | `/:articleId` | Delete article |
| POST | `/:articleId/publish` | Publish |
| POST | `/:articleId/unpublish` | Unpublish |
| GET | `/:articleId/cover-image` | Download cover image |
| POST | `/:articleId/cover-image` | Upload cover image |

`landing.admin.routes.ts` (mounted at `/api/admin/services`):

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List all landing services |
| POST | `/` | Create service |
| POST | `/reorder` | Reorder services |
| PUT | `/:serviceId` | Update service |
| DELETE | `/:serviceId` | Delete service |

## 9.14 Public content — `/api/articles`, `/api/landing`

`articles.public.routes.ts` (mounted at `/api/articles`, Public):

| Method | Path | Rate limit | Purpose |
|---|---|---|---|
| GET | `/` | 120/min | Published article list |
| GET | `/:slug` | 120/min | Single published article |
| GET | `/:slug/cover-image` | 120/min | Article cover image |

`landing.public.routes.ts` (mounted at `/api/landing`, Public):

| Method | Path | Rate limit | Purpose |
|---|---|---|---|
| GET | `/services` | 60/min | Active landing service cards |

## 9.15 Platform

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Liveness + DB connectivity check (mounted directly in `app.ts`, not under `/api`) |

## 9.16 Endpoint count

Counting every row in the tables above (including both `guests.routes.ts` and `guestById.routes.ts` guest-by-id paths as distinct mounts, and the `/health` liveness route): **122 endpoints** across **22 route files** (21 module route files plus `webhook.routes.ts`, mounted directly in `app.ts`). See [22-application-inventory.md](22-application-inventory.md) for the full counting methodology and per-module breakdown.
