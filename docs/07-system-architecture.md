# 07 — System Architecture

## 7.1 High-level architecture

```mermaid
flowchart TB
    subgraph Client["Client Devices"]
        Browser["Browser (planner, admin, or guest)"]
    end

    subgraph Vercel["Vercel"]
        Web["apps/web<br/>React 18 + Vite SPA<br/>static assets + SPA rewrite"]
    end

    subgraph Railway["Railway"]
        API["apps/api<br/>Express + TypeScript<br/>Docker container"]
        PG[("PostgreSQL")]
    end

    subgraph ThirdParty["Third-party services"]
        Stripe["Stripe / Stripe Connect"]
        Paystack["Paystack"]
        PayPal["PayPal REST API"]
        Resend["Resend (email)"]
    end

    Browser -->|HTTPS| Web
    Web -->|"fetch/axios, /api/*, credentials: include"| API
    API -->|Prisma Client| PG
    API --> Stripe
    API --> Paystack
    API --> PayPal
    API --> Resend
    Stripe -.webhook.-> API
    Paystack -.webhook.-> API
```
CONFIRMED — `apps/api/railway.json` (Dockerfile build, `prisma migrate deploy` on boot, `/health` healthcheck), `apps/web/vercel.json` (`npm run build`, `dist` output, SPA rewrite to `index.html`), `apps/api/src/lib/prisma.ts`, `apps/api/src/lib/stripeClient.ts`/`paystackClient.ts`/`paypalClient.ts`, `apps/api/src/modules/guests/invite.service.ts` (Resend).

## 7.2 Component / module architecture (backend)

```mermaid
flowchart LR
    subgraph app["app.ts"]
        MW["helmet, cors, cookie-parser,<br/>express.json, pino-http"]
    end

    subgraph modules["src/modules/*"]
        Auth["auth"]
        Events["events"]
        Guests["guests"]
        Seating["seating"]
        Rsvp["rsvp"]
        Vendors["vendors"]
        Products["products<br/>(products + orders + shop + webhooks)"]
        Payouts["payouts"]
        Tickets["tickets<br/>(ticketTypes + checkout)"]
        Notifications["notifications"]
        Insights["insights"]
        Analytics["analytics"]
        Admin["admin"]
        Articles["articles"]
        Landing["landing"]
    end

    subgraph shared["src/lib, src/utils, src/middleware"]
        Prisma["lib/prisma.ts"]
        Errors["lib/errors.ts"]
        Response["lib/apiResponse.ts"]
        StripeC["lib/stripeClient.ts"]
        PaystackC["lib/paystackClient.ts"]
        PaypalC["lib/paypalClient.ts"]
        AuthMW["middleware/auth.ts"]
        ValidateMW["middleware/validate.ts"]
        ErrorMW["middleware/errorHandler.ts"]
        AuditMW["middleware/auditAdminEventActions.ts"]
        RsvpMath["utils/rsvpMath.ts"]
        Capacity["utils/capacity.ts"]
    end

    app --> modules
    Events -->|getOwnedEvent bypass| Admin
    Events --> Guests
    Events --> Seating
    Events --> Vendors
    Events --> Products
    Events --> Payouts
    Events --> Tickets
    Guests --> Notifications
    Vendors --> Notifications
    Products --> Notifications
    Products --> Tickets
    Products --> Payouts
    Rsvp --> RsvpMath
    Seating --> Capacity
    modules --> shared
    shared --> Prisma
```
CONFIRMED — direct import graph observed across `apps/api/src/app.ts` and each module's `*.routes.ts`/`*.service.ts` (e.g. `events.routes.ts` mounting `guestsRouter`/`seatingRouter`/`vendorsRouter`/`productsRouter`/`ordersRouter`/`payoutsRouter`/`ticketTypesRouter`; `tickets/checkout.service.ts` importing `startStripeCheckout` etc. directly from `products/orders.service.ts`; `rsvp.service.ts` calling `notifications.service.ts`).

## 7.3 Request / data flow (typical authenticated write)

```mermaid
sequenceDiagram
    participant B as Browser
    participant W as apps/web (React Query)
    participant A as apps/api (Express)
    participant M as Middleware chain
    participant S as Service layer
    participant P as Prisma / PostgreSQL

    B->>W: User submits a form (e.g. update guest)
    W->>A: PUT /api/events/:eventId/guests/:guestId<br/>(cookie or Bearer token)
    A->>M: helmet, cors, cookie-parser, express.json
    M->>M: requireAuth (verify JWT, set req.userId)
    M->>M: validateParams / validateBody (Zod)
    M->>M: auditAdminEventActions (registers finish listener)
    A->>S: controller calls guests.service.updateGuest()
    S->>S: getOwnedGuest() ownership check
    S->>P: $transaction: guest.update + guestParty replace
    P-->>S: updated row(s)
    S-->>A: result
    A-->>W: 200 {success:true, data:{...}}
    W-->>B: React Query cache updated, UI re-renders
    Note over M,P: If requester is ADMIN and not the owner,<br/>auditAdminEventActions writes an AdminAuditLog row<br/>on response finish (fire-and-forget)
```
CONFIRMED — `apps/api/src/app.ts` middleware order, `apps/api/src/middleware/*`, `apps/api/src/modules/guests/guests.service.ts` (`updateGuest`), `apps/api/src/middleware/auditAdminEventActions.ts`. React Query usage on the frontend is CONFIRMED by `apps/web/package.json` (`@tanstack/react-query`) and the `hooks/use*.ts` file set; exact cache-invalidation behaviour per hook is INFERRED (standard React Query pattern), not re-verified hook-by-hook this pass.

