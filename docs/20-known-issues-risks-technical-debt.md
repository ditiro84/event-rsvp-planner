# 20 — Known Issues, Risks & Technical Debt

Severity is a judgment call applied during this documentation pass based on observed impact, not a rating taken from an existing issue tracker (no issue tracker was reviewed as part of this effort — GitHub Issues, if any, were not read). Each item is marked **Confirmed** (directly observed in code/config) or **Potential** (a risk inferred from an absence or pattern, not directly proven).

## Critical

None identified as Critical from static review alone. Any item that would warrant this severity (e.g. an authentication bypass or unrestricted financial mutation) would require dynamic testing to confirm exploitability, which was explicitly out of scope for this pack — see [14-security-documentation.md](14-security-documentation.md).

## High

| # | Issue | Status | Evidence | Impact |
|---|---|---|---|---|
| H-1 | No automated test coverage for the public ticket checkout flow (capacity reservation under concurrency, provider routing, PayPal capture, ticket issuance) | **Confirmed** | No file matching this scope exists among `apps/api/tests/**` (see [12-testing-documentation.md](12-testing-documentation.md) §12.3) | This is the payment-and-inventory-critical path for the ticketing product line; regressions here (e.g. an oversold ticket type, or a fee miscalculation) would not be caught by CI. |
| H-2 | No self-service password reset / account recovery flow | **Confirmed** | Only 4 auth routes exist (`register`, `login`, `logout`, `me`) — `apps/api/src/modules/auth/auth.routes.ts` | A locked-out planner has no in-app recovery path; support must intervene manually, and the mechanism for doing so is itself undocumented in the code reviewed. |
| H-3 | JWT sessions are not revocable; "logout" only clears the client cookie | **Confirmed** | `apps/api/src/modules/auth/auth.controller.ts` (`logout`), `apps/api/src/utils/jwt.ts` (no blocklist) | A token captured before logout remains valid for up to 7 days (the default `JWT_EXPIRES_IN`) regardless of the user logging out. |

## Medium

| # | Issue | Status | Evidence | Impact |
|---|---|---|---|---|
| M-1 | `RSVPQuestion`/`RSVPAnswer` models exist in the schema with no corresponding API routes | **Confirmed** | `apps/api/prisma/schema.prisma`; no route file among the 22 reviewed exposes CRUD for either model | Dead/scaffolded schema surface — either an incomplete feature or leftover design exploration; adds schema complexity with no current functional benefit, and could confuse future maintainers about whether custom RSVP questions are supported. |
| M-2 | `AdminAuditLog` writes are fire-and-forget with silently swallowed failures | **Confirmed** | `apps/api/src/middleware/auditAdminEventActions.ts` (`.catch(() => undefined)`) | An admin support action's audit trail entry can silently fail to be written, with no alerting — undermines the accountability goal the audit log exists for, in the specific case where the write itself fails. |
| M-3 | Database migration failures on deploy do not block the API server from starting | **Confirmed** | `apps/api/railway.json` (`startCommand` runs `node dist/index.js` unconditionally after the migration step, regardless of its exit code) | A failed migration could leave the running application out of sync with the actual database schema, likely surfacing as confusing runtime errors rather than a clearly failed deployment. |
| M-4 | No CSRF-specific mitigation identified for cookie-authenticated requests beyond CORS origin restriction | **Potential** | Absence of any CSRF middleware in `apps/api/src/middleware/*`; `sameSite: "none"` cookie in production | Whether this is an actual exploitable gap depends on browser same-site cookie enforcement and the CORS allow-list holding correctly in all deployed environments — not verified by testing. |
| M-5 | CSV guest-import row-level validation/error-handling behaviour is undocumented from source read in this pass | **Potential** | Controller-level CSV parsing logic in `guests.controller.ts` was not read line-by-line this pass | Unknown whether a malformed row fails the whole import batch, is silently skipped, or is rejected with a clear per-row error — affects planner experience and data quality; see [24-documentation-gap-analysis.md](24-documentation-gap-analysis.md). |
| M-6 | No account lockout after repeated failed login attempts, beyond a shared IP-based rate limit | **Confirmed** (absence) | `apps/api/src/modules/auth/auth.routes.ts` (only a 30/15min IP-keyed limiter) | A distributed brute-force attempt (many source IPs) against a single account is not mitigated by the current limiter design. |

## Low

| # | Issue | Status | Evidence | Impact |
|---|---|---|---|---|
| L-1 | Both `pino-http` and `morgan` are listed as backend dependencies, but only `pino-http` was observed wired into `app.ts` | **Potential** | `apps/api/package.json` lists both; `apps/api/src/app.ts` only imports/uses `pino-http` | Likely an unused dependency left over from an earlier logging setup — minor bundle/attack-surface bloat, not a functional issue. |
| L-2 | `nanoid` is a listed dependency with no confirmed usage site in the files read this pass (Prisma's own `cuid()` is used for all model IDs) | **Potential** | `apps/api/package.json`; no `import ... from "nanoid"` encountered across the modules read | Possibly unused, or used in a file not reviewed this pass (e.g. a script or a module not covered) — flagged for verification rather than asserted as certainly dead. |
| L-3 | No coverage-percentage enforcement, mutation testing, or accessibility (a11y) automated testing | **Confirmed** (absence) | No such tooling in `apps/api/package.json` / `apps/web/package.json` / `ci.yml` | Standard maturity gap for a project at this stage; not urgent but worth planning for as the codebase grows. |
| L-4 | No automated end-to-end (browser-driven) test suite | **Confirmed** (absence) | No Playwright/Cypress/similar dependency in either `package.json` | Multi-step user journeys (e.g. full guest RSVP → seating → check-in) are only verified manually or via the API-level integration tests, not through the actual UI. |
| L-5 | Frontend has zero automated test coverage of any kind | **Confirmed** (absence) | No test script/dependency in `apps/web/package.json` | All frontend correctness currently depends on TypeScript's type checking, linting, and manual verification. |

## Architectural notes (not defects, but worth surfacing)

- The event dashboard (`getEventDashboard`) issues roughly 15 separate database queries per load (13 in parallel, 2 sequential follow-ups) — `apps/api/src/modules/events/events.service.ts`. Not confirmed to be a performance problem (no load testing was performed), but is the kind of pattern worth watching as guest-list sizes grow. **Potential**, not Confirmed as an actual bottleneck.
- The "admin bypass via the owner-scoped endpoints" architecture (see [10-roles-and-permissions.md](10-roles-and-permissions.md) §10.3) is an elegant way to avoid a parallel admin API, but it does mean every new owner-scoped endpoint added in the future automatically becomes admin-accessible unless a developer remembers to explicitly exclude it (as was done for event deletion and payout connection) — a process/discipline risk rather than a current code defect.

## Explicitly out of scope for this list

Business/product-strategy gaps (e.g. "should EventFlow support a fourth payment processor," "should there be a mobile native app") are not technical debt and are not listed here — this document covers implementation-level issues only, per the brief.
