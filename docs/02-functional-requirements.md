# 02 — Functional Requirements

Requirements below describe behaviour actually implemented in the codebase (CONFIRMED unless marked otherwise), expressed as requirement statements for traceability purposes (see [21-traceability-matrix.md](21-traceability-matrix.md)). Each cites its primary evidence file(s).

## Authentication & Accounts

- **FR-001**: The system shall allow a new user to register with name, email, and password; email must be a valid address and password must be ≥8 characters, containing at least one letter and one number. Evidence: `apps/api/src/modules/auth/auth.schema.ts` (`registerSchema`).
- **FR-002**: The system shall reject registration if the email is already in use. Evidence: `apps/api/src/modules/auth/auth.service.ts` (`registerUser` → `ConflictError`).
- **FR-003**: The system shall store passwords only as bcrypt hashes (12 salt rounds). Evidence: `apps/api/src/utils/password.ts`.
- **FR-004**: The system shall allow a registered user to log in with email/password and receive a signed JWT delivered as an httpOnly cookie, with the same token also returned in the response body for bearer-token use. Evidence: `apps/api/src/modules/auth/auth.controller.ts`.
- **FR-005**: The system shall allow a logged-in user to log out, clearing the session cookie. Evidence: `apps/api/src/modules/auth/auth.controller.ts` (`logout`).
- **FR-006**: The system shall expose the current authenticated user's profile via `GET /api/auth/me`. Evidence: `apps/api/src/modules/auth/auth.routes.ts`.
- **FR-007**: The system shall rate-limit registration and login to 30 requests per 15 minutes per client. Evidence: `apps/api/src/modules/auth/auth.routes.ts`.

## Event Management

- **FR-010**: The system shall allow a planner to create an event with name, type, date, and optional description, times, venue, capacity, image, RSVP deadline, and per-field RSVP toggles. Evidence: `apps/api/src/modules/events/events.schema.ts`, `events.service.ts` (`createEvent`).
- **FR-011**: The system shall generate a unique, unguessable `rsvpToken` for every event at creation. Evidence: `apps/api/prisma/schema.prisma` (`Event.rsvpToken @unique @default(cuid())`).
- **FR-012**: The system shall allow a planner to update or delete only events they own; an ADMIN may update (but never delete) another subscriber's event. Evidence: `apps/api/src/modules/events/events.service.ts` (`getOwnedEvent` vs. `getOwnedEventStrict`, used by `deleteEvent`).
- **FR-013**: The system shall allow a planner to upload a PNG/JPEG/WEBP cover image up to 5MB per event, stored as bytes in the database. Evidence: `apps/api/src/modules/events/events.service.ts` (`uploadEventCoverImage`).
- **FR-014**: The system shall compute and return a per-event dashboard of guest/table/RSVP/dietary/check-in statistics. Evidence: `apps/api/src/modules/events/events.service.ts` (`getEventDashboard`).
- **FR-015**: The system shall list a planner's events with an attached lightweight guest/table summary per event. Evidence: `apps/api/src/modules/events/events.service.ts` (`listEvents`).
- **FR-016**: The system shall allow a planner to mark an event `isPublic`, generating an immutable, unique `publicSlug` the first time it is made public. Evidence: `apps/api/src/modules/events/events.service.ts` (`updateEvent`, `ensureUniqueEventSlug`).

## Guest Management

- **FR-020**: The system shall allow a planner to add, edit, and delete guests on an event they own, including named accompanying party members ("+1"s). Evidence: `apps/api/src/modules/guests/guests.service.ts`.
- **FR-021**: The system shall allow searching/filtering the guest list by name/email/group, RSVP status, seat-assignment state, check-in state, VIP flag, and presence of dietary requirements. Evidence: `apps/api/src/modules/guests/guests.schema.ts` (`listGuestsQuerySchema`), `guests.service.ts` (`listGuests`).
- **FR-022**: The system shall support bulk guest import via CSV upload. Evidence: `apps/api/src/modules/guests/guests.routes.ts` (`POST /import`), `guests.service.ts` (`bulkCreateGuests`).
- **FR-023**: The system shall support exporting the guest list as CSV and as PDF, and exporting printable QR wristbands/badges as PDF. Evidence: `apps/api/src/modules/guests/guests.routes.ts` (`/export`, `/export/pdf`, `/wristbands/pdf`).
- **FR-024**: The system shall allow a planner to manually check a guest in/out, and to check a guest in by scanning their invitation QR code. Evidence: `apps/api/src/modules/guests/guests.service.ts` (`checkInGuest`, `checkOutGuest`), `invite.service.ts` (`checkInGuestByToken`).
- **FR-025**: The system shall free a guest's (and their party's) seat assignment automatically if their RSVP status moves away from CONFIRMED. Evidence: `apps/api/src/utils/rsvpMath.ts` (`shouldReleaseSeatOnStatusChange`), `guests.service.ts` (`updateGuest`).

