# 05 — Functional Specification

Module-by-module behavioural detail. All statements CONFIRMED against the cited file unless marked INFERRED/UNKNOWN.

## 5.1 Auth module (`apps/api/src/modules/auth`)

Files: `auth.routes.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.schema.ts`.

- Registration (`POST /api/auth/register`): validates via Zod (`registerSchema`), rejects duplicate email with 409 `CONFLICT`, hashes password with bcrypt (12 rounds), signs a JWT `{userId}` with `env.jwtExpiresIn` (default `7d`), sets it as an httpOnly cookie (`event_rsvp_token` by default) and returns it in the JSON body as well.
- Login (`POST /api/auth/login`): looks up by email, 401 `UNAUTHORIZED` ("Invalid email or password") for both a missing user and a wrong password — deliberately not distinguished, to avoid user enumeration. INFERRED intent (not stated in a comment, but the identical error message for both cases is the CONFIRMED code behaviour).
- Logout (`POST /api/auth/logout`): clears the cookie; does not require authentication to call (no `requireAuth` on this route) and does not invalidate the JWT server-side — a previously-issued token/cookie value remains cryptographically valid until its 7-day expiry even after "logout" (see [14-security-documentation.md](14-security-documentation.md)).
- `GET /api/auth/me`: requires auth, returns the current user's `{id, email, name, role, createdAt}`.
- Cookie attributes: `httpOnly: true`, `secure: env.isProduction`, `sameSite: "none"` in production / `"lax"` in development, `maxAge: 7 days`, `path: "/"`.

## 5.2 Events module (`apps/api/src/modules/events`)

Files: `events.routes.ts`, `events.controller.ts` (not read line-by-line this pass but routes confirm shape), `events.service.ts`, `events.schema.ts`, `invitationCard.service.ts`.

- `getOwnedEvent(userId, eventId)` is the single ownership gate reused by every nested module (guests, seating, vendors, products, orders, payouts, ticket types, invitation card). It returns the event if `event.userId === userId`, OR if the requesting user's role is `ADMIN` — otherwise throws `NotFoundError` (never `ForbiddenError`, so an admin-blocked or non-existent event ID look identical to a prober).
- `getOwnedEventStrict` is the same check with no admin bypass, used only for: deleting an event, and connecting/changing a payout account (Stripe/Paystack/PayPal).
- Event creation defaults: `allowPlusOnes`, `allowPlusOneNames`, `allowMealSelection`, `allowDietary`, `allowAccessibilityInfo`, `allowSpecialRequests` all default `true` unless specified.
- `publicSlug` is generated once (slugified from the event name, deduplicated with a `-2`, `-3`, … suffix on collision) the first time `isPublic` is set true, and is never regenerated afterward even if the event name later changes.
- Cover image upload accepts PNG/JPEG/WEBP up to 5MB, stored as `Bytes` in Postgres (`coverImageData`/`coverImageMimeType` columns), not an external object store.
- `getEventDashboard` computes 13 distinct counts in parallel (`Promise.all`) plus two follow-up queries (unassigned confirmed count, party-size aggregate) — 15 total queries per dashboard load. INFERRED performance note: this is a repository-level micro-optimization observation, not a stated design comment; see [20-known-issues-risks-technical-debt.md](20-known-issues-risks-technical-debt.md) for whether this is flagged as a concern.

## 5.3 Guests module (`apps/api/src/modules/guests`)

Files: `guests.routes.ts` (nested), `guestById.routes.ts` (top-level `/api/guests/:guestId`), `guests.service.ts`, `guests.schema.ts`, `invite.service.ts`.

