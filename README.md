# EventFlow — Event RSVP & Visual Seating Planner

A SaaS platform for event planners to create events, invite guests, collect RSVPs, and (in a future phase) design venue floor plans and assign guests to tables and seats.

Built for weddings, birthdays, corporate events, conferences, graduations, parties, galas, religious events, charity events, and more.

## Status

This is a phased build. **Phases 1–3 are complete and tested**: authentication, event management, guest management with CSV import/export, and the full public RSVP flow with a planner-facing RSVP dashboard. The visual seating planner, seat assignment UI, check-in screen, and PDF/print exports (Phases 4–6) are scaffolded in the database schema but not yet built — see [Known Limitations](#known-limitations--next-steps) below.

## Features (current)

- Planner registration/login with hashed passwords and JWT session cookies
- Create, edit, delete events with type, date, venue, capacity, RSVP deadline, custom message
- Event dashboard: confirmed/declined/pending/maybe counts, expected attendees, dietary & accessibility summaries
- Guest management: add, edit, delete, search, filter (status, VIP, assigned, checked-in, dietary), sort
- CSV bulk import and CSV export of guests
- Unique public RSVP link per event (`/rsvp/:token`), mobile-friendly, no guest account required
- Configurable RSVP form (toggle plus-ones, meal selection, dietary, accessibility, special requests)
- Planner RSVP dashboard with non-responder list, open/close RSVP toggle
- Strict per-user data isolation (a planner can never see another planner's events/guests)
- Rate-limited public endpoints, input validation on every request (Zod, both client and server)

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod
**Backend:** Node.js, TypeScript, Express, REST API
**Database:** PostgreSQL via Prisma ORM
**Testing:** Vitest (unit + API integration tests via Supertest)
**Deployment target:** Vercel (frontend) + Railway/Render (backend) + Neon/Railway Postgres (database)

## Project Structure

```
├── apps/
│   ├── api/                 # Express + TypeScript backend
│   │   ├── prisma/          # schema.prisma, migrations, seed script
│   │   ├── src/
│   │   │   ├── modules/     # auth, events, guests, rsvp (routes/controllers/services/schemas)
│   │   │   ├── middleware/  # auth, validation, error handling
│   │   │   ├── lib/         # prisma client, logger, errors, API response helpers
│   │   │   └── utils/       # pure business-logic helpers (capacity, rsvp math, password, jwt)
│   │   └── tests/
│   │       ├── unit/        # pure-function tests, no database
│   │       └── integration/ # full API tests via Supertest + a real Postgres
│   └── web/                 # React + Vite frontend
│       └── src/
│           ├── pages/       # auth, events (+ tabs: overview/guests/rsvp), public rsvp
│           ├── components/  # layout, reusable UI primitives
│           ├── hooks/       # TanStack Query hooks per resource
│           └── lib/         # api client, auth context, formatting helpers
├── .github/workflows/ci.yml # lint, typecheck, test, build on every push/PR
├── docker-compose.yml       # local Postgres for development
└── DEPLOYMENT.md
```

## Running locally

Requirements: Node.js 20+, Docker (for local Postgres), npm.

```bash
# 1. Start a local Postgres
docker compose up -d

# 2. Install dependencies (root, installs both workspaces)
npm install

# 3. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env    # optional in dev, Vite proxies /api by default

# 4. Generate the Prisma client and apply migrations
cd apps/api
npx prisma generate
npx prisma migrate deploy
npm run seed   # optional: creates a demo planner + sample event/guests
cd ../..

# 5. Run both apps
npm run dev:api   # http://localhost:4000
npm run dev:web   # http://localhost:5173
```

Demo login after seeding: `demo@example.com` / `password123`.

## Testing

```bash
cd apps/api
npm test               # unit tests (no database required)
npm run test:integration  # full API tests (spins up a throwaway local Postgres automatically)

cd apps/web
npm run typecheck
npm run lint
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for a note on why integration tests need real network access to run.

## Building for production

```bash
npm run build:api
npm run build:web
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full step-by-step instructions covering Vercel, Railway/Render, Neon/Railway Postgres, custom domains, HTTPS, and rollback procedures.

## Known limitations & next steps

- **Visual seating planner (Phase 4)** — the `VenueLayout`, `LayoutObject`, `Table`, and `Seat` tables exist in the schema, but the canvas-based editor UI is not yet built.
- **Seat assignment (Phase 5)** — the `SeatingAssignment` model and capacity-validation business rules (`src/utils/capacity.ts`, unit-tested) are ready; the assignment UI/API endpoints are not yet built.
- **Check-in screen (Phase 6)** — the `CheckIn` model exists; the search/check-in UI is not yet built.
- **PDF export / print views (Phase 6)** — not yet built.
- **Playwright end-to-end tests (Phase 7)** — not yet set up; current automated coverage is unit + API integration tests.
- **Email/SMS/WhatsApp RSVP reminders** — the data model supports it (`EventInvitation.channel`), but no provider is integrated yet.

Recommended next phase: build the React-Konva visual venue editor and seat-assignment drag-and-drop UI (Phase 4–5), then check-in and exports (Phase 6), then Playwright coverage for the three core user journeys (Phase 7).