## RSVP (Guest-Facing, Public)

- **FR-030**: The system shall serve a public RSVP page for any valid event `rsvpToken`, without login. Evidence: `apps/api/src/modules/rsvp/rsvp.routes.ts`, `rsvp.service.ts` (`getPublicEventByToken`).
- **FR-031**: The system shall accept RSVP submissions (attending status, party names, meal/dietary/accessibility/notes as enabled per event) via the shared token and via a personalised invitation token, matching an existing invited guest by email then by name where possible. Evidence: `apps/api/src/modules/rsvp/rsvp.service.ts` (`submitRsvp`, `submitRsvpViaInvitation`).
- **FR-032**: The system shall reject RSVP submissions once the event's RSVP deadline has passed or `rsvpOpen` is false. Evidence: `apps/api/src/modules/rsvp/rsvp.service.ts` (`checkRsvpIsOpen`).
- **FR-033**: The system shall rate-limit RSVP submission (default 20/15 min, configurable) and RSVP reads (60/min). Evidence: `apps/api/src/modules/rsvp/rsvp.routes.ts`.
- **FR-034**: The system shall notify the event owner in-app when a guest confirms or declines. Evidence: `apps/api/src/modules/notifications/notifications.service.ts` (`notifyRsvpChange`).

## Invitations

- **FR-040**: The system shall generate a per-guest personalised invitation link and QR code on demand. Evidence: `apps/api/src/modules/guests/invite.service.ts` (`getInviteLink`).
- **FR-041**: The system shall send invitation emails (with embedded QR and optional uploaded invitation card attachment) via Resend, when configured. Evidence: `apps/api/src/modules/guests/invite.service.ts` (`sendInviteEmail`, `getResendClient`).
- **FR-042**: The system shall support bulk-sending invite emails to all or selected guests with an email address. Evidence: `apps/api/src/modules/guests/invite.service.ts` (`bulkSendInviteEmails`).
- **FR-043**: The system shall allow a planner to upload, replace, and delete a single designed invitation card (PDF/PNG/JPEG, ≤8MB) per event. Evidence: `apps/api/src/modules/events/invitationCard.service.ts`.

## Seating Planner

- **FR-050**: The system shall provide a venue layout (canvas size, grid, background) with placeable decor objects (stage, bar, dance floor, etc.) per event, auto-created on first access. Evidence: `apps/api/src/modules/seating/seating.service.ts` (`getOrCreateLayout`).
- **FR-051**: The system shall support creating tables of various shapes with a defined seat capacity, auto-generating one `Seat` row per capacity unit. Evidence: `apps/api/src/modules/seating/seating.service.ts` (`createTable`).
- **FR-052**: The system shall support assigning a confirmed guest (and, automatically, their named party members to nearby seats) to a table, enforcing capacity unless explicitly overridden. Evidence: `apps/api/src/modules/seating/seating.service.ts` (`assignGuest`), `apps/api/src/utils/capacity.ts` (`canAssignGuest`).
- **FR-053**: The system shall, when a table's capacity is reduced below its currently seated count, unseat the highest-numbered seats' occupants (whole party, not partial) and report who was unseated. Evidence: `apps/api/src/modules/seating/seating.service.ts` (`updateTable`).
- **FR-054**: The system shall support unassigning a whole guest party, or a single named party member, from their seat independently. Evidence: `apps/api/src/modules/seating/seating.service.ts` (`unassignGuest`, `unassignPartyMember`).
- **FR-055**: The system shall export the seating map as a PDF. Evidence: `apps/api/src/modules/seating/seating.routes.ts` (`GET /map/export/pdf`).

