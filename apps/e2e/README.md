# Gadaova E2E tests

Playwright browser tests covering the critical paths that have broken in the past and don't have any other automated coverage: submitting an RSVP (including the mandatory additional-guest names), viewing an invitation (gallery page, not the raw file), and assigning/scrolling guests on the seating planner.

These are separate from `apps/api`'s Vitest suite (`npm run test:api` / `npm run test:integration --workspace=apps/api`), which covers backend unit/integration logic. This suite drives a real browser against a real running API + Postgres + web dev server, so it catches the class of bug those can't -- broken layouts, CSS clipping content (the seating sidebar bug this suite was written to catch), client-side validation, navigation, etc.

## One-time setup

1. Make sure `apps/api` has a database to run against -- same as local dev (see the root README / `apps/api/.env`). A local Postgres via `docker compose up -d` (or however you normally run the API locally) is fine; the suite runs real migrations against it (`prisma migrate deploy`), so don't point it at a database you care about.
2. Install Playwright's browser binaries (one-time, or after a Playwright version bump):
   ```
   npm run install-browsers --workspace=apps/e2e
   ```
   (This downloads Chromium only, with system deps. Run `npx playwright install` from `apps/e2e` directly if you want other browsers too.)

## Running

From the repo root:
```
npm run test:e2e
```
This starts the API (running `prisma migrate deploy` first) and the web dev server automatically via Playwright's `webServer` config, waits for both to be healthy, then runs the tests against them. If you already have `npm run dev:api` / `npm run dev:web` running locally, Playwright reuses them instead of starting new ones (set `CI=true` to force fresh servers).

Other useful commands (run from `apps/e2e`, or add `--workspace=apps/e2e` from the root):
```
npm run test:ui       # interactive UI mode, great for debugging a failing spec
npm run test:headed   # run with a visible browser window
npx playwright show-report   # view the HTML report from the last run
```

## Test isolation

All specs run against one shared API + database (no per-test reset, unlike the Vitest integration suite's `resetDatabase()`), so every test creates its own planner/event/guests with unique, randomly-suffixed names/emails. That makes the suite safe to run with Playwright's `fullyParallel: true`. Don't add a test that assumes it's the only data in the database.

## What's covered so far

- `tests/rsvp.spec.ts` -- the bold "Not including yourself" hint, and the dynamic mandatory per-guest name fields (count mismatch and missing names both get rejected, with the fields synced to the additional-guest count).
- `tests/invitation-media.spec.ts` -- opening an invitation from the RSVP page goes to our own gallery page (not the raw uploaded file) in a new tab, and multi-item galleries support prev/next navigation.
- `tests/seating.spec.ts` -- the Unassigned Guests sidebar on the Seating tab is scrollable rather than clipping guests when the list is long.

Not yet covered: the planner-side "Request edit" resend flow (WhatsApp/email), ticket checkout, merchandise checkout, check-in scanning. Worth adding specs for these the next time one of them causes a regression, or proactively if there's time.

## Known limitation

This suite needs a live API talking to a real Postgres database (for `prisma migrate deploy` and actual queries) -- it can't run against mocks. If `npm run test:e2e` fails immediately with a Prisma/migration error, check your local database connection first before assuming the tests themselves are broken.
