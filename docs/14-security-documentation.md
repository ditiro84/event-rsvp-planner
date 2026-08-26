# 14 — Security Documentation

**No penetration testing, fuzzing, dependency scanning, or destructive testing was performed to produce this document.** Everything below is static code review only, evidence-cited. This document does not certify the application secure; it records what controls exist in the code and flags where evidence is insufficient to judge.

## 14.1 Implemented controls (CONFIRMED)

### Authentication
- Passwords hashed with bcrypt at 12 salt rounds before storage; never stored or logged in plaintext. `apps/api/src/utils/password.ts`.
- Sessions are JWTs signed with `JWT_SECRET` (HMAC, via `jsonwebtoken`), default 7-day expiry, delivered as an `httpOnly` cookie (`secure: true` and `sameSite: "none"` in production, mitigating some XSS-driven token theft and enabling cross-site cookie delivery for the separately-hosted Vercel frontend) with a `Bearer` header fallback for contexts where the cookie isn't usable. `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/middleware/auth.ts`.
- Login failure messages are identical for "no such user" and "wrong password," reducing user-enumeration risk via the login endpoint. `apps/api/src/modules/auth/auth.service.ts`.
- Registration/login are rate-limited (30 requests / 15 minutes). `apps/api/src/modules/auth/auth.routes.ts`.

### Authorization
- Every event-scoped mutation passes through a single ownership choke point (`getOwnedEvent`/`getOwnedEventStrict`), rather than each module re-implementing its own ownership check. `apps/api/src/modules/events/events.service.ts`.
- Admin-only routes are gated by `requireAdmin`, which performs a fresh database role lookup per request (not a role claim trusted from the JWT payload itself — the JWT only carries `userId`). `apps/api/src/middleware/auth.ts`.
- Two specific admin-support-relevant actions (delete event, connect/modify payout account) are excluded from the admin ownership bypass at the service layer, not just hidden in the UI. See [11-business-rules.md](11-business-rules.md) BR-002.

### Transport / headers
- `helmet()` applied globally, providing standard security headers (CSP defaults, `X-Content-Type-Options`, etc. — exact Helmet default policy not individually enumerated in this pass; INFERRED from Helmet's documented defaults for the version installed, not re-derived from Helmet's own source). `apps/api/src/app.ts`.
- CORS restricted to an explicit, configured origin allow-list (`CORS_ORIGINS` env var) with `credentials: true` (required for the cookie-based session to work cross-origin between Vercel and Railway). `apps/api/src/app.ts`, `apps/api/src/config/env.ts`.
- `app.set("trust proxy", 1)` is set, needed for correct client IP resolution (used by rate limiting) behind Railway's reverse proxy. `apps/api/src/app.ts`.

### Input validation
- Every request body/query/params that a route accepts is validated (and its type coerced) via a Zod schema through `validateBody`/`validateQuery`/`validateParams` middleware before reaching a controller. `apps/api/src/middleware/validate.ts`, used consistently across all 22 route files reviewed.
- Zod validation failures return a structured 400 `VALIDATION_ERROR` with field-level detail (`err.flatten()`), not a raw stack trace. `apps/api/src/middleware/errorHandler.ts`.

### Payment webhook integrity
- Stripe webhook payloads are verified via `stripe.webhooks.constructEvent` against `STRIPE_WEBHOOK_SECRET` (and optionally a second `STRIPE_CONNECT_WEBHOOK_SECRET`), using the untouched raw request body (mounted before the JSON parser specifically for this reason). `apps/api/src/modules/products/orders.service.ts`, `apps/api/src/modules/products/webhook.routes.ts`.
- Paystack webhook payloads are verified via an HMAC-SHA512 signature comparison against `PAYSTACK_SECRET_KEY`, also using the raw body. `apps/api/src/modules/products/orders.service.ts` (`handlePaystackWebhook`).
- No order is ever transitioned to `PAID` by a client-supplied request — only by a verified webhook or a server-initiated PayPal capture call. See [11-business-rules.md](11-business-rules.md) BR-045.

### Data minimization / secrets handling
- Raw bank account numbers are never persisted to the application database for any payment provider (see BR-048).
- Uploaded files are type- and size-restricted at the multer middleware layer per upload endpoint (5MB for images, 8MB for invitation cards) before ever reaching a service function.
- Error responses hide internal error messages in production (`env.isProduction` check both in the global error handler and the `/health` endpoint), surfacing only a generic message; full messages are logged server-side via `pino`, not returned to the client. `apps/api/src/middleware/errorHandler.ts`, `apps/api/src/app.ts`.