## 7.4 Authentication flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as apps/api
    participant DB as PostgreSQL

    B->>A: POST /api/auth/login {email, password}
    A->>DB: findUnique(email)
    DB-->>A: user row (or null)
    A->>A: bcrypt.compare(password, passwordHash)
    alt invalid credentials
        A-->>B: 401 UNAUTHORIZED "Invalid email or password"
    else valid
        A->>A: jwt.sign({userId}, JWT_SECRET, {expiresIn: 7d})
        A-->>B: Set-Cookie: event_rsvp_token (httpOnly, secure in prod,<br/>sameSite=none in prod); body also includes token
    end

    Note over B,A: Subsequent requests
    B->>A: Any /api/* request<br/>(cookie sent automatically, or Authorization: Bearer <token>)
    A->>A: extractToken(): cookie first, then Bearer header
    A->>A: jwt.verify(token, JWT_SECRET)
    alt invalid/expired/missing
        A-->>B: 401 UNAUTHORIZED
    else valid
        A->>A: req.userId = payload.userId
        A->>A: (requireAdmin routes only) DB lookup: role === ADMIN?
        A-->>B: proceed to route handler
    end
```
CONFIRMED — `apps/api/src/modules/auth/auth.controller.ts`, `auth.service.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/utils/jwt.ts`, `apps/api/src/utils/password.ts`.

## 7.5 Major business workflow — multi-processor checkout routing

```mermaid
flowchart TD
    Start["Guest/buyer starts checkout"] --> Validate["Validate cart: currency match,<br/>stock/capacity, active/on-sale"]
    Validate --> Lookup["Look up EventPayoutAccount rows<br/>for event + cart currency"]
    Lookup --> Filter["Filter to isPayoutAccountConnected() = true"]
    Filter --> Any{Any connected account?}
    Any -->|No| Reject["Reject: currency not accepted yet"]
    Any -->|Yes| Choice{Guest specified a provider?}
    Choice -->|Yes| Match["Use that provider if connected,<br/>else reject"]
    Choice -->|No| Default["Pick first available in order:<br/>STRIPE_CONNECT -> PAYSTACK -> PAYPAL"]
    Match --> CreateOrder["Create PENDING Order<br/>+ compute platformFeeCents"]
    Default --> CreateOrder
    CreateOrder --> Provider{provider}
    Provider -->|STRIPE_CONNECT| StripeFlow["Checkout Session,<br/>application_fee_amount + transfer_data"]
    Provider -->|PAYSTACK| PaystackFlow["/transaction/initialize,<br/>subaccount split"]
    Provider -->|PAYPAL| PaypalFlow["Order w/ payee.email_address,<br/>platform_fees (fallback: no fee)"]
    StripeFlow --> Fail{Provider call throws?}
    PaystackFlow --> Fail
    PaypalFlow --> Fail
    Fail -->|Yes| Cleanup["Delete the PENDING order<br/>(ticket orders also release reserved capacity)"]
    Fail -->|No| Redirect["Return checkout/approval URL to client"]
    Redirect --> Webhook["Async: processor confirms via<br/>verified webhook or PayPal capture"]
    Webhook --> Finalize["finalizeOrderPaid(): status -> PAID,<br/>issue tickets OR decrement stock,<br/>notify planner"]
```
CONFIRMED — `apps/api/src/modules/products/orders.service.ts` (`createCheckoutSession`, `DEFAULT_PROVIDER_PREFERENCE`, `finalizeOrderPaid`), `apps/api/src/modules/tickets/checkout.service.ts` (`createTicketCheckoutSession`, reusing the same starters). This single flow serves both the merchandise shop and public ticket sales, differentiated only by `Order.kind`.

## 7.6 Deployment topology

- `apps/api` builds via a Dockerfile on Railway; the container's start command runs `prisma migrate deploy` (25-second timeout, logged but not fatal if it times out — the server starts regardless) then `node dist/index.js`; Railway health-checks `GET /health` (30s timeout, restarts on failure up to 3 times). CONFIRMED — `apps/api/railway.json`.
- `apps/web` builds via `npm run build` (tsc + vite build) on Vercel, serving the `dist` directory with a catch-all rewrite to `index.html` for client-side routing. CONFIRMED — `apps/web/vercel.json`.
- Local development uses a single `docker-compose.yml` Postgres 16-alpine service; no other services (Redis, queues, etc.) are present in local dev tooling. CONFIRMED — `docker-compose.yml`.

See [15-deployment-and-infrastructure.md](15-deployment-and-infrastructure.md) for full detail.
