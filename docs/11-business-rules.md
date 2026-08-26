# 11 — Business Rules

Rules extracted from service-layer logic. All CONFIRMED against the cited file unless marked otherwise.

## Access & ownership

- **BR-001**: A user can only read or mutate an event if they own it, or if they hold the `ADMIN` role. All other requesters receive a 404 (not 403), so event existence is never disclosed to an unauthorized caller. `events.service.ts` `getOwnedEvent`.
- **BR-002**: Deleting an event, and connecting/modifying a payout account, are permitted for the owner only — the ADMIN bypass does not apply to these two actions. `events.service.ts` `getOwnedEventStrict`; `payouts.service.ts`.
- **BR-003**: A ticket type with `quantitySold > 0` cannot be deleted; it must be set inactive instead. `ticketTypes.service.ts` `deleteTicketType`.

## RSVP & guests

- **BR-010**: An RSVP submission is rejected if the event's `rsvpOpen` flag is false, or if `rsvpDeadline` has passed. `rsvp.service.ts` `checkRsvpIsOpen`.
- **BR-011**: When matching a shared-link RSVP submission to an existing invited guest, the system matches by email first (case-insensitive exact match), then by first+last name (case-insensitive exact match), and only creates a new guest if neither matches. `rsvp.service.ts` `submitRsvp`.
- **BR-012**: A guest's `additionalGuestsCount` is only meaningful when `rsvpStatus = CONFIRMED`; a non-confirmed submission always resets it to 0. `rsvp.service.ts` `guestUpdateData`.
- **BR-013**: Whenever a guest's RSVP status transitions away from `CONFIRMED`, any existing seat assignment for that guest and for their whole named party is deleted. `utils/rsvpMath.ts` `shouldReleaseSeatOnStatusChange`; enforced in both `guests.service.ts updateGuest` and `rsvp.service.ts submitRsvp`/`submitRsvpViaInvitation`.
- **BR-014**: Updating a guest's `additionalGuestNames` array fully replaces the existing named-party list (delete-all, then re-create) rather than diffing individual entries.

## Seating & capacity