### Public/anonymous access model
- Every anonymous-access surface (RSVP, shop, ticket purchase, invitation card download) is gated by an unguessable, randomly-generated token or slug (`cuid()`-derived), not by a predictable or sequential identifier. See [08-database-documentation.md](08-database-documentation.md) §8.3.
- Public read endpoints (articles, landing services, RSVP reads, shop reads, ticket reads) are individually rate-limited (60–120 requests/minute depending on endpoint) to reduce scraping/enumeration throughput. See [09-api-documentation.md](09-api-documentation.md) for exact limits per route.

### Rate limiting summary

| Surface | Limit | Evidence |
|---|---|---|
| Auth register/login | 30 / 15 min | `auth.routes.ts` |
| RSVP submit | `RSVP_RATE_LIMIT_MAX` (default 20) / `RSVP_RATE_LIMIT_WINDOW_MS` (default 15 min) | `rsvp.routes.ts` |
| RSVP reads | 60 / min | `rsvp.routes.ts` |
| Shop reads | 60 / min | `shop.routes.ts` |
| Shop checkout | 20 / 15 min | `shop.routes.ts` |
| Ticket reads | 60 / min | `checkout.routes.ts` (tickets) |
| Ticket checkout | 20 / 15 min | `checkout.routes.ts` (tickets) |
| Article reads | 120 / min | `articles.public.routes.ts` |
| Landing reads | 60 / min | `landing.public.routes.ts` |

## 14.2 Potential gaps (observed, not confirmed exploitable — no testing performed)

- **Logout does not invalidate the JWT.** `POST /api/auth/logout` clears the cookie client-side but the API has no token blocklist/revocation mechanism — a token or cookie value captured before logout (e.g. via a proxy, browser extension, or XSS prior to any CSP mitigation taking effect) remains valid for up to 7 days after the user "logs out." This is a design characteristic of stateless JWTs without a revocation list, not a bug per se, but is worth flagging given the 7-day default expiry. `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/utils/jwt.ts`.
- **No visible CSRF-specific mitigation for cookie-authenticated state-changing requests.** The cookie is `sameSite: "none"` in production (required for the cross-origin Vercel↔Railway setup), which does not itself prevent CSRF; the code relies on the CORS origin allow-list plus the Bearer-token fallback pattern, but no explicit CSRF token/double-submit-cookie mechanism was found in `apps/api/src/middleware/*`. Whether the CORS allow-list alone is sufficient mitigation for this app's threat model is a judgment call outside the scope of a static documentation pass — flagged, not resolved, here.
- **`AdminAuditLog` writes are best-effort and fire-and-forget** (`auditAdminEventActions.ts`): a failure to write the audit row is silently swallowed and never surfaced, retried, or alerted on. An admin action could succeed while its audit trail entry silently fails to be written, with no operator-visible signal that this happened.
- **CSV import validation depth is UNKNOWN** (see [24-documentation-gap-analysis.md](24-documentation-gap-analysis.md)) — the controller-level parsing/validation of uploaded CSV rows was not read line-by-line in this pass, so whether malformed or maliciously crafted CSV content (e.g. formula-injection payloads consumed later by a spreadsheet export) is sanitized cannot be confirmed either way.
- **No explicit password-reset / account-recovery flow was found** among the 4 auth routes (register, login, logout, me) — a user who forgets their password has no self-service recovery path in the reviewed code. This may be a genuine functional gap rather than a security control gap per se; cross-referenced in [20-known-issues-risks-technical-debt.md](20-known-issues-risks-technical-debt.md).
- **No account lockout after repeated failed logins** beyond the blanket 30-requests/15-minutes rate limit on the whole `/register`+`/login` pair — there is no per-account lockout counter, only a per-client-IP request-rate limit (which is itself trivially distributed across many IPs).

## 14.3 Unable to determine from source (UNKNOWN)

- Actual production values of any secret (`JWT_SECRET`, `STRIPE_SECRET_KEY`, `DATABASE_URL`, etc.) — appropriately, these are not present in the repository at all; see [16-configuration-and-environment.md](16-configuration-and-environment.md) for the full redacted list.
- Whether GitHub branch protection, required reviews, or secret-scanning are enabled on the repository — these are platform/organization settings, not expressible in the files reviewed.
- Whether the production Railway/Vercel environments have any additional network-level protections (WAF, IP allow-listing, DDoS mitigation) beyond what Railway/Vercel provide by default — Not determined from the available source code/project artefacts.
- Real-world incident history, whether any of the gaps above have ever been exploited, or the current patch/CVE status of third-party dependencies at the time of reading — Not determined from the available source code/project artefacts; see [17-dependencies-and-technology-stack.md](17-dependencies-and-technology-stack.md) for the dependency list as a starting point for such an assessment, which this pack does not itself perform.
- Session fixation, timing-attack resistance of the bcrypt/JWT comparison paths, and other properties that require dynamic/runtime testing rather than static reading — out of scope for this document by design (no testing was performed).
