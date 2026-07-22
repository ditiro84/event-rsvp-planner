# Deployment Guide

This guide covers local setup and production deployment for EventFlow: **Vercel** (frontend) + **Railway or Render** (backend API) + **Neon or Railway Postgres** (database), wired together with **GitHub Actions** CI.

---

## 1. Required software

- Node.js 20+
- npm 10+
- Docker (for local Postgres via `docker-compose.yml`) — not required in production, only local dev
- A GitHub account (source control + CI)
- A Vercel account (frontend hosting)
- A Railway or Render account (backend hosting)
- A Neon account, or use Railway's own managed Postgres (database hosting)

## 2. Required environment variables

### Backend (`apps/api/.env`, see `apps/api/.env.example`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string. In production, include `sslmode=require`. |
| `PORT` | Port the API listens on (Railway/Render set this automatically; default 4000 locally). |
| `NODE_ENV` | `development` \| `test` \| `production` |
| `JWT_SECRET` | Long random string. Generate with `openssl rand -base64 48`. **Never commit this.** |
| `JWT_EXPIRES_IN` | Session length, e.g. `7d` |
| `COOKIE_NAME` | Name of the session cookie |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins (e.g. your Vercel URL) |
| `PUBLIC_APP_URL` | The deployed frontend URL (used to build RSVP links in future email/SMS features) |
| `RSVP_RATE_LIMIT_MAX` / `RSVP_RATE_LIMIT_WINDOW_MS` | Rate limiting on the public RSVP endpoint |

### Frontend (`apps/web/.env`, see `apps/web/.env.example`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Full URL of the deployed backend API, including `/api` (e.g. `https://your-api.up.railway.app/api`). Leave unset in local dev to use the Vite proxy. |

---

## 3. Local development setup

```bash
docker compose up -d              # starts Postgres on localhost:5432
npm install                       # installs both workspaces
cp apps/api/.env.example apps/api/.env
cd apps/api
npx prisma generate
npx prisma migrate deploy
npm run seed                      # optional demo data
cd ..
npm run dev:api                   # http://localhost:4000
npm run dev:web                   # http://localhost:5173
```

## 4. Database setup & migrations

Migrations live in `apps/api/prisma/migrations/`. The initial migration (`0001_init`) creates all tables described in the schema, including tables for future phases (venue layouts, seating, check-in) so the schema doesn't need breaking changes later.

- Apply migrations: `npx prisma migrate deploy` (production-safe, non-interactive)
- Create a new migration after changing `schema.prisma`: `npx prisma migrate dev --name <description>`
- Inspect the database: `npx prisma studio`

### A note on this project's development environment

This project was built in a sandboxed environment whose network allowlist blocks `binaries.prisma.sh`, the domain Prisma's CLI uses to download its query/schema engine binaries. Every `prisma` CLI command — including `generate`, `migrate dev`, and even `--version` — requires that domain, so **none of the Prisma CLI could be executed in that sandbox**, even to typecheck.

To still deliver a verified, working data layer despite that constraint:

1. The initial migration SQL (`apps/api/prisma/migrations/0001_init/migration.sql`) was **hand-written** to exactly match `schema.prisma`, following Prisma's standard migration file format.
2. `apps/api/scripts/verify-schema-offline.js` applies that SQL to a real, throwaway local Postgres (via the `embedded-postgres` npm package, which — unlike Prisma — ships its binary as a normal npm package and isn't affected by the allowlist) and runs sanity checks: table creation, unique constraints, and cascading deletes. This actually ran and passed during development.
3. All backend unit tests (business logic with no database dependency) ran and passed.
4. TypeScript compiled cleanly against a fallback client stub Prisma installs before `generate` runs.

**On your machine, in CI, and on Railway/Render/Vercel — all of which have normal internet access — none of this is an issue.** `npm install` followed by `npx prisma generate` works exactly as expected. The GitHub Actions workflow (`.github/workflows/ci.yml`) runs the real `prisma generate` + `migrate deploy` + full integration test suite (including a live Postgres service container) on every push, which is the authoritative test signal for this project going forward.

If you ever hit the same `binaries.prisma.sh` error in a different restricted network, set `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` first — but if the domain itself is blocked (not just checksum-verified), that won't help; you'll need network access to that domain specifically.

## 5. Running tests

```bash
cd apps/api
npm test                    # unit tests, no DB needed
npm run test:integration    # full API tests against a throwaway local Postgres (or $DATABASE_URL if set)

cd apps/web
npm run typecheck
npm run lint
```

## 6. Building the application

```bash
npm run build:api   # tsc + prisma generate -> apps/api/dist
npm run build:web   # tsc + vite build -> apps/web/dist
```

## 7. Deploying the backend (Railway or Render)

Both platforms can deploy directly from GitHub with auto-deploy on push to `main`.

### Railway

1. Create a new project → **Deploy from GitHub repo** → select this repo.
2. Set **Root Directory** to `apps/api` (or use the provided `apps/api/railway.json`, which points at the included `Dockerfile`).
3. Add a **PostgreSQL** plugin to the project (or connect an external Neon database instead).
4. Set environment variables (see table above) in the Railway service settings. Set `DATABASE_URL` to the Postgres plugin's connection string (Railway injects this automatically if you use its Postgres plugin — reference it as `${{Postgres.DATABASE_URL}}`).
5. Railway builds the Dockerfile, which runs `prisma migrate deploy` automatically on container start before starting the server.
6. Confirm the health check at `https://<your-service>.up.railway.app/health`.

### Render (alternative)

1. New → **Blueprint** → connect this repo. Render will read `render.yaml` at the repo root.
2. Fill in the flagged (`sync: false`) environment variables in the dashboard: `DATABASE_URL`, `CORS_ORIGINS`, `PUBLIC_APP_URL`.
3. Render builds `apps/api/Dockerfile` and runs the same migrate-then-start command.
4. Confirm the health check at `https://<your-service>.onrender.com/health`.

## 8. Configuring the production database (Neon or Railway Postgres)

### Neon

1. Create a project at neon.tech, note the connection string (includes `sslmode=require`).
2. Set that string as `DATABASE_URL` on your backend host.
3. From your machine (with the production `DATABASE_URL` set locally, temporarily): `cd apps/api && npx prisma migrate deploy`. Alternatively, let the Dockerfile's start command run it automatically on first deploy.
4. Neon provides automatic backups/point-in-time recovery on paid tiers — check current retention in the Neon dashboard.

### Railway Postgres

Provisioned automatically when you add the Postgres plugin (see step 7). Railway manages backups; check the plugin's "Backups" tab for retention settings.

**Either way:** never expose the database port publicly beyond what's needed for your backend to connect. Neon and Railway Postgres both default to requiring TLS (`sslmode=require`), which this project's `DATABASE_URL` format supports out of the box.

## 9. Deploying the frontend (Vercel)

1. New Project → import this GitHub repo.
2. Set **Root Directory** to `apps/web`.
3. Framework preset: Vite. Build command `npm run build`, output directory `dist` (already configured in `apps/web/vercel.json`).
4. Add environment variable `VITE_API_URL` = your deployed backend URL + `/api` (e.g. `https://your-api.up.railway.app/api`).
5. Deploy. Vercel auto-builds on every push to `main` and provisions HTTPS automatically.
6. Once deployed, go back to your backend's `CORS_ORIGINS` env var and set it to your Vercel URL (and custom domain, once added), then redeploy the backend.

## 10. Custom domain

- **Vercel:** Project Settings → Domains → add your domain, follow the DNS instructions (CNAME or A record). HTTPS is provisioned automatically.
- **Railway/Render:** Service Settings → Networking/Custom Domain → add your API subdomain (e.g. `api.yourdomain.com`), follow the DNS instructions. HTTPS is provisioned automatically.
- After adding custom domains, update `CORS_ORIGINS` (backend) and `VITE_API_URL` (frontend) to match, then redeploy both.

## 11. HTTPS

Both Vercel and Railway/Render terminate TLS automatically for their default subdomains and any custom domain you attach — no manual certificate management needed. The Express app sets `trust proxy` so it correctly detects HTTPS behind these platforms' proxies. Cookies are set with `Secure` and `SameSite=None` in production (`apps/api/src/modules/auth/auth.controller.ts`) so cross-origin auth works over HTTPS between separate Vercel/Railway domains.

## 12. Rollback procedures

- **Frontend (Vercel):** Deployments tab → find the last known-good deployment → "Promote to Production." Instant, no rebuild needed.
- **Backend (Railway/Render):** Deployments tab → redeploy a previous successful build. Both platforms keep build history.
- **Database:** Prisma migrations are forward-only by design. To roll back a schema change:
  1. Write a new migration that reverses the change (preferred — keeps history linear and auditable).
  2. For emergencies, restore from your provider's point-in-time backup (Neon/Railway both support this) rather than hand-editing production data.

## 13. Common deployment problems & solutions

| Problem | Solution |
|---|---|
| `prisma generate` fails with a 403/network error | Your build environment is blocking `binaries.prisma.sh`. This will not happen on Vercel/Railway/Render/GitHub Actions, which all have normal outbound internet access. If it does, check the platform's outbound network/firewall settings. |
| Frontend can't reach the API (CORS errors) | Confirm `CORS_ORIGINS` on the backend exactly matches the frontend's origin (scheme + host, no trailing slash), and redeploy the backend after changing it. |
| Login works but session doesn't persist across requests | Confirm `NODE_ENV=production` on the backend (enables `Secure`/`SameSite=None` cookies) and that the frontend is served over HTTPS. |
| RSVP link 404s in production | Confirm the frontend route `/rsvp/:token` is deployed (check `apps/web/vercel.json` rewrites are in effect) and that the token in the URL matches `Event.rsvpToken` exactly. |
| Migrations don't apply on deploy | Confirm the container's start command includes `npx prisma migrate deploy` (already wired into `apps/api/Dockerfile`) and that `DATABASE_URL` is set and reachable from the host. |
| Health check fails | `GET /health` returns 503 if it can't reach the database — check `DATABASE_URL` and that the database allows connections from your backend host's IP range. |

---

## Deployment access note

This environment does not have credentials for GitHub, Vercel, Railway, Render, or Neon, so the actual production deployment steps above need to be run by you, following the instructions in this file. Everything needed to deploy with minimal manual configuration is already in the repo: `Dockerfile`, `railway.json`, `render.yaml`, `vercel.json`, `.env.example` files, and the CI workflow.
