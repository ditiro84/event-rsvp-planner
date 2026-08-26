# 19 — Administrator Guide

This guide covers the `ADMIN` role's capabilities (internal EventFlow support/staff use), based on `apps/api/src/modules/admin/*` and the corresponding frontend Admin section. See [10-roles-and-permissions.md](10-roles-and-permissions.md) for the full permission matrix.

## 19.1 Becoming an admin

There is no self-service way to become an admin — `role` cannot be set via registration. UNKNOWN — Not determined from the available source code/project artefacts exactly how the first admin account is provisioned (likely a direct database update or a seed script referenced by `apps/api/package.json`'s `seed` script, whose contents were not read in this pass). Once your account's `role` is `ADMIN` in the database, the **Admin** link appears in the top navigation automatically.

## 19.2 Subscriber and event support

1. Open **Admin** → the subscriber/event browser lists every user and every event on the platform, with counts (events per subscriber, guests/orders per event).
2. To help a specific subscriber, open their event directly — you land on the exact same Overview/Guests/RSVP/Seating/Vendors/Merchandise/Tickets/Check-in screens the subscriber themselves would see, with full read/write access, identified by a "Support view — editing as admin" badge.
3. Two things you explicitly **cannot** do from support mode, even though everything else is available: delete the subscriber's event, or connect/change their payout account (Stripe/Paystack/PayPal) details. These remain the subscriber's own responsibility.
4. Every change you make on a subscriber's event (not reads) is recorded automatically — you don't need to log anything yourself.

## 19.3 Audit log

- **Admin → Audit Log** shows every recorded admin action: who, on which event, what HTTP method, and a plain-language summary (e.g. "Updated guest," "Created vendor").
- Filterable by event and by admin user.
- Only mutations on events you don't own are logged — your own events (if you also use EventFlow as a planner) and read-only actions on subscribers' events are not recorded here, since there's nothing anomalous to flag in either case.
- Note: audit log writes are best-effort; a failure to write a log entry does not block or roll back the underlying action, and is not currently surfaced anywhere if it happens.

## 19.4 Payment oversight

- **Admin → Payment Events** (or the per-event equivalent when viewing a subscriber's event) shows every payment attempt any processor has reported — successes, declines, failures, and expirations — not just completed orders. Use this to investigate "I paid but it shows unpaid"-type disputes: the raw provider payload is retained for each entry.
- Filterable by event, order, status, and provider.

## 19.5 Platform analytics

**Admin → Analytics** shows: total subscribers, total events, total guests, RSVP confirmation rate, total paid orders, revenue broken out by currency and by provider (never blended into one number), and a 30-day trend of new signups and events created.

## 19.6 Managing marketing content

- **Admin → Articles**: write, edit, publish/unpublish, and delete blog posts. A URL slug is generated automatically from the title the first time you save and never changes afterward — even if you edit the title later, existing shared links to the article keep working.
- **Admin → Services**: add, edit, reorder (drag), hide, or delete the "what we offer" cards shown on the public landing page. Icons are chosen from a fixed set, not uploaded — this is by design, not a current limitation to be worked around.

## 19.7 Operational notes

- Admin access is enforced server-side on every request (`requireAdmin` performs a fresh database role lookup), not just hidden in the UI — a non-admin cannot reach admin functionality by guessing a URL.
- There is currently no in-app way to promote another user to `ADMIN` or to view a full list of who else has admin access — user role management, if needed, happens outside the application (database-level), based on the routes reviewed in this pass.