## Vendors

- **FR-060**: The system shall allow a planner to track vendors per event with category, status, contact info, cost, currency, and deposit-paid flag. Evidence: `apps/api/src/modules/vendors/vendors.service.ts`.
- **FR-061**: The system shall report vendor cost totals grouped by currency rather than a single blended sum. Evidence: `apps/api/src/modules/vendors/vendors.service.ts` (`groupCostsByCurrency`, `getVendorSummary`).
- **FR-062**: The system shall notify the event owner when a vendor's status changes. Evidence: `apps/api/src/modules/notifications/notifications.service.ts` (`notifyVendorStatusChanged`).

## Merchandise (Event Shop)

- **FR-070**: The system shall allow a planner to create products with name, description, price, currency, stock quantity (or unlimited), active flag, and an optional image. Evidence: `apps/api/src/modules/products/products.service.ts`.
- **FR-071**: The system shall expose an "shop enabled" toggle per event (`merchandiseEnabled`) gating whether guests see the shop at all. Evidence: `apps/api/prisma/schema.prisma` (`Event.merchandiseEnabled`), `products.service.ts` (`listPublicProducts`).
- **FR-072**: The system shall let a guest add active, in-stock products to a cart and check out via any connected, currency-matching payment provider. Evidence: `apps/api/src/modules/products/orders.service.ts` (`createCheckoutSession`).
- **FR-073**: The system shall reject a cart mixing items priced in different currencies. Evidence: `apps/api/src/modules/products/orders.service.ts` (`createCheckoutSession`).
- **FR-074**: The system shall decrement stock only when an order is confirmed PAID by the processor, not at checkout initiation. Evidence: `apps/api/src/modules/products/orders.service.ts` (`finalizeOrderPaid`).

## Payments / Payouts

- **FR-080**: The system shall let a planner connect a Stripe Express account (USD/GBP), a Paystack Subaccount (NGN), and/or a PayPal payee email (any of the three currencies) as payout destinations, per event, per currency. Evidence: `apps/api/src/modules/payouts/payouts.service.ts`.
- **FR-081**: The system shall route guest checkout to a specific connected+ready payout account, defaulting to a fixed preference order (Stripe Connect → Paystack → PayPal) when the guest doesn't choose. Evidence: `apps/api/src/modules/products/orders.service.ts` (`DEFAULT_PROVIDER_PREFERENCE`).
- **FR-082**: The system shall capture a platform fee on every paid order via the processor's own fee mechanism, at a percentage read from configuration at checkout time and frozen onto the order thereafter. Evidence: `apps/api/src/config/env.ts`, `apps/api/prisma/schema.prisma` (`Order.platformFeeCents`).
- **FR-083**: The system shall verify Stripe and Paystack webhook signatures before trusting any payment-confirmation payload. Evidence: `apps/api/src/modules/products/orders.service.ts` (`handleStripeWebhook`, `handlePaystackWebhook`).
- **FR-084**: The system shall log every payment provider event (success, failure, expiry) to a queryable `PaymentEvent` record, independent of order status. Evidence: `apps/api/src/modules/products/orders.service.ts` (`logPaymentEvent`).

## Ticketing (Public Events)

- **FR-090**: The system shall let a planner define one or more ticket types (price, currency, capacity, sales window, min/max per order) for a public event. Evidence: `apps/api/src/modules/tickets/ticketTypes.service.ts`.
- **FR-091**: The system shall serve a public, unauthenticated ticket-purchase page keyed by an event's `publicSlug`. Evidence: `apps/api/src/modules/tickets/checkout.service.ts` (`getPublicTicketEvent`).
- **FR-092**: The system shall atomically reserve ticket-type capacity at the moment a checkout session is created (not at payment confirmation), to prevent overselling under concurrent checkouts. Evidence: `apps/api/src/modules/tickets/ticketTypes.service.ts` (`reserveTickets`, raw SQL `UPDATE ... WHERE`).
- **FR-093**: The system shall release reserved capacity if a ticket checkout expires, is declined, or is cancelled before payment. Evidence: `apps/api/src/modules/products/orders.service.ts` (`releasePendingTicketOrder`).
- **FR-094**: The system shall issue one individually-scannable `Ticket` row (unique `code`) per unit purchased once an order is confirmed PAID. Evidence: `apps/api/src/modules/products/orders.service.ts` (`finalizeOrderPaid`).
- **FR-095**: The system shall support door check-in of a ticket by scanning its `code`, idempotently (re-scanning an already-checked-in ticket does not error but is flagged). Evidence: `apps/api/src/modules/tickets/ticketTypes.service.ts` (`checkInTicketByCode`).

