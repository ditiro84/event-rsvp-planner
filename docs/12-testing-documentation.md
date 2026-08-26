# 12 — Testing Documentation

## 12.1 Test strategy (as implemented)

CONFIRMED — `apps/api/package.json` scripts (`test`, `test:watch`, `test:integration`), `apps/api/vitest.config.ts` / `apps/api/vitest.integration.config.ts` (existence confirmed; contents not read in this pass), `.github/workflows/ci.yml`.

The backend (`apps/api`) has two distinct automated test tiers, both using Vitest:

1. **Unit tests** (`apps/api/tests/unit/*.test.ts`) — test pure business-logic functions with no database, run via `npm test` / `vitest.config.ts`.
2. **Integration tests** (`apps/api/tests/integration/*.test.ts`) — exercise the Express app end-to-end via Supertest against a real PostgreSQL database, run via `vitest run --config vitest.integration.config.ts`. `apps/api/tests/setup/globalSetup.ts` exists (CONFIRMED by file listing) to provision the database for this tier; `embedded-postgres` is listed as a devDependency in `apps/api/package.json`, consistent with spinning up an ephemeral local Postgres for integration runs, though the exact mechanism (embedded-postgres locally vs. the CI Postgres service container) was not verified by reading `globalSetup.ts` line-by-line in this pass — INFERRED from dependency presence and CI configuration, not directly confirmed.

The frontend (`apps/web`) has **no automated test files** — CONFIRMED by the absence of any `test`/`vitest`/`jest` script in `apps/web/package.json` (only `dev`, `build`, `lint`, `typecheck`, `preview`) and no test runner listed among its dependencies. Frontend quality gating in CI is limited to `typecheck`, `lint`, and `build` succeeding (see [13-test-automation-documentation.md](13-test-automation-documentation.md)).

There is no end-to-end (browser-driven, e.g. Playwright/Cypress) test suite anywhere in the repository — UNKNOWN/not present, confirmed by the absence of any such dependency in either `package.json`.

## 12.2 Existing automated test inventory

| File | Type | Module(s) covered |
|---|---|---|
| `tests/unit/rsvpMath.test.ts` | Unit | `utils/rsvpMath.ts` — RSVP stat computation, seat-release rule |
| `tests/unit/capacity.test.ts` | Unit | `utils/capacity.ts` — table capacity/assignment decision rules |
| `tests/unit/inviteEmail.test.ts` | Unit | Invite email HTML/content generation logic |
| `tests/integration/auth.test.ts` | Integration | Register/login/logout/me |
| `tests/integration/events.test.ts` | Integration | Event CRUD, ownership |
| `tests/integration/guests.test.ts` | Integration | Guest CRUD, list/filter, CSV import/export, check-in |
| `tests/integration/rsvp.test.ts` | Integration | Public RSVP submission flow |
| `tests/integration/seating.test.ts` | Integration | Layout, tables, seat assignment/unassignment |
| `tests/integration/invitationCard.test.ts` | Integration | Invitation card upload/download/delete |
| `tests/integration/vendors.test.ts` | Integration | Vendor CRUD, summary |
| `tests/integration/notifications.test.ts` | Integration | Notification listing, mark read |
| `tests/integration/insights.test.ts` | Integration | "Needs Attention" insight generation |
| `tests/integration/analytics.test.ts` | Integration | Cross-event analytics overview |
| `tests/integration/merchandise.test.ts` | Integration | Products, checkout, orders (merchandise) |
| `tests/integration/payouts.test.ts` | Integration | Payout account connect/list/disconnect |
| `tests/integration/ticketTypes.test.ts` | Integration | Ticket type CRUD (and, by route co-location, likely the `/scan` door check-in endpoint — CONFIRMED file exists; exact scenario coverage inside it was not read line-by-line this pass) |
| `tests/integration/admin.test.ts` | Integration | Admin user/event listing, audit log, payment events, platform analytics |
| `tests/integration/articles.test.ts` | Integration | Article admin CRUD + public read |
| `tests/integration/landingServices.test.ts` | Integration | Landing service admin CRUD + public read |
| `tests/helpers/authHelpers.ts` | Helper | Shared login/token helpers for integration tests |
| `tests/helpers/testApp.ts` | Helper | Shared Express app instance for Supertest |
| `tests/setup/globalSetup.ts` | Setup | Test database provisioning |

CONFIRMED — full file listing via `Glob apps/api/tests/**/*.ts`, 21 files total (3 unit + 16 integration + 2 helpers + 1 setup — note this differs from the file *count* cited elsewhere for "distinct test files with assertions," which is 19: 3 unit + 16 integration).

## 12.3 Confirmed coverage gap: public ticket checkout

No test file corresponds to `apps/api/src/modules/tickets/checkout.service.ts` or `checkout.routes.ts` (public ticket purchase: capacity reservation under concurrency, provider routing, PayPal capture, order finalization → ticket issuance). This is a **confirmed gap**, not a speculative one — the file listing in §12.2 is exhaustive for `apps/api/tests/**`, and no file named anything resembling `ticketCheckout`/`checkout`/`ticketOrders` exists. This matches this project's own internal task tracking, which records "Backend tests: ticket checkout + issuance + door scan" as still pending. See [20-known-issues-risks-technical-debt.md](20-known-issues-risks-technical-debt.md) for risk framing.

