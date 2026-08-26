# 16 — Configuration & Environment

All variables below are CONFIRMED directly from `apps/api/src/config/env.ts` (backend) and `apps/web/src/lib/api.ts`/`apps/web/vercel.json` (frontend). Actual secret values are never present in the repository and are not reproduced here; where a value is needed for illustration it is shown as `[REDACTED]`.

## 16.1 Backend (`apps/api`) — loaded via `dotenv` from `.env` (or `.env.test` when `NODE_ENV=test`)

| Variable | Required? | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | **Required** (throws at boot if missing) | — | PostgreSQL connection string, consumed by Prisma |
| `JWT_SECRET` | **Required** in non-test envs (defaults to `test-secret` only when `NODE_ENV=test`) | `test-secret` (test only) | HMAC signing key for session JWTs |
| `JWT_EXPIRES_IN` | Optional | `7d` | Session token lifetime |
| `COOKIE_NAME` | Optional | `event_rsvp_token` | Name of the httpOnly session cookie |
| `CORS_ORIGINS` | Optional | `http://localhost:5173` | Comma-separated allow-list of origins for CORS |
| `PUBLIC_APP_URL` | Optional | `http://localhost:5173` | Base URL used to build outbound links (invite links, Stripe/PayPal return URLs) |
| `RSVP_RATE_LIMIT_MAX` | Optional | `20` | Max RSVP submissions per window |
| `RSVP_RATE_LIMIT_WINDOW_MS` | Optional | `900000` (15 min) | RSVP rate-limit window |
| `RESEND_API_KEY` | Optional | — | Enables invite email sending via Resend; without it, invite-email endpoints return a clear configuration error rather than failing silently |
| `RESEND_FROM_EMAIL` | Optional (required alongside `RESEND_API_KEY`) | — | Verified sending address for invite emails |
| `STRIPE_SECRET_KEY` | Optional | — | Enables Stripe checkout + Stripe Connect payouts; without it, checkout/payout endpoints for Stripe return a clear configuration error |
| `STRIPE_WEBHOOK_SECRET` | Optional | — | Verifies Stripe webhook signatures (own-account events) |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Optional | — | Verifies Stripe webhook signatures for a **separate** connected-accounts event destination, if the Stripe dashboard was configured with two destinations instead of one covering both audiences |
| `PAYSTACK_SECRET_KEY` | Optional | — | Enables NGN payouts via Paystack Subaccounts |
| `PAYPAL_CLIENT_ID` | Optional | — | Enables PayPal checkout |
| `PAYPAL_CLIENT_SECRET` | Optional | — | Enables PayPal checkout |
| `PAYPAL_MODE` | Optional | `sandbox` | `sandbox` or `live` — selects PayPal API base URL |
| `PLATFORM_FEE_PERCENT` | Optional | `5` | EventFlow's cut of each merchandise sale |
| `TICKET_FEE_PERCENT` | Optional | `5` | EventFlow's cut of each ticket sale (independently tunable from the merchandise fee) |
| `PORT` | Optional | `4000` | HTTP listen port |
| `NODE_ENV` | Implicit (set by platform) | `development` | Controls `.env` vs `.env.test` loading, cookie `secure`/`sameSite` behaviour, and error-message verbosity |

CONFIRMED — every row above is read verbatim from `apps/api/src/config/env.ts`.

### Redacted example `.env` (illustrative only, not a real file)

```
DATABASE_URL=postgresql://user:[REDACTED]@host:5432/dbname
JWT_SECRET=[REDACTED]
JWT_EXPIRES_IN=7d
COOKIE_NAME=event_rsvp_token
CORS_ORIGINS=https://your-frontend.vercel.app
PUBLIC_APP_URL=https://your-frontend.vercel.app
RSVP_RATE_LIMIT_MAX=20
RSVP_RATE_LIMIT_WINDOW_MS=900000
RESEND_API_KEY=[REDACTED]
RESEND_FROM_EMAIL=invites@yourdomain.com
STRIPE_SECRET_KEY=[REDACTED]
STRIPE_WEBHOOK_SECRET=[REDACTED]
STRIPE_CONNECT_WEBHOOK_SECRET=[REDACTED]
PAYSTACK_SECRET_KEY=[REDACTED]
PAYPAL_CLIENT_ID=[REDACTED]
PAYPAL_CLIENT_SECRET=[REDACTED]
PAYPAL_MODE=live
PLATFORM_FEE_PERCENT=5
TICKET_FEE_PERCENT=5
PORT=4000
NODE_ENV=production
```

## 16.2 Frontend (`apps/web`) — Vite build-time environment variables

| Variable | Required? | Default | Purpose |
|---|---|---|---|
| `VITE_API_URL` | Optional | `/api` (relative — assumes same-origin or a dev proxy) | Base URL the frontend calls for all API requests; must be set to the deployed API's public origin in production |

CONFIRMED — `apps/web/src/lib/api.ts` (`import.meta.env.VITE_API_URL || "/api"`). Vite embeds this at **build time**, not runtime — changing it requires a rebuild/redeploy, not just a server restart.

## 16.3 CI-only environment (not used in production)

CONFIRMED — `.github/workflows/ci.yml` `env:` block for the `api` job:

`DATABASE_URL` (points at the ephemeral CI Postgres container), `NODE_ENV=test`, `JWT_SECRET=ci-test-secret`, `JWT_EXPIRES_IN=1h`, `COOKIE_NAME=event_rsvp_token`, `CORS_ORIGINS=http://localhost:5173`, `PUBLIC_APP_URL=http://localhost:5173`, `RSVP_RATE_LIMIT_MAX=1000`, `RSVP_RATE_LIMIT_WINDOW_MS=900000` (both rate-limit values deliberately loosened so test runs aren't self-throttled). The `web` job sets only `VITE_API_URL=https://placeholder-api.example.com/api` for the build step.

## 16.4 Optional-feature configuration pattern

A repeated, consistent pattern across this codebase: any integration with an external paid service (Resend, Stripe, Paystack, PayPal) is **entirely optional at the environment level** — if its variables are unset, the relevant service-layer function throws a clear, user-facing `BadRequestError` explaining exactly which variables to set and where to get them (e.g. `"Stripe isn't configured yet. Add STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET) to enable checkout and payouts."`), rather than the application failing to boot or behaving unpredictably. CONFIRMED — `apps/api/src/lib/stripeClient.ts`, `apps/api/src/lib/paystackClient.ts`, `apps/api/src/lib/paypalClient.ts`, `apps/api/src/modules/guests/invite.service.ts` (`getResendClient`) all follow this identical lazy-check-and-throw pattern.

## 16.5 Not found in the repository

No `.env.example` file was located during this documentation pass among the files directly read (its existence elsewhere in the repo was not exhaustively ruled out via a dedicated search in this pass) — Not determined from the available source code/project artefacts whether one exists; if present, it would be the canonical illustrative reference and should be reconciled against §16.1 above.
