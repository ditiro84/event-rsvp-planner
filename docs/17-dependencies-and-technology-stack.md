# 17 — Dependencies & Technology Stack

All version numbers below are CONFIRMED directly from `apps/api/package.json` and `apps/web/package.json` (as caret ranges `^x.y.z`, i.e. the minimum version pinned; the exact resolved version installed depends on `package-lock.json`, which was not read in this pass).

## 17.1 Backend (`apps/api`) — runtime dependencies

| Package | Version | Role |
|---|---|---|
| `@prisma/client` | ^5.20.0 | ORM client |
| `express` | ^4.19.2 | HTTP framework |
| `express-async-errors` | ^3.1.1 | Allows `async` route handlers to throw without manual try/catch |
| `express-rate-limit` | ^7.4.0 | Rate limiting middleware |
| `helmet` | ^7.1.0 | Security headers |
| `cors` | ^2.8.5 | CORS handling |
| `cookie-parser` | ^1.4.6 | Cookie parsing |
| `jsonwebtoken` | ^9.0.2 | JWT sign/verify |
| `bcryptjs` | ^2.4.3 | Password hashing |
| `zod` | ^3.23.8 | Schema validation |
| `multer` | ^1.4.5-lts.1 | Multipart/file upload handling |
| `dotenv` | ^16.4.5 | Environment variable loading |
| `stripe` | ^17.3.1 | Stripe SDK (checkout + Connect) |
| `qrcode` | ^1.5.4 | QR code generation (invites) |
| `resend` | ^4.0.1 | Transactional email |
| `pdfkit` | ^0.15.0 | Server-side PDF generation (exports) |
| `csv-parse` / `csv-stringify` | ^5.5.6 / ^6.5.1 | CSV import/export |
| `pino` / `pino-http` | ^9.4.0 / ^10.3.0 | Structured logging |
| `morgan` | ^1.10.0 | HTTP request logging (present alongside pino-http — INFERRED both may not be active simultaneously in `app.ts`, which was confirmed to use `pino-http`; `morgan`'s actual usage site was not located in the files read this pass) |
| `nanoid` | ^3.3.7 | Short unique ID generation (specific usage site not confirmed this pass — Prisma's own `cuid()` is used for model IDs) |

## 17.2 Backend — development dependencies

| Package | Version | Role |
|---|---|---|
| `typescript` | ^5.6.2 | Language/compiler |
| `tsx` | ^4.19.1 | Dev-mode TS execution with watch |
| `prisma` | ^5.20.0 | Prisma CLI (migrate/generate/studio) |
| `vitest` | ^2.1.1 | Test runner |
| `supertest` | ^7.0.0 | HTTP integration test assertions |
| `embedded-postgres` | ^18.4.0-beta.17 | Ephemeral local Postgres for tests |
| `eslint` + `@typescript-eslint/*` | ^8.57.0 / ^8.5.0 | Linting |
| `pino-pretty` | ^11.2.2 | Human-readable dev log output |
| `@types/*` | various | Type definitions for the above |

## 17.3 Frontend (`apps/web`) — runtime dependencies

| Package | Version | Role |
|---|---|---|
| `react` / `react-dom` | ^18.3.1 | UI framework |
| `react-router-dom` | ^6.26.2 | Client-side routing |
| `@tanstack/react-query` | ^5.59.0 | Server-state data fetching/caching |
| `axios` | ^1.7.7 | HTTP client |
| `react-hook-form` | ^7.53.0 | Form state management |
| `@hookform/resolvers` | ^3.9.0 | Zod↔react-hook-form integration |
| `zod` | ^3.23.8 | Shared schema validation (client-side mirror of backend schemas — INFERRED shared validation intent, not confirmed as literally shared schema files) |
| `konva` / `react-konva` | ^9.3.22 / ^18.2.16 | Canvas rendering for the seating planner |
| `jsqr` | ^1.4.0 | QR code decoding (camera-based scan mode) |
| `jspdf` / `jspdf-autotable` | ^2.5.2 / ^3.8.4 | Client-side PDF generation |
| `xlsx` | ^0.18.5 | Spreadsheet export |
| `sonner` | ^1.5.0 | Toast notifications |
| `lucide-react` | ^0.446.0 | Icon set |
| `clsx` / `tailwind-merge` | ^2.1.1 / ^2.5.2 | Conditional/merged className utilities |
| `@fontsource/dm-sans` / `@fontsource/outfit` | ^5.3.0 | Self-hosted webfonts |

## 17.4 Frontend — development dependencies

| Package | Version | Role |
|---|---|---|
| `vite` | ^5.4.8 | Build tool / dev server |
| `@vitejs/plugin-react` | ^4.3.1 | React fast-refresh plugin for Vite |
| `typescript` | ^5.6.2 | Language/compiler |
| `tailwindcss` | ^3.4.13 | Utility-first CSS |
| `postcss` / `autoprefixer` | ^8.4.47 / ^10.4.20 | CSS processing pipeline for Tailwind |
| `eslint` + `@typescript-eslint/*` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` | various | Linting |

No test framework, state-management library beyond React Query/component state, or CSS-in-JS library is present in the frontend dependency list. CONFIRMED by absence.

## 17.5 Technology stack summary

| Layer | Technology |
|---|---|
| Backend language/runtime | TypeScript (compiled to CommonJS, `apps/api/package.json` `"type": "commonjs"`), Node.js ≥20 (root `package.json` `engines.node`) |
| Backend framework | Express 4 |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 (per `docker-compose.yml`/CI image; the exact production version is managed by Railway and not independently confirmed) |
| Frontend language | TypeScript, ESM (`apps/web/package.json` `"type": "module"`) |
| Frontend framework | React 18 |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Package management | npm workspaces (root `package.json`), no lockfile format other than npm's own confirmed in this pass |
| CI | GitHub Actions |
| Hosting | Railway (API), Vercel (frontend) |
| Payments | Stripe / Stripe Connect, Paystack, PayPal |
| Email | Resend |

## 17.6 Not assessed in this pass

This document is an inventory, not a vulnerability audit. Whether any listed dependency has a known CVE at the current pinned/resolved version was not checked (no `npm audit` or equivalent was run as part of this documentation effort — see [14-security-documentation.md](14-security-documentation.md) §14.3). License compliance of third-party packages was also not reviewed. Both are UNKNOWN — Not determined from the available source code/project artefacts.
