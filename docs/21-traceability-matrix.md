# 21 — Traceability Matrix

Maps each functional requirement ([02-functional-requirements.md](02-functional-requirements.md)) to its implementing code and its automated test coverage (from [12-testing-documentation.md](12-testing-documentation.md)). "Test file" lists the integration/unit test file that covers the module the requirement belongs to — this is coverage at the module level, not a claim that every individual requirement has its own dedicated test case (verifying that level of granularity would require reading every assertion in every test file, which was not done in this pass).

| Req ID | Requirement (short) | Implementing code | Test file |
|---|---|---|---|
| FR-001 | Register with validated email/password | `auth.service.ts`, `auth.schema.ts` | `auth.test.ts` |
| FR-002 | Reject duplicate email | `auth.service.ts` | `auth.test.ts` |
| FR-003 | Bcrypt password hashing | `utils/password.ts` | No dedicated test found |
| FR-004 | Login issues JWT cookie | `auth.controller.ts` | `auth.test.ts` |
| FR-005 | Logout clears cookie | `auth.controller.ts` | `auth.test.ts` |
| FR-006 | `GET /auth/me` | `auth.routes.ts` | `auth.test.ts` |
| FR-007 | Auth rate limiting | `auth.routes.ts` | No dedicated test found |
| FR-010 | Create event | `events.service.ts` | `events.test.ts` |
| FR-011 | Unique `rsvpToken` per event | `schema.prisma` | `events.test.ts` (implicit) |
| FR-012 | Owner/admin update, owner-only delete | `events.service.ts` (`getOwnedEvent`/`getOwnedEventStrict`) | `events.test.ts`, `admin.test.ts` |
| FR-013 | Cover image upload | `events.service.ts` | No dedicated test found |
| FR-014 | Event dashboard stats | `events.service.ts` | `events.test.ts` |
| FR-015 | Events list with guest summary | `events.service.ts` | `events.test.ts` |
| FR-016 | `isPublic` + immutable `publicSlug` | `events.service.ts` | No dedicated test found |
| FR-020 | Guest CRUD + party members | `guests.service.ts` | `guests.test.ts` |
| FR-021 | Guest list search/filter | `guests.service.ts` | `guests.test.ts` |
| FR-022 | CSV import | `guests.routes.ts`, `guests.service.ts` | `guests.test.ts` (extent of row-level coverage unconfirmed — see M-5 in doc 20) |
| FR-023 | CSV/PDF/wristband export | `guests.routes.ts` | `guests.test.ts` (extent unconfirmed) |
| FR-024 | Manual + QR check-in | `guests.service.ts`, `invite.service.ts` | `guests.test.ts` |
| FR-025 | Auto seat release on RSVP change | `utils/rsvpMath.ts`, `guests.service.ts` | `rsvpMath.test.ts` |
| FR-030 | Public RSVP page by token | `rsvp.service.ts` | `rsvp.test.ts` |
| FR-031 | RSVP submission (shared + invite token) | `rsvp.service.ts` | `rsvp.test.ts` |
| FR-032 | Deadline/closed enforcement | `rsvp.service.ts` | `rsvp.test.ts` |
| FR-033 | RSVP rate limiting | `rsvp.routes.ts` | No dedicated test found |
| FR-034 | Owner notification on RSVP change | `notifications.service.ts` | `notifications.test.ts`, `rsvp.test.ts` (indirect) |
| FR-040 | Personalised invite link + QR | `invite.service.ts` | `guests.test.ts` (extent unconfirmed) |
| FR-041 | Invite email via Resend | `invite.service.ts` | `inviteEmail.test.ts` (content generation only — actual send not integration-tested per §12.5) |
| FR-042 | Bulk invite email send | `invite.service.ts` | No dedicated test found |
| FR-043 | Invitation card upload/manage | `invitationCard.service.ts` | `invitationCard.test.ts` |
| FR-050 | Venue layout + decor objects | `seating.service.ts` | `seating.test.ts` |
| FR-051 | Table creation with auto seats | `seating.service.ts` | `seating.test.ts` |
| FR-052 | Guest + party assignment with capacity rules | `seating.service.ts`, `utils/capacity.ts` | `seating.test.ts`, `capacity.test.ts` |
| FR-053 | Capacity-shrink unseating | `seating.service.ts` | `seating.test.ts` |
| FR-054 | Unassign guest / party member | `seating.service.ts` | `seating.test.ts` |
| FR-055 | Seating map PDF export | `seating.routes.ts` | No dedicated test found |
| FR-060 | Vendor CRUD | `vendors.service.ts` | `vendors.test.ts` |
| FR-061 | Per-currency vendor cost totals | `vendors.service.ts` | `vendors.test.ts` |
| FR-062 | Vendor status-change notification | `notifications.service.ts` | `notifications.test.ts`, `vendors.test.ts` (indirect) |
| FR-070 | Product CRUD | `products.service.ts` | `merchandise.test.ts` |
| FR-071 | Shop enabled toggle | `products.service.ts` | `merchandise.test.ts` |
| FR-072 | Guest checkout | `orders.service.ts` | `merchandise.test.ts` |
| FR-073 | Reject mixed-currency cart | `orders.service.ts` | `merchandise.test.ts` (extent unconfirmed) |
| FR-074 | Stock decrement only on PAID | `orders.service.ts` | `merchandise.test.ts` |
| FR-080 | Connect Stripe/Paystack/PayPal payout accounts | `payouts.service.ts` | `payouts.test.ts` |
| FR-081 | Default provider preference routing | `orders.service.ts` | `merchandise.test.ts` (extent unconfirmed) |
| FR-082 | Platform fee capture, frozen on order | `orders.service.ts`, `schema.prisma` | `merchandise.test.ts` |
| FR-083 | Webhook signature verification | `orders.service.ts` | `merchandise.test.ts` (signature-failure path specifically unconfirmed — see §12.5) |
| FR-084 | Payment event logging | `orders.service.ts` | `merchandise.test.ts` (extent unconfirmed) |
| FR-090 | Ticket type CRUD | `ticketTypes.service.ts` | `ticketTypes.test.ts` |
| FR-091 | Public ticket listing page | `checkout.service.ts` (tickets) | **No test found** |
| FR-092 | Atomic capacity reservation | `ticketTypes.service.ts` (`reserveTickets`) | **No test found** (see H-1, doc 20) |
| FR-093 | Capacity release on failed/expired order | `orders.service.ts` (`releasePendingTicketOrder`) | **No test found** |
| FR-094 | Ticket issuance on PAID | `orders.service.ts` (`finalizeOrderPaid`) | **No test found** |
| FR-095 | Door check-in by ticket code | `ticketTypes.service.ts` (`checkInTicketByCode`) | Likely covered by `ticketTypes.test.ts` (co-located route) — not individually confirmed |
| FR-100 | Notification generation (RSVP/vendor/order) | `notifications.service.ts` | `notifications.test.ts` |
| FR-101 | Mark read / mark all read | `notifications.routes.ts` | `notifications.test.ts` |
| FR-102 | "Needs Attention" insights | `insights.service.ts` | `insights.test.ts` |
| FR-110 | Planner cross-event analytics | `analytics.service.ts` | `analytics.test.ts` |
| FR-111 | Platform-wide analytics | `admin.service.ts` | `admin.test.ts` |
| FR-120 | Admin-only route gating | `middleware/auth.ts` (`requireAdmin`) | `admin.test.ts` |
| FR-121 | List all subscribers/events | `admin.service.ts` | `admin.test.ts` |
| FR-122 | Admin event drill-in via owner-scoped endpoints | `events.service.ts` (`getOwnedEvent`) | `admin.test.ts` (extent of drill-in-specific assertions unconfirmed) |
| FR-123 | Audit log write on admin mutation | `middleware/auditAdminEventActions.ts` | `admin.test.ts` (extent unconfirmed) |
| FR-124 | Admin blocked from delete/payout-connect | `events.service.ts`, `payouts.service.ts` | No dedicated test found |
| FR-130 | Landing page + FAQ + Services | `landing.service.ts`, frontend `LandingPage.tsx` | `landingServices.test.ts` (backend only) |
| FR-131 | Article authoring/publish workflow | `articles.service.ts` | `articles.test.ts` |
| FR-132 | Public article reads | `articles.public.routes.ts` | `articles.test.ts` |
| FR-140 | `/health` endpoint | `app.ts` | No dedicated test found |
| FR-141 | PWA installability | `apps/web/public/manifest.webmanifest`, `sw.js`, `InstallPrompt.tsx` | N/A — no frontend test infrastructure |
| FR-142 | Security headers + CORS allow-list | `app.ts` | No dedicated test found |

## Summary

Of 68 functional requirements listed in [02-functional-requirements.md](02-functional-requirements.md), the majority trace to at least module-level integration test coverage. The clearest, most consequential coverage gap is the public ticket checkout/capacity-reservation/issuance chain (FR-091 through FR-094), consistent with the standalone finding in [12-testing-documentation.md](12-testing-documentation.md) §12.3 and [20-known-issues-risks-technical-debt.md](20-known-issues-risks-technical-debt.md) H-1.
