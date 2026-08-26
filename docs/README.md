# EventFlow — As-Built Documentation Pack

**Prepared:** 26 August 2026
**Scope:** Full reverse-engineered documentation of the EventFlow application as it exists in the repository at the time of writing (monorepo containing `apps/api` and `apps/web`).
**Method:** Static analysis of the source code, configuration files, database schema, and automated tests. No runtime instrumentation, penetration testing, or destructive testing was performed.

## How to read this pack

Every factual claim in these 24 documents is labelled with one of three evidence tags:

- **CONFIRMED** — directly observed in the source code, schema, configuration, or test files, with a file path cited as evidence.
- **INFERRED** — a reasonable conclusion drawn from code structure or naming, but not explicitly stated or directly tested/verified in the code (e.g. inferring intended UX behavior from a component's props).
- **UNKNOWN** — could not be determined from the available source. Written explicitly as "Not determined from the available source code/project artefacts" rather than guessed.

This pack documents the application **as it is currently built**. It is not a design proposal, a roadmap, or a recommendation of what the application should do. Where something looks unusual or incomplete, it is reported as observed, with any risk noted in [20-known-issues-risks-technical-debt.md](20-known-issues-risks-technical-debt.md) rather than silently corrected.

## Executive Summary

EventFlow is a two-application monorepo: a TypeScript/Express/Prisma/PostgreSQL API (`apps/api`) and a React/TypeScript/Vite/Tailwind single-page frontend (`apps/web`), deployed respectively to Railway and Vercel (CONFIRMED — `apps/api/railway.json`, `apps/web/vercel.json`). It is a SaaS product for two related but distinct use cases built on one shared data model:

1. **Private event RSVP and planning** — a subscriber ("planner") creates an event, invites guests via a shareable link/QR code or personalized invitation tokens, tracks RSVPs, assigns guests to tables on a visual drag-and-drop seating planner, manages vendors, sells optional merchandise, and checks guests in at the door.
2. **Public ticketed events** — the same planner can flip an event to `isPublic`, define one or more paid ticket types, and publish a public listing page (`/tickets/:slug`) where anyone can buy tickets without an account; tickets are issued as individually scannable QR codes for door check-in.

Both flows share one payments layer supporting three processors — Stripe Connect (USD/GBP), Paystack Subaccounts (NGN), and PayPal (cross-currency) — selected per event, per currency (CONFIRMED — `apps/api/src/modules/payouts/payouts.service.ts`, `apps/api/prisma/schema.prisma` `EventPayoutAccount` model). A platform fee (default 5%, independently configurable for merchandise vs. tickets) is taken at checkout via each processor's own fee mechanism (CONFIRMED — `apps/api/src/config/env.ts`).

The application also has an internal ADMIN role for platform support staff, who can browse all subscribers/events, drill into a subscriber's event using the exact same owner-scoped endpoints a planner uses (with every mutation logged to an audit trail), and view cross-platform analytics (CONFIRMED — `apps/api/src/modules/admin/*`, `apps/api/src/middleware/auditAdminEventActions.ts`). A public marketing site (landing page, FAQ, admin-editable "Services" cards, and an admin-authored articles/blog system) rounds out the product.

Authentication is JWT-based, delivered via an httpOnly cookie with a bearer-token fallback (CONFIRMED — `apps/api/src/middleware/auth.ts`, `apps/api/src/modules/auth/auth.controller.ts`). There are 22 Express route files and 122 distinct API endpoints (see [22-application-inventory.md](22-application-inventory.md) for the exact count and [09-api-documentation.md](09-api-documentation.md) for the full list). The Prisma schema defines 27 models. The frontend has 37 page-level components across 9 route groups. Automated test coverage consists of 3 unit test files and 16 integration test files (Vitest + Supertest), run in CI against a real PostgreSQL service container (CONFIRMED — `.github/workflows/ci.yml`).

The single largest confirmed gap in the current build is the absence of automated tests for the public ticket checkout, ticket issuance, and door-scan check-in flow — this is called out in both [12-testing-documentation.md](12-testing-documentation.md) and [20-known-issues-risks-technical-debt.md](20-known-issues-risks-technical-debt.md).

## Document index

| # | Document | Contents |
|---|---|---|
| 01 | [Application Overview](01-application-overview.md) | What EventFlow is, who it's for, high-level capability map, Mermaid context diagram |
| 02 | [Functional Requirements](02-functional-requirements.md) | FR-XXX requirement statements derived from implemented behaviour |
| 03 | [User Stories](03-user-stories.md) | User stories per persona/module |
| 04 | [BDD Acceptance Criteria](04-bdd-acceptance-criteria.md) | Gherkin Given/When/Then scenarios for core flows |
| 05 | [Functional Specification](05-functional-specification.md) | Module-by-module behavioural detail |
| 06 | [UI/UX Specification](06-ui-ux-specification.md) | Screen inventory, navigation, Mermaid user flows |
| 07 | [System Architecture](07-system-architecture.md) | 5 Mermaid diagrams: high-level, component, request/data flow, auth flow, business workflows |
| 08 | [Database Documentation](08-database-documentation.md) | ERD + per-table field tables |
| 09 | [API Documentation](09-api-documentation.md) | Every endpoint, grouped by module |
| 10 | [Roles and Permissions](10-roles-and-permissions.md) | PLANNER vs ADMIN matrix |
| 11 | [Business Rules](11-business-rules.md) | BR-XXX rule statements |
| 12 | [Testing Documentation](12-testing-documentation.md) | Test strategy, coverage matrix, existing vs. missing scenarios |
| 13 | [Test Automation Documentation](13-test-automation-documentation.md) | Frameworks, CI wiring, how to run tests |
| 14 | [Security Documentation](14-security-documentation.md) | Implemented controls, potential gaps, unable-to-determine items |
| 15 | [Deployment & Infrastructure](15-deployment-and-infrastructure.md) | Railway/Vercel/GitHub Actions/Docker |
| 16 | [Configuration & Environment](16-configuration-and-environment.md) | Every env var, secrets redacted |
| 17 | [Dependencies & Technology Stack](17-dependencies-and-technology-stack.md) | Full dependency inventory |
| 18 | [User Guide](18-user-guide.md) | Planner-facing how-to |
| 19 | [Administrator Guide](19-administrator-guide.md) | Admin-facing how-to |
| 20 | [Known Issues, Risks & Technical Debt](20-known-issues-risks-technical-debt.md) | Severity-rated, confirmed vs. potential |
| 21 | [Traceability Matrix](21-traceability-matrix.md) | Requirement → code → test cross-reference |
| 22 | [Application Inventory](22-application-inventory.md) | Counts: routes, models, pages, components, tests |
| 23 | [Glossary](23-glossary.md) | Terms and domain vocabulary |
| 24 | [Documentation Gap Analysis](24-documentation-gap-analysis.md) | What this pack could not verify and why |

## Self-review statement

Every CONFIRMED claim in this pack is backed by a specific file path cited inline, drawn from a direct reading of that file during preparation. Every INFERRED claim is labelled as such and explains the basis for the inference. Where a requested topic could not be established from the repository (e.g. production traffic volume, real incident history, actual uptime), it is marked UNKNOWN with the standard phrase "Not determined from the available source code/project artefacts" rather than estimated.
