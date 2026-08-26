# 13 — Test Automation Documentation

## 13.1 Frameworks and tooling

| Tool | Version | Purpose | Evidence |
|---|---|---|---|
| Vitest | ^2.1.1 | Test runner (unit + integration) | `apps/api/package.json` |
| Supertest | ^7.0.0 | HTTP-level assertions against the Express app in integration tests | `apps/api/package.json` |
| embedded-postgres | ^18.4.0-beta.17 | Devdependency, consistent with an ephemeral local Postgres for integration test runs | `apps/api/package.json` |
| TypeScript / tsx | ^5.6.2 / ^4.19.1 | Test files are TypeScript, executed via Vitest's native TS support | `apps/api/package.json` |

No test framework (Vitest, Jest, or otherwise) is present in `apps/web/package.json` — the frontend has zero automated test infrastructure. CONFIRMED by absence.

## 13.2 Configuration files

- `apps/api/vitest.config.ts` — unit test configuration. Existence CONFIRMED (`npm test` script points here); contents not read in this documentation pass.
- `apps/api/vitest.integration.config.ts` — integration test configuration. Existence CONFIRMED (`npm run test:integration` script points here); contents not read in this pass.
- `apps/api/tests/setup/globalSetup.ts` — referenced by prior investigation in this project as responsible for provisioning a test database and writing a `.env.test` file before any test file is imported (CONFIRMED indirectly: `apps/api/src/config/env.ts` explicitly branches on `NODE_ENV === "test"` to load `.env.test`). Full contents not re-read line-by-line in this pass — treat the exact provisioning mechanism (embedded-postgres binary vs. assuming an already-running Postgres) as INFERRED, not CONFIRMED.

## 13.3 How to run the tests locally

Derived directly from `apps/api/package.json` scripts and root `package.json` workspace scripts (CONFIRMED):

```bash
# From repo root, install all workspace dependencies
npm install

# Unit tests only
npm run test --workspace=apps/api
# or: cd apps/api && npm test

# Integration tests (requires a reachable Postgres — see globalSetup.ts /
# docker-compose.yml for local Postgres)
cd apps/api && npm run test:integration

# Typecheck (both apps)
npm run typecheck:api
npm run typecheck:web

# Lint (both apps)
npm run lint:api
npm run lint:web
```

The frontend has no `test` script — `npm run lint` / `npm run typecheck` / `npm run build` are the only automated quality gates available for `apps/web`.

## 13.4 CI pipeline wiring

CONFIRMED — `.github/workflows/ci.yml`. Two independent jobs, both triggered on push/PR to `main` or `develop`:

**`api` job** (`ubuntu-latest`, with a `postgres:16-alpine` service container):
1. Checkout, Node 20 setup with npm cache.
2. `npm install` (root, installs both workspaces).
3. `npx prisma generate` (in `apps/api`).
4. `npx prisma migrate deploy` (in `apps/api`) — applies real migrations against the CI Postgres container, not a mock.
5. `npm run typecheck` (`apps/api`).
6. `npm run lint` (`apps/api`).
7. `npm test` (unit tests).
8. `npx vitest run --config vitest.integration.config.ts` (integration tests).
9. `npm run build` (`apps/api`).

Environment for this job is hardcoded in the workflow file: `DATABASE_URL` pointing at the local service container, `NODE_ENV=test`, `JWT_SECRET=ci-test-secret`, `JWT_EXPIRES_IN=1h`, `COOKIE_NAME=event_rsvp_token`, `CORS_ORIGINS=http://localhost:5173`, `PUBLIC_APP_URL=http://localhost:5173`, `RSVP_RATE_LIMIT_MAX=1000`, `RSVP_RATE_LIMIT_WINDOW_MS=900000` (rate limit deliberately loosened for CI so test runs aren't throttled).

**`web` job** (`ubuntu-latest`):
1. Checkout, Node 20 setup.
2. `npm install`.
3. `npm run typecheck` (`apps/web`).
4. `npm run lint` (`apps/web`).
5. `npm run build` (`apps/web`), with `VITE_API_URL=https://placeholder-api.example.com/api` — a placeholder value, since the build doesn't need a real API to succeed (Vite build is static).

Neither job publishes coverage reports, uploads build artifacts, or deploys anything — CI here is verification-only; deployment is a separate, platform-triggered process (see [15-deployment-and-infrastructure.md](15-deployment-and-infrastructure.md)).

## 13.5 What is not automated

- No coverage threshold enforcement (no `--coverage` flag or coverage tool configured in either `vitest.config.ts` reference in `package.json` scripts).
- No mutation testing, contract testing, load testing, or accessibility testing (axe, Lighthouse CI, etc.) tooling present.
- No pre-commit hook framework (e.g. Husky) found in either `package.json`'s dependencies — CONFIRMED by absence in both files reviewed.
- No automated dependency-vulnerability scanning step in `ci.yml` (e.g. `npm audit`, Dependabot/Snyk workflow) — UNKNOWN whether Dependabot or similar is configured at the GitHub repository-settings level (not expressible in a workflow YAML file, so not verifiable from source alone).