## 12.4 Coverage matrix (module vs. test tier)

| Module | Unit test | Integration test | Notes |
|---|---|---|---|
| Auth | — | ✅ `auth.test.ts` | |
| Events | — | ✅ `events.test.ts` | |
| Guests | — | ✅ `guests.test.ts` | |
| RSVP | ✅ `rsvpMath.test.ts` (pure logic) | ✅ `rsvp.test.ts` | |
| Invitations / email | ✅ `inviteEmail.test.ts` | — | No integration test found for `invite.service.ts`'s `getInviteLink`/`sendInviteEmail`/`bulkSendInviteEmails` HTTP endpoints specifically — INFERRED gap, not exhaustively cross-checked against `guests.test.ts` contents in this pass |
| Invitation card | — | ✅ `invitationCard.test.ts` | |
| Seating | ✅ `capacity.test.ts` (pure logic) | ✅ `seating.test.ts` | |
| Vendors | — | ✅ `vendors.test.ts` | |
| Merchandise (products/orders/webhooks) | — | ✅ `merchandise.test.ts` | Webhook signature-failure paths specifically not confirmed covered — see §12.5 |
| Payouts | — | ✅ `payouts.test.ts` | |
| Ticket types (CRUD + scan) | — | ✅ `ticketTypes.test.ts` | |
| **Ticket checkout (public purchase flow)** | — | **None found** | Confirmed gap, §12.3 |
| Notifications | — | ✅ `notifications.test.ts` | |
| Insights | — | ✅ `insights.test.ts` | |
| Analytics (planner) | — | ✅ `analytics.test.ts` | |
| Admin (users/events/audit/payment-events/platform analytics) | — | ✅ `admin.test.ts` | |
| Articles | — | ✅ `articles.test.ts` | |
| Landing services | — | ✅ `landingServices.test.ts` | |
| Frontend (all of `apps/web`) | — | — | No automated frontend tests exist at all |

## 12.5 Scenario catalogue: existing vs. recommended-but-missing

The following distinguishes scenarios this documentation effort has direct evidence are tested (by file existence — exact assertions inside each file were not individually re-verified line-by-line in this pass beyond what's cited elsewhere in this pack) from scenarios that appear untested based on the absence of any corresponding file/section.

**Existing (file-confirmed):**
- Registration/login happy path and duplicate-email/invalid-credential rejection (`auth.test.ts`).
- Event ownership enforcement (`events.test.ts`).
- RSVP submission via shared token, deadline enforcement (`rsvp.test.ts`, `rsvpMath.test.ts`).
- Seat assignment capacity rules, party seating (`seating.test.ts`, `capacity.test.ts`).
- Vendor CRUD and currency-grouped summary (`vendors.test.ts`).
- Merchandise checkout and webhook-driven order finalization (`merchandise.test.ts`).
- Payout account connection flows (`payouts.test.ts`).
- Ticket type CRUD (`ticketTypes.test.ts`).
- Admin cross-subscriber listing, audit log, platform analytics (`admin.test.ts`).

**Recommended but missing (no corresponding test file/section found):**
- Public ticket checkout: concurrent reservation race (two buyers, last ticket), provider routing, PayPal capture, `finalizeOrderPaid` issuing correct ticket count. See §12.3.
- Door check-in scan for both guests (`checkInGuestByToken`) and tickets (`checkInTicketByCode`), specifically the idempotent re-scan (`alreadyCheckedIn`) and cancelled-ticket-rejection branches — INFERRED as likely partially covered inside `guests.test.ts`/`ticketTypes.test.ts` given the endpoints live in those route files, but not confirmed by direct reading of assertions in this pass.
- Stripe/Paystack webhook **signature verification failure** paths (wrong/missing signature → 400) — not confirmed present or absent without reading `merchandise.test.ts`'s assertions directly; flagged as recommended regardless, since this is a security-relevant boundary.
- Any frontend behaviour whatsoever (form validation, seating canvas drag interactions, checkout UI state) — no frontend test tooling exists to test it with.
- Rate-limiting behaviour (that limits actually trigger a 429/`RATE_LIMITED` response under load) — the rate limiters are configured (CONFIRMED, route files) but no test file was found asserting their triggering behaviour.
- CSV import with malformed/partial rows (see [24-documentation-gap-analysis.md](24-documentation-gap-analysis.md) for why this specific behaviour is UNKNOWN).

## 12.6 CI enforcement of tests

Both the unit and integration suites run on every push/PR to `main`/`develop` via the `api` job in `.github/workflows/ci.yml`, against a real `postgres:16-alpine` service container (not a mock), after `prisma generate` and `prisma migrate deploy`. A failing test fails the CI job, which (INFERRED standard GitHub branch-protection behaviour, not itself confirmed configured) would typically block a PR merge if branch protection rules require the check — whether such branch protection rules are actually enabled on this repository is UNKNOWN from the files reviewed (branch protection is a GitHub repository setting, not something expressed in the `.yml` file itself).