- Two mount points exist for guest-by-ID operations: nested under `/api/events/:eventId/guests/:guestId` and top-level at `/api/guests/:guestId` (the latter requires `requireAuth` explicitly since it isn't behind the events router's auth). Both ultimately call the same `guests.service.ts` functions.
- `listGuests` supports search (name/email/group, case-insensitive `contains`), status filter, assigned/unassigned filter, checked-in filter, VIP filter, and "has dietary requirements" filter, plus sort by last/first name, RSVP status, or creation date.
- `createGuest`/`updateGuest` accept an `additionalGuestNames` array; if provided, `additionalGuestsCount` is derived from its length (overriding any explicitly passed count) and a `GuestParty` row is created per name. `updateGuest` fully replaces the party list (delete-all, re-create) rather than diffing.
- Check-in writes to two places atomically in one transaction: the `Guest.checkedIn`/`checkedInAt` flags (used everywhere else in the app) and a `CheckIn` audit row (`upsert`, so it's idempotent per guest) recording who checked them in.
- CSV import (`bulkCreateGuests`) creates all rows in one `$transaction` array — an all-or-nothing batch insert with no per-row validation feedback beyond whatever Zod validation happens before the call (INFERRED from `guests.routes.ts`: `upload.single("file")` → `controller.importCsv`, CSV parsing itself lives in the controller, not reviewed line-by-line this pass — UNKNOWN whether malformed individual rows are skipped or fail the whole batch; flagged in [24-documentation-gap-analysis.md](24-documentation-gap-analysis.md)).

## 5.4 RSVP module (`apps/api/src/modules/rsvp`)

Files: `rsvp.routes.ts`, `rsvp.service.ts`, `rsvp.schema.ts`.

- Fully public/unauthenticated router, mounted at `/api/rsvp`. No `requireAuth` anywhere in this file.
- Two entry paths: `/api/rsvp/:token` (shared event-level `rsvpToken`) and `/api/rsvp/invite/:invitationToken` (personalised). The invite-token path resolves directly to a specific guest with no name/email matching ambiguity; the shared-token path attempts to match an existing invited guest by email (case-insensitive), then by exact first+last name (case-insensitive), before falling back to creating a new `Guest` row.
- `checkRsvpIsOpen` blocks submission if `event.rsvpOpen` is false OR `rsvpDeadline` has passed — both reads happen fresh per request (no caching), so a deadline passing mid-session is enforced on the next write.
- Rate limits: submission at `env.rsvpRateLimitMax`/`env.rsvpRateLimitWindowMs` (defaults 20 requests / 15 minutes), reads at a fixed 60/minute — both keyed by client IP (`express-rate-limit` default keying; INFERRED, standard library default, not overridden in this file).
- On any RSVP status change away from CONFIRMED, seating assignments are deleted within the same transaction as the guest update.

## 5.5 Seating module (`apps/api/src/modules/seating`)

Files: `seating.routes.ts`, `seating.service.ts`, `seating.schema.ts`.

- Venue layout: one `VenueLayout` per event, auto-created with defaults (`canvasWidth: 1600`, `canvasHeight: 1000`, `gridSize: 20`, `backgroundColor: "#f8fafc"`) on first `GET`/`PUT` if it doesn't exist yet. Decor objects (`LayoutObject`) are freeform positioned/sized/rotated/coloured shapes typed from a fixed enum (`STAGE`, `DANCE_FLOOR`, `BAR`, `BUFFET`, `ENTRANCE`, `EXIT`, `TOILETS`, `DJ_BOOTH`, `VIP_AREA`, `CUSTOM`).
- Tables: creating a table with `capacity: N` creates exactly `N` `Seat` rows numbered 1..N. Table shapes: `ROUND | SQUARE | RECTANGLE | OVAL | BANQUET | HEAD | CUSTOM`.
- `assignGuest` is the most complex function in the module: it resolves (a) whether a specific seat was requested or any free seat should be picked, (b) whether the target seat/table has room for the guest's whole party (guest + named `GuestParty` members), (c) seats party members via an outward search from the anchor seat (alternating +1/-1 seat-number offset, wrapping around the table) so a party is seated contiguously where possible, and (d) atomically clears any prior assignment for the guest and each party member before creating the new ones (required because `SeatingAssignment.guestId` and `PartySeatingAssignment.partyMemberId` are both `@unique`).
- Declining guests can still be assigned (with a warning, not a block) — a planner may want to seat someone who declined online but is expected to show up anyway. INFERRED rationale from the code comment in `capacity.ts`.
- `updateTable` capacity-shrink behaviour: removes the highest-`seatNumber` seats first; for each removed seat that was occupied (by a guest directly or by a party member), the **entire party** sharing that guest is unassigned (assignment rows deleted, not the seat/guest itself), and their names are returned to the caller for UI display.

## 5.6 Vendors module (`apps/api/src/modules/vendors`)

Files: `vendors.routes.ts`, `vendors.service.ts`, `vendors.schema.ts`.

- CRUD scoped to one event via `getOwnedEvent`. `cost` is accepted/returned in whole currency units by the API layer but stored as `costCents` (integer, `Math.round(dollars * 100)`).
- `getVendorSummary` returns both a single blended `totalCost` (kept "for backwards compatibility", per the code comment) and `costsByCurrency` (an array of `{currency, total}`, sorted alphabetically by currency code) — the frontend Vendors tab and Analytics page display the per-currency breakdown, not the blended figure (see [06-ui-ux-specification.md](06-ui-ux-specification.md)).
- Changing a vendor's `status` field triggers an in-app notification to the event owner; changing any other field does not.

## 5.7 Products / Orders (Merchandise) module (`apps/api/src/modules/products`)

Files: `products.routes.ts`, `products.service.ts`, `products.schema.ts`, `orders.routes.ts`, `orders.controller.ts`, `orders.service.ts`, `orders.schema.ts`, `shop.routes.ts`, `webhook.routes.ts`.

- Planner-side CRUD (`products.routes.ts`, requires auth via the parent events router) vs. guest-facing public routes (`shop.routes.ts`, no auth, keyed by `rsvpToken`) are separate route files sharing `products.service.ts`/`orders.service.ts`.
- `listPublicProducts` returns `enabled: false` with an empty product list if `Event.merchandiseEnabled` is false, without leaking the event's product catalogue. It also returns `paymentOptionsByCurrency` so the shop UI can disable currencies with no connected, ready payout account.
- Checkout (`createCheckoutSession`) validates: product existence/eventId match, active flag is implicit (only active products are listed publicly, but the service re-validates against `active: true` at checkout too — CONFIRMED, `products.findMany({..., active: true})` in `createCheckoutSession`), stock sufficiency, single-currency cart, and at least one connected+ready payout account for that currency. It then creates a `PENDING` `Order` + `OrderItem`s, computes `platformFeeCents` from `env.platformFeePercent`, and dispatches to one of three provider-specific checkout starters based on the chosen (or preferred-default) provider. If the provider call throws, the `PENDING` order is deleted (no orphaned rows).
- Stripe checkout uses Stripe Checkout Sessions in `mode: "payment"` with a Connect **destination charge**: `application_fee_amount` (our cut) + `transfer_data.destination` (planner's connected account) on the `payment_intent_data`.
- Paystack checkout uses `/transaction/initialize` with the amount in the smallest currency unit (kobo, matching our own cents convention 1:1) and a `subaccount` code for the split (percentage fixed at subaccount-creation time, not re-specified per transaction).
- PayPal checkout creates a PayPal Order routed via `payee.email_address`; it first attempts to attach `payment_instruction.platform_fees` (our cut) and, if PayPal rejects that (no Partner/BN-code enrollment), silently retries without a fee so checkout still completes — the order's `platformFeeCents` is set to 0 in that fallback case, not the originally computed value, so the on-file fee always matches what was actually collected.
- Webhooks (`webhook.routes.ts`) are mounted in `app.ts` **before** the global `express.json()` parser, using `express.raw()` for exactly these two paths, so Stripe/Paystack signature verification sees the untouched raw bytes.
- `finalizeOrderPaid` is the single shared "mark PAID" transition for both merchandise and ticket orders (differentiated by `Order.kind`): for `TICKET` orders it creates one `Ticket` row per unit with a random `code`; for `MERCHANDISE` orders it decrements `Product.stockQuantity` (only for products with a non-null stock quantity — unlimited-stock products are left untouched).
- Every payment provider event (success, decline, expiry) — not just ones ending in a paid order — is written to `PaymentEvent` via a best-effort `logPaymentEvent` helper that swallows its own errors so a logging failure never breaks the payment flow itself.

## 5.8 Payouts module (`apps/api/src/modules/payouts`)

Files: `payouts.routes.ts`, `payouts.service.ts`, `payouts.schema.ts`.

- `isPayoutAccountConnected` is the single source of truth for "ready to accept payments": Stripe Connect requires `stripeOnboardingComplete = true`, Paystack requires a saved `paystackSubaccountCode`, PayPal requires a saved `paypalEmail`.
- `listPayoutAccounts` actively re-syncs any Stripe account still marked incomplete by calling Stripe's Accounts API directly (`charges_enabled && payouts_enabled`) — a belt-and-suspenders fallback for missed/delayed `account.updated` webhooks, run on every list-fetch for incomplete Stripe accounts specifically (not for already-complete ones).
- Stripe Connect: creates an Express account (`business_type: "individual"`, `capabilities: {card_payments, transfers}`) scoped to `US` (USD) or `GB` (GBP) — no other countries are supported, since NGN routes through Paystack instead. Returns a fresh, single-use Account Link to Stripe's hosted onboarding UI; safe to call again for an incomplete account (a fresh link is issued each time).
- Paystack: resolves the account-number/bank-code pair against Paystack's `/bank/resolve` endpoint before creating anything, then creates a Subaccount with `percentage_charge` fixed to the *current* `env.platformFeePercent` at creation time — a later change to that env var does not retroactively change already-connected subaccounts' split. The raw account number is sent to Paystack in this one request and never persisted; only the resulting `subaccount_code` and a masked last-4 are stored.
- PayPal: no hosted onboarding — just saves the planner's PayPal email as the payee for `payee.email_address`-routed orders.
- `connectStripe`, `connectPaystack`, and `connectPaypal` all call `getOwnedEventStrict` (no admin bypass) — an admin browsing a subscriber's event in support mode cannot create or modify that subscriber's payout destinations.

## 5.9 Tickets module (`apps/api/src/modules/tickets`)

Files: `ticketTypes.routes.ts`, `ticketTypes.controller.ts`, `ticketTypes.service.ts`, `ticketTypes.schema.ts`, `checkout.routes.ts`, `checkout.controller.ts`, `checkout.service.ts`, `checkout.schema.ts`.

- Ticket types are scoped per-event, ordered by an explicit `sortOrder` (drag-reorderable via `POST /reorder`, which verifies every submitted id belongs to the event before touching anything).
- `deleteTicketType` is blocked once `quantitySold > 0` — the planner must set the type inactive (`isActive: false`) instead of deleting a type with sales history, preserving `OrderItem`/`Ticket` referential integrity.
- Capacity reservation (`reserveTickets`) uses a single conditional `UPDATE ... SET "quantitySold" = "quantitySold" + n WHERE "isActive" = true AND ("quantityTotal" IS NULL OR "quantityTotal" - "quantitySold" >= n)` raw SQL statement rather than a read-then-write pair — this is what makes concurrent checkouts for the last remaining ticket race-safe at the database level, not just at the application level.
- Public checkout (`createTicketCheckoutSession`) re-validates on-sale window (`salesStartAt`/`salesEndAt`), min/max-per-order bounds, remaining capacity, and single-currency-cart, in addition to reserving capacity — all inside one `$transaction`, so a failed reservation rolls back the whole attempted order creation.
- Ticket checkout reuses the exact same `startStripeCheckout`/`startPaystackCheckout`/`startPaypalCheckout`/`capturePaypalOrderCore` functions from `orders.service.ts` (imported directly, not duplicated) — merchandise and ticket checkout are two callers of one shared payment-provider integration layer.
- Door check-in (`checkInTicketByCode`) is a separate credential/flow from guest check-in (`checkInGuestByToken` in the guests module) — ticket buyers have no `Guest` row at all, so there is nothing to key a guest-list lookup off.

## 5.10 Notifications module (`apps/api/src/modules/notifications`)

- Notifications are created as a direct side effect inside the service function that causes them (RSVP change, vendor status change, order paid) — there is no generic event bus/queue. INFERRED design rationale from the code comment: "keeping generation as small, targeted helpers ... matching the rest of the codebase's direct-call style," explicitly chosen over a more generic mechanism at the app's current size.
- `listNotifications` supports an `unreadOnly` filter and returns both the page of notifications and a separate always-fresh unread count.

## 5.11 Insights module (`apps/api/src/modules/insights`)

- Computed on every request from live guest/event data — no `Insight` table exists; an insight simply stops being returned once its underlying condition resolves.
- Insight types generated: RSVP deadline within 7 days, unassigned VIP guests (individually, up to 5, then rolled into a summary count), unassigned non-VIP confirmed guests (rolled into one summary insight), missing meal selections (only checked if `allowMealSelection` is on for that event), and outstanding (pending/maybe) responses. Each is tagged `ACTION_REQUIRED` or `UPDATE` severity and sorted with `ACTION_REQUIRED` first.
- Can be scoped to a single event or run across all of a planner's events (`GET /api/insights?eventId=...` optional).

## 5.12 Analytics module (`apps/api/src/modules/analytics`) and Admin analytics

- Planner analytics (`getAnalyticsOverview`) is entirely derived from current `Event`/`Guest`/`Vendor` rows — there is no historical snapshot table, so there are no true trend lines over time at the per-planner level (only the platform-wide admin view has a day-by-day trend, see below).
- Platform analytics (`admin.service.ts` `getPlatformAnalytics`) additionally computes a 30-day signup/event-creation trend via a raw SQL query using Postgres `generate_series` LEFT JOINed against per-day counts, so days with zero activity still appear as zero rather than being absent from the series.
- Revenue is always reported as an array grouped by `(currency, provider)`, never summed into one number — the code comment explicitly states this is deliberate ("summing cents across USD/GBP/NGN would be meaningless").

## 5.13 Admin module (`apps/api/src/modules/admin`)

- `listAllUsers`/`listAllEvents` are cross-subscriber views with no owner-scoped equivalent (a planner never sees another planner's list) — these exist only under `/api/admin`.
- `getAuditLog`/`getPaymentEvents` support optional filters (`eventId`, `adminUserId` / `eventId`, `orderId`, `status`, `provider`) and a `limit`.
- Admin event drill-in deliberately has **no** separate `/api/admin/events/:id/*` sub-API — it reuses `/api/events/:eventId/*` end to end via the ownership-bypass mechanism described in §5.2.

## 5.14 Articles & Landing modules

- Articles: admin-only CRUD + publish/unpublish workflow (`DRAFT`/`PUBLISHED` via `ArticleStatus`), auto-generated immutable slug (same collision-suffix pattern as event `publicSlug`), optional cover image (bytes-in-Postgres). Public reads only ever return `status: PUBLISHED` articles, ordered by `publishedAt` (not `createdAt`) so republishing an old draft brings it back to the top of the list.
- Landing services ("what we offer" cards): admin-only CRUD + reorder (`sortOrder`), public read returns only `isActive: true` rows ordered by `sortOrder`. `icon` is a string constrained to a fixed enum on the frontend (`SERVICE_ICON_OPTIONS` in `apps/web/src/types/index.ts`), not free-text/SVG — explicitly to avoid it becoming an injection vector (code comment in `landing.schema.ts`, INFERRED to be an XSS-prevention rationale from the comment text "not free-text/SVG upload, to keep this from becoming an XSS vector").
