# 15 — Deployment & Infrastructure

## 15.1 Hosting summary

| Component | Platform | Evidence |
|---|---|---|
| API (`apps/api`) | Railway, Docker build | `apps/api/railway.json` |
| Frontend (`apps/web`) | Vercel, static build | `apps/web/vercel.json` |
| Database | PostgreSQL (Railway-managed, INFERRED from co-location with the API service; not independently confirmed as a distinct managed offering vs. a Railway Postgres plugin) | `apps/api/prisma/schema.prisma` (`provider = "postgresql"`) |
| CI | GitHub Actions | `.github/workflows/ci.yml` |
| Local dev database | Docker Compose, `postgres:16-alpine` | `docker-compose.yml` |

## 15.2 API deployment (Railway)

CONFIRMED — `apps/api/railway.json`:

```json
{
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" },
  "deploy": {
    "startCommand": "sh -c \"... npx prisma migrate deploy; ... exec node dist/index.js\"",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

- Build uses a Dockerfile (`apps/api/Dockerfile` — existence CONFIRMED by this configuration referencing it; contents not read in this pass).
- On every boot, the start command runs `prisma migrate deploy` with a 25-second timeout **before** starting the server; the migration exit code is logged but does not block the server from starting even if migrations fail or time out (`exec node dist/index.js` runs unconditionally after, per the shell command's structure — CONFIRMED by reading the literal `startCommand` string). This means a failed migration on deploy will not necessarily surface as a failed deployment; it would need to be caught by watching deploy logs or by the application later failing at runtime due to a schema mismatch.
- Railway health-checks `GET /health` (30-second timeout) and restarts the container up to 3 times on failure (`ON_FAILURE` restart policy).
- `/health` itself runs `SELECT 1` against the database and returns `503` with `database: "disconnected"` if that fails, `200` with `database: "connected"` otherwise. `apps/api/src/app.ts`.

## 15.3 Frontend deployment (Vercel)

CONFIRMED — `apps/web/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- `npm run build` runs `tsc -b && vite build` (`apps/web/package.json`), i.e. a project-references TypeScript build followed by the Vite production bundle.
- Output directory `dist` is served as static assets.
- A catch-all rewrite sends every path to `index.html`, which is required for client-side routing (React Router) to work correctly on hard-refresh/direct navigation to a nested route like `/events/abc123/guests`.
- The `VITE_API_URL` environment variable (build-time, embedded into the static bundle by Vite) must point at the deployed API's public URL in the real Vercel project configuration; in CI it is set to a harmless placeholder purely so the build step succeeds (see [13-test-automation-documentation.md](13-test-automation-documentation.md) §13.4).

## 15.4 Local development

CONFIRMED — `docker-compose.yml`, root `package.json`:

```bash
docker compose up -d          # starts postgres:16-alpine on :5432
npm install                   # root, installs both workspaces
npm run dev:api                # apps/api, tsx watch
npm run dev:web                # apps/web, vite dev server
```

`docker-compose.yml` defines exactly one service (`postgres`) with a named volume (`event-rsvp-pgdata`) for persistence and a healthcheck (`pg_isready`). No other local services (Redis, message queue, mail catcher, storage emulator) are defined — consistent with the "no external dependencies beyond Postgres and third-party payment/email APIs" architecture observed throughout the codebase.

## 15.5 CI/CD relationship

GitHub Actions (`.github/workflows/ci.yml`) runs verification only (typecheck/lint/test/build for both apps) on push/PR to `main`/`develop` — it does **not** perform the actual deployment. Deployment to Railway and Vercel is therefore driven by each platform's own native Git-integration (INFERRED — this is the standard mechanism for both platforms and is consistent with there being no deploy step in the CI workflow file, but the specific branch/trigger configuration on each platform's dashboard was not independently confirmed from source, since that configuration lives in the platform's own settings, not in a committed file).

## 15.6 Environment parity

| Environment | Database | API base URL used by frontend | Notes |
|---|---|---|---|
| Local dev | Docker Compose Postgres | `/api` (Vite proxy, per code comment in `apps/web/src/lib/api.ts`) | `NODE_ENV` unset/`development` |
| CI | GitHub Actions `postgres:16-alpine` service container | N/A (frontend build only, no live API call) | `NODE_ENV=test` |
| Production | Railway-hosted Postgres | `VITE_API_URL` (build-time env var) | `NODE_ENV=production` (assumed set by Railway; not independently confirmed as a literal file/setting in this repo) |

## 15.7 What this document cannot confirm

- The exact Railway project/service topology (single service vs. multiple, database plugin vs. external Postgres) beyond what `railway.json` and the Prisma provider imply. UNKNOWN in detail — Not determined from the available source code/project artefacts.
- Custom domain configuration, CDN/edge caching settings, or Vercel project-level environment variable values. UNKNOWN — these are platform dashboard settings, not committed files.
- Backup/disaster-recovery policy for the production database. UNKNOWN — Not determined from the available source code/project artefacts.
- Scaling configuration (instance count, autoscaling rules) for the Railway service. UNKNOWN — not expressed in `railway.json`, which only configures build/deploy/healthcheck behaviour.