## Notifications & Insights

- **FR-100**: The system shall generate in-app notifications for RSVP changes, vendor status changes, and paid orders (merchandise or ticket). Evidence: `apps/api/src/modules/notifications/notifications.service.ts`.
- **FR-101**: The system shall allow marking one or all notifications as read. Evidence: `apps/api/src/modules/notifications/notifications.routes.ts`.
- **FR-102**: The system shall compute "Needs Attention" insights on demand (approaching RSVP deadlines, unassigned VIPs/confirmed guests, missing meal selections, pending responses) without persisting them. Evidence: `apps/api/src/modules/insights/insights.service.ts`.

## Analytics

- **FR-110**: The system shall provide a planner-level cross-event analytics overview (RSVP funnel, check-in rate, vendor spend by currency, per-event breakdown). Evidence: `apps/api/src/modules/analytics/analytics.service.ts`.
- **FR-111**: The system shall provide a platform-wide analytics rollup for admins (subscriber/event/guest counts, RSVP confirmation rate, revenue by currency and provider, 30-day signup/event trend). Evidence: `apps/api/src/modules/admin/admin.service.ts` (`getPlatformAnalytics`).

## Admin / Support

- **FR-120**: The system shall restrict `/api/admin/*` routes to authenticated users with `role = ADMIN`. Evidence: `apps/api/src/middleware/auth.ts` (`requireAdmin`).
- **FR-121**: The system shall let an admin list all subscribers and all events across the platform. Evidence: `apps/api/src/modules/admin/admin.service.ts` (`listAllUsers`, `listAllEvents`).
- **FR-122**: The system shall let an admin act on a subscriber's event through the same endpoints the subscriber uses, without a separate admin-only event API. Evidence: `apps/api/src/modules/events/events.service.ts` (`getOwnedEvent` admin bypass).
- **FR-123**: The system shall write an audit log entry for every non-GET, successful request an admin makes against an event they do not own. Evidence: `apps/api/src/middleware/auditAdminEventActions.ts`.
- **FR-124**: The system shall prevent an admin from deleting a subscriber's event or from creating/changing a subscriber's payout account details, even in support mode. Evidence: `apps/api/src/modules/events/events.service.ts` (`getOwnedEventStrict`, used by `deleteEvent`), `apps/api/src/modules/payouts/payouts.service.ts` (`connectStripe`/`connectPaystack`/`connectPaypal` all call `getOwnedEventStrict`).

## Public Content (Marketing)

- **FR-130**: The system shall serve a public marketing landing page including an FAQ section and admin-managed "Services" cards. Evidence: `apps/web/src/pages/marketing/LandingPage.tsx`, `apps/api/src/modules/landing/*`.
- **FR-131**: The system shall let an admin author, edit, publish/unpublish, and delete blog articles, each with an auto-generated immutable slug. Evidence: `apps/api/src/modules/articles/articles.service.ts`.
- **FR-132**: The system shall serve published articles publicly at `/articles` and `/articles/:slug`. Evidence: `apps/api/src/modules/articles/articles.public.routes.ts`.

## Platform / Non-functional

- **FR-140**: The system shall expose a `/health` endpoint that checks database connectivity. Evidence: `apps/api/src/app.ts`.
- **FR-141**: The system shall be installable as a Progressive Web App (manifest + service worker + install prompt). Evidence: `apps/web/public/manifest.webmanifest`, `apps/web/public/sw.js`, `apps/web/src/components/InstallPrompt.tsx`.
- **FR-142**: The system shall apply security headers (Helmet) and restrict CORS to a configured origin list. Evidence: `apps/api/src/app.ts`.
