# 24 — Documentation Gap Analysis

This document lists everything this pack could **not** establish from the repository, and why — the honest ledger the "Do Not Hallucinate" instruction requires. Anything not listed here that appears elsewhere in the pack as UNKNOWN is also cross-referenced below for completeness where material.

## 24.1 Items not verifiable from source at all

| Topic | Why unavailable | Where else referenced |
|---|---|---|
| Business metrics (subscriber count, revenue, usage volume) | Not represented in source code; would require production database/analytics access | [01-application-overview.md](01-application-overview.md) §1.5 |
| Real incident/outage history, uptime | Not represented in a static repository | [15-deployment-and-infrastructure.md](15-deployment-and-infrastructure.md) §15.7 |
| Actual production environment variable values | Correctly excluded from the repository entirely | [16-configuration-and-environment.md](16-configuration-and-environment.md) |
| Railway/Vercel dashboard-level settings (domains, scaling, branch triggers, project topology) | Platform settings, not committed files | [15-deployment-and-infrastructure.md](15-deployment-and-infrastructure.md) §15.7 |
| GitHub repository settings (branch protection, required reviews, Dependabot) | Platform settings, not expressible in a workflow YAML | [12-testing-documentation.md](12-testing-documentation.md) §12.6, [13-test-automation-documentation.md](13-test-automation-documentation.md) §13.5 |
| Dependency CVE/vulnerability status at time of reading | Requires running `npm audit` or an external scanner; not performed | [17-dependencies-and-technology-stack.md](17-dependencies-and-technology-stack.md) §17.6 |
| First-admin-account provisioning mechanism | `apps/api/prisma/seed.ts` (referenced by the `seed` npm script) was not read in this pass | [10-roles-and-permissions.md](10-roles-and-permissions.md) §10.1, [19-administrator-guide.md](19-administrator-guide.md) §19.1 |
| Runtime/dynamic security properties (timing attacks, session fixation, actual CSRF exploitability) | Requires dynamic testing, explicitly out of scope | [14-security-documentation.md](14-security-documentation.md) §14.3 |

## 24.2 Items partially read — depth limited by effort, not principle

These files/areas exist and were confirmed to exist, but were not read exhaustively line-by-line in this documentation pass; conclusions drawn about them elsewhere in this pack are therefore based on file/route naming, adjacent code, or partial reads, and are labelled INFERRED rather than CONFIRMED where they appear.

- **Controller files** (`*.controller.ts`) across most modules — routes and services were read directly (routes define the exact path/method/middleware; services define the business logic), but the thin controller layer connecting them was not individually read for every module. Controllers in this codebase are consistently thin (route → controller → service, per the pattern observed in `auth.controller.ts`, which *was* read in full), so this is assessed as low-risk, but is disclosed rather than assumed away.
- **Frontend page component internals** for most of the 37 pages listed in [22-application-inventory.md](22-application-inventory.md) — exact on-screen field lists, validation messages, and interaction details were not re-verified against source in this specific documentation pass for every screen (a subset — `DashboardLayout.tsx`, `NotificationBell.tsx`, `UserMenu.tsx`, `ProtectedRoute.tsx`, `HeroIllustration.tsx` — were read in full; others draw on this project's broader prior UI work this session plus route/hook naming). See [06-ui-ux-specification.md](06-ui-ux-specification.md) §6.7.
- **`apps/api/tests/**` assertion-level content** — every test file's existence and general scope (from its filename and the module it's named after) is confirmed, but individual `it()`/`describe()` blocks inside each file were not enumerated. Coverage statements in [12-testing-documentation.md](12-testing-documentation.md) are therefore accurate at the "a test file for this module exists" granularity, not the "this exact scenario is asserted" granularity, except where a specific scenario is called out as confirmed absent (the ticket-checkout gap, which is a file-level absence and therefore fully confirmable).
- **CSV import row-level handling** (`guests.controller.ts`) — flagged directly in [20-known-issues-risks-technical-debt.md](20-known-issues-risks-technical-debt.md) M-5 as a gap in this pass's review depth, not a confirmed defect.
- **`apps/api/prisma/migrations/`** — migration file count/history was not enumerated. See [08-database-documentation.md](08-database-documentation.md) §8.4.
- **`apps/api/Dockerfile`** — referenced by `railway.json` but its own contents (base image, build stages) were not read in this pass.
- **`apps/api/prisma/seed.ts`** — referenced by `package.json`'s `seed` script; contents not read.
- **`apps/api/vitest.config.ts` / `vitest.integration.config.ts`** — existence and role confirmed via the npm scripts that invoke them; internal configuration (coverage settings, test file globs, timeouts) not read.

## 24.3 Explicit exclusions by design of this pack

- **No destructive or exploit testing was performed** anywhere in preparing this pack, per the brief's own instruction. All security-relevant statements are therefore necessarily "what the code appears to do," not "what was proven to hold under attack."
- **No `.env.example` or environment-secret file was located and none was created** — this pack does not, and should not, contain real secret values (see [16-configuration-and-environment.md](16-configuration-and-environment.md)).
- **This pack does not redesign, recommend, or propose changes** — every observation of a gap or risk in [20-known-issues-risks-technical-debt.md](20-known-issues-risks-technical-debt.md) is reported as an as-built characteristic, not accompanied by a prescribed fix, per the "document what exists, not what should exist" instruction.

## 24.4 Recommended follow-up (if a fuller pass is wanted later)

For completeness, without implying these are urgent or that this pack is deficient for lacking them within its current scope: a follow-up pass could (a) read every remaining controller and modal/form component individually to upgrade the INFERRED UI/UX details in doc 06 to CONFIRMED, (b) enumerate the `prisma/migrations` directory for doc 08 §8.4, (c) read the assertion bodies of all 16 integration test files to produce a scenario-level (not file-level) coverage matrix for doc 12, and (d) run `npm audit`/an equivalent scanner to close the dependency-vulnerability gap noted in doc 17 §17.6.
