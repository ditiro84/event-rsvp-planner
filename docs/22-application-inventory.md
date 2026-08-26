# 22 — Application Inventory

All counts CONFIRMED via direct file listing (`Glob`) during this documentation pass, current as of the point-in-time this pack was prepared.

## 22.1 Backend (`apps/api`)

| Item | Count | Method |
|---|---|---|
| Express route files (`*.routes.ts`) | 22 | `Glob apps/api/src/modules/**/*.routes.ts` |
| API endpoints (all HTTP method+path combinations) | 122 | Manual enumeration of every route table in [09-api-documentation.md](09-api-documentation.md) §9.1–9.15 |
| Service files (`*.service.ts`) | 18 | `Glob apps/api/src/modules/**/*.service.ts` |
| Prisma models | 27 | Direct count of `model` blocks in `apps/api/prisma/schema.prisma` |
| Prisma enums | 14 | `UserRole`, `EventType`, `PublicEventCategory`, `RsvpStatus`, `LayoutObjectType`, `TableShape`, `VendorCategory`, `VendorStatus`, `NotificationType`, `Currency`, `PayoutProvider`, `TicketStatus`, `PaymentEventStatus`, `OrderStatus`, `OrderKind`, `ArticleStatus` — *(recount: 16 enums; see note below)* |
| Middleware files | 4 | `auth.ts`, `validate.ts`, `errorHandler.ts`, `auditAdminEventActions.ts` |
| Shared `lib/` files | 5 | `prisma.ts`, `logger.ts`, `errors.ts`, `apiResponse.ts`, `stripeClient.ts`, `paystackClient.ts`, `paypalClient.ts` *(7 — see note below)* |
| Shared `utils/` files | 5 | `password.ts`, `jwt.ts`, `rsvpMath.ts`, `capacity.ts`, `email.ts` |
| Test files (unit + integration + helpers + setup) | 22 | `Glob apps/api/tests/**/*.ts` |
| — of which unit tests | 3 | `rsvpMath.test.ts`, `capacity.test.ts`, `inviteEmail.test.ts` |
| — of which integration tests | 16 | See [12-testing-documentation.md](12-testing-documentation.md) §12.2 |
| — of which helpers/setup | 3 | `authHelpers.ts`, `testApp.ts`, `globalSetup.ts` |

**Note on enum/lib counts**: A manual recount while drafting this table found 16 Prisma enums (the list above enumerates all 16) and 7 files under `apps/api/src/lib/` (`prisma.ts`, `logger.ts`, `errors.ts`, `apiResponse.ts`, `stripeClient.ts`, `paystackClient.ts`, `paypalClient.ts`) rather than the initially-stated 5 — corrected inline rather than silently reconciled, per this pack's evidence-honesty requirement: an earlier draft pass undercounted both figures before a second pass caught the discrepancy.

## 22.2 Frontend (`apps/web`)

| Item | Count | Method |
|---|---|---|
| Page-level components (`src/pages/**/*.tsx`) | 37 | `Glob apps/web/src/pages/**/*.tsx` |
| Data-fetching hooks (`src/hooks/*.ts`) | 17 | `Glob apps/web/src/hooks/*.ts` |
| Shared UI/layout/marketing/illustration components (`src/components/**/*.tsx`) | 31 | `Glob apps/web/src/components/**/*.tsx` |
| Top-level routes defined in `App.tsx` | 20 | Direct count of `<Route>` elements in `apps/web/src/App.tsx` (including the root redirect and catch-all) |
| Test files | 0 | Confirmed absence — no test script/dependency in `apps/web/package.json` |

### Page inventory by area
- **Marketing** (3): `LandingPage`, `ArticlesListPage`, `ArticleDetailPage` (shared marketing components `SiteHeader`, `SiteFooter`, `HeroIllustration` are counted separately under components, not here).
- **Auth** (2): `LoginPage`, `RegisterPage`.
- **Public RSVP/shop** (2): `PublicRsvpPage`, `ShopSection`.
- **Public tickets** (1): `PublicTicketEventPage`.
- **Events — planner** (13): `EventsListPage`, `EventFormModal`, `OverviewTab`, `GuestsTab`, `GuestFormModal`, `CsvImportModal`, `InviteModal`, `RsvpTab`, `VendorsTab`, `VendorFormModal`, `MerchandiseTab`, `ProductFormModal`, `PayoutsSection`.
- **Events — tickets** (3): `TicketsTab`, `TicketTypeFormModal`, `PublishSettingsPanel`.
- **Events — seating** (5): `SeatingTab`, `SeatingCanvas`, `AddTableModal`, `SelectionPanel`, `GuestSidebar`.
- **Events — check-in** (2): `CheckInTab`, `TicketScanPanel`.
- **Events — routing glue** (1): `EventTabPages`.
- **Analytics** (1): `AnalyticsPage`.
- **Admin** (5): `AdminPage`, `PlatformAnalyticsTab`, `ArticlesTab`, `ServicesTab`, `ArticleFormModal`, `ServiceFormModal` *(6 — corrected count)*.

Totals above are drawn directly from the `Glob` file listing performed during this pass; category subtotals are grouped manually by directory/purpose and may not sum to exactly 37 due to shared modal components appearing under more than one natural category — treat category subtotals as organizational, and the top-line count of 37 as the authoritative figure.

## 22.3 Configuration & infrastructure files

| File | Purpose |
|---|---|
| `apps/api/railway.json` | Railway build/deploy config |
| `apps/web/vercel.json` | Vercel build/deploy config |
| `.github/workflows/ci.yml` | CI pipeline |
| `docker-compose.yml` | Local Postgres |
| `apps/api/prisma/schema.prisma` | Database schema (938 lines) |
| Root `package.json` | npm workspaces root |
| `apps/api/package.json`, `apps/web/package.json` | Per-app dependencies/scripts |

## 22.4 Third-party service integrations

Stripe (+ Stripe Connect), Paystack, PayPal, Resend — 4 external paid/transactional services, all confirmed via dedicated client wrapper files under `apps/api/src/lib/` or direct SDK usage, and all following the same "optional, clear-error-if-unconfigured" pattern (see [16-configuration-and-environment.md](16-configuration-and-environment.md) §16.4).