- **BR-020**: A guest cannot be assigned to a table if doing so (accounting for their whole party's size) would exceed the table's capacity, unless the caller explicitly sets `overrideCapacity = true`. `utils/capacity.ts` `canAssignGuest`.
- **BR-021**: A guest who declined the invitation may still be assigned a seat, with a non-blocking warning returned to the caller — this is allowed by design, not an oversight. `utils/capacity.ts` `canAssignGuest`.
- **BR-022**: A guest can hold at most one active seat assignment at a time; assigning them elsewhere clears the prior assignment as part of the same operation. `seating.service.ts` `assignGuest` (relies on the `@unique` constraint on `SeatingAssignment.guestId`).
- **BR-023**: Reducing a table's capacity below its currently occupied seat count unseats occupants starting from the highest seat number; if an unseated seat belonged to a guest or a named party member, that guest's **entire party** is unassigned as a unit, never partially. `seating.service.ts` `updateTable`.
- **BR-024**: Named party members are seated as close as possible to their primary guest's seat (searching outward, alternating +1/−1 seat-number offset, wrapping around the table), not assigned arbitrarily. `seating.service.ts` `assignGuest`.

## Vendors & merchandise

- **BR-030**: Vendor and product costs are tracked per-currency; totals spanning multiple currencies within one event are always reported as a per-currency breakdown, never summed into one blended figure. `vendors.service.ts` `groupCostsByCurrency`; `analytics.service.ts` (identical local helper).
- **BR-031**: A cart cannot mix items priced in different currencies; checkout is rejected outright if it does. `orders.service.ts` `createCheckoutSession`; `tickets/checkout.service.ts` `createTicketCheckoutSession`.
- **BR-032**: Product stock is decremented only when an order reaches `PAID` status (confirmed by the payment processor), never at checkout initiation — an abandoned checkout never reduces available stock. `orders.service.ts` `finalizeOrderPaid`.
- **BR-033**: A product hidden via `active = false` remains visible in the planner's own product list and order history, but disappears from the public shop listing.

## Payments & payouts

- **BR-040**: Checkout may only proceed against a currency for which the event has at least one `EventPayoutAccount` that is "connected" — Stripe Connect requires completed onboarding, Paystack requires a saved subaccount code, PayPal requires a saved payee email. `payouts.service.ts` `isPayoutAccountConnected`.
- **BR-041**: If the buyer does not explicitly choose a payment provider, the system defaults to the first available in the fixed order Stripe Connect → Paystack → PayPal. `orders.service.ts` `DEFAULT_PROVIDER_PREFERENCE`.
- **BR-042**: The platform fee percentage applied to an order is read from configuration at the moment of checkout and frozen onto that order (`Order.platformFeeCents`); a later change to the configured percentage never retroactively changes an already-placed order's fee. `apps/api/prisma/schema.prisma` (`Order.platformFeeCents` comment); `orders.service.ts`.
- **BR-043**: Merchandise orders and ticket orders use independently configurable platform fee percentages (`PLATFORM_FEE_PERCENT` vs. `TICKET_FEE_PERCENT`), both currently defaulted to 5%. `apps/api/src/config/env.ts`.
- **BR-044**: If PayPal rejects an attempt to attach a platform fee (no Partner/BN-code enrollment), the system retries the same order without a fee rather than failing the checkout, and records `platformFeeCents = 0` on that order to match what was actually collected. `lib/paypalClient.ts` `createPaypalOrder`; `orders.service.ts` `startPaypalCheckout`.
- **BR-045**: An order is only ever marked `PAID` as a result of a signature-verified webhook (Stripe/Paystack) or a server-initiated PayPal capture call — never from a client-supplied "I paid" signal. `orders.service.ts` `handleStripeWebhook`, `handlePaystackWebhook`, `capturePaypalOrderCore`.
- **BR-046**: Every payment provider event received — success, decline, failure, or expiry — is logged to `PaymentEvent`, independent of whether it results in a change to order status. `orders.service.ts` `logPaymentEvent`.
- **BR-047**: A Paystack subaccount's platform fee percentage (`percentage_charge`) is fixed at the moment the planner connects it; changing the global fee configuration afterward does not alter already-connected subaccounts. `payouts.service.ts` `connectPaystack`.
- **BR-048**: Raw bank account numbers are never persisted in the application database, for any provider. `apps/api/prisma/schema.prisma` (`EventPayoutAccount` comment); `payouts.service.ts` `connectPaystack` (account number sent to Paystack once, not stored).

## Ticketing

- **BR-050**: Ticket-type capacity is reserved atomically at checkout-session creation (not at payment confirmation) via a single conditional SQL `UPDATE`, making concurrent checkouts for the same limited-capacity ticket type race-safe. `ticketTypes.service.ts` `reserveTickets`.
- **BR-051**: If a checkout attempt fails after capacity has been reserved (processor rejection) or a reserved order later expires/is declined, the reserved capacity is released back to the ticket type. `orders.service.ts` `releasePendingTicketOrder`; `tickets/checkout.service.ts` `createTicketCheckoutSession` catch block.
- **BR-052**: A ticket purchase must respect the ticket type's `minPerOrder`/`maxPerOrder` bounds and its sales window (`salesStartAt`/`salesEndAt`), re-validated server-side at checkout regardless of what the public listing displayed. `tickets/checkout.service.ts` `createTicketCheckoutSession`.
- **BR-053**: One `Ticket` row (with its own unique, unguessable `code`) is issued per unit purchased, only once the order is confirmed `PAID`. `orders.service.ts` `finalizeOrderPaid`.
- **BR-054**: Scanning an already-`CHECKED_IN` ticket does not error, but is flagged (`alreadyCheckedIn: true`) to the scanning staff as a possible duplicate/shared ticket; scanning a `CANCELLED` ticket is rejected outright. `ticketTypes.service.ts` `checkInTicketByCode`.

## Content & publishing

- **BR-060**: An event's `publicSlug` and an article's `slug` are each generated once (from the event/article name/title, slugified, with a numeric collision suffix if needed) and are immutable thereafter, so previously shared public links never break due to a later rename. `events.service.ts` `ensureUniqueEventSlug`; `articles.service.ts` `ensureUniqueSlug`.
- **BR-061**: Published articles are ordered publicly by `publishedAt`, not `createdAt` — republishing an older draft moves it back to the top of the public list. `articles.service.ts` `listPublishedArticles`.
- **BR-062**: A `LandingService` card's `icon` value must be one of a fixed, frontend-enumerated set — free-text/SVG icon input is not accepted, to avoid it becoming an injection vector. `apps/web/src/types/index.ts` (`SERVICE_ICON_OPTIONS`); code comment in `landing.schema.ts`.
