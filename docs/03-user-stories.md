# 03 — User Stories

Format: `As a <persona>, I want <capability>, so that <benefit>.` Each story is INFERRED in wording (user stories are a documentation convention, not literally present in code) but is grounded in CONFIRMED implemented behaviour, cited per story. Story IDs map to the functional requirements in [02-functional-requirements.md](02-functional-requirements.md) and the traceability matrix in [21-traceability-matrix.md](21-traceability-matrix.md).

## Planner — Account & Events

- **US-001**: As a planner, I want to register an account with my email and a password, so that I can start creating events. → FR-001. `apps/api/src/modules/auth/auth.service.ts`.
- **US-002**: As a planner, I want to log in and stay signed in across visits, so that I don't have to re-authenticate constantly. → FR-004. `apps/api/src/modules/auth/auth.controller.ts` (7-day cookie).
- **US-003**: As a planner, I want to create an event with a name, type, date, and venue, so that I have a place to manage everything about it. → FR-010.
- **US-004**: As a planner, I want to see all my events in one dashboard with at-a-glance RSVP/table progress, so that I can quickly tell which events need attention. → FR-015. `apps/web/src/pages/events/EventsListPage.tsx`.
- **US-005**: As a planner, I want to upload a cover image for my event, so that invites and the event page look polished. → FR-013.

## Planner — Guests & RSVP

- **US-010**: As a planner, I want to add guests one at a time or import a whole list from a CSV, so that I don't have to type in every guest by hand. → FR-020, FR-022.
- **US-011**: As a planner, I want to share one RSVP link (or QR code) for the whole event, so that guests can respond without me sending individual invites. → FR-030. `apps/api/src/modules/rsvp/rsvp.service.ts` (`getPublicEventByToken`).
- **US-012**: As a planner, I want to send a personalised invite (with its own QR code) to a specific guest, so that their RSVP is pre-filled with their name and I know exactly who responded. → FR-040, FR-041.
- **US-013**: As a planner, I want an uploaded, professionally designed invitation card attached to invite emails, so that the invite matches my event's branding instead of a plain text email. → FR-043.
- **US-014**: As a planner, I want to see who hasn't responded yet, so that I can follow up before the deadline. → `apps/api/src/modules/rsvp/rsvp.service.ts` (`getRsvpDashboard`, `nonResponders`).
- **US-015**: As a planner, I want to export my guest list and printable QR wristbands as PDFs, so that I have physical materials for the event day. → FR-023.

## Planner — Seating

- **US-020**: As a planner, I want to drag guests onto a visual map of tables, so that I can plan seating the way I'd sketch it on paper. → FR-051, FR-052. `apps/web/src/pages/events/seating/SeatingCanvas.tsx`.
- **US-021**: As a planner, I want a guest's "+1"s to automatically get seats near them, so that families/couples aren't scattered across the room. → FR-052 (party seating in `assignGuest`).
- **US-022**: As a planner, I want to be warned (not silently blocked) if I try to overbook a table, so that I retain control for edge cases like last-minute extra chairs. → `apps/api/src/utils/capacity.ts` (`canAssignGuest`, `overrideCapacity`).
- **US-023**: As a planner, I want to shrink a table's capacity and be told exactly who got unseated, so that I can immediately reseat them elsewhere. → FR-053.

## Planner — Vendors & Merchandise

- **US-030**: As a planner, I want to track every vendor I'm working with, their status, and what I owe them, so that nothing falls through the cracks. → FR-060.
- **US-031**: As a planner paying vendors in more than one currency, I want my cost totals broken out per currency, so that a blended number doesn't mislead me about what I actually owe. → FR-061.
- **US-032**: As a planner, I want to sell branded merchandise directly from my event page, so that I have an extra revenue stream without a separate storefront. → FR-070, FR-072.

## Planner — Payments

- **US-040**: As a planner, I want to connect my own Stripe/Paystack/PayPal account, so that guest payments go straight to me (minus a platform fee), not through a middleman I don't control. → FR-080.
- **US-041**: As a planner selling in NGN, I want a payout option that actually supports Nigerian bank accounts, so that I'm not stuck with a processor that doesn't serve my country. → FR-080 (Paystack Subaccount for NGN specifically).

## Planner — Ticketing

- **US-050**: As a planner running a public event (e.g. a club night), I want to define multiple ticket tiers with different prices and quantities, so that I can offer early-bird/VIP/general pricing. → FR-090.
- **US-051**: As a planner, I want a shareable public event page anyone can buy tickets from without creating an account, so that I don't add friction to impulse ticket purchases. → FR-091.
- **US-052**: As a planner, I want ticket capacity to never be oversold even if many people check out at once, so that I don't have to turn away a paying guest at the door. → FR-092.
- **US-053**: As door staff, I want to scan a ticket's QR code and get an instant valid/already-used/invalid result, so that entry is fast and I can't be fooled by a shared screenshot. → FR-095.

## Planner — Check-in

- **US-060**: As door staff, I want to scan a guest's invitation QR code to check them in, so that check-in doesn't require typing names into a list. → FR-024 (`checkInGuestByToken`).
- **US-061**: As door staff, I want to check a guest in manually by name if the QR code fails to scan, so that a technical hiccup doesn't stop the line. → FR-024 (`checkInGuest`).

## Planner — Analytics & Notifications

- **US-070**: As a planner running multiple events, I want a single view of RSVP/check-in performance across all of them, so that I don't have to open each event individually. → FR-110.
- **US-071**: As a planner, I want to be notified in-app the moment a guest RSVPs, a vendor's status changes, or an order is paid, so that I stay on top of activity without refreshing every tab. → FR-100.
- **US-072**: As a planner, I want a "Needs Attention" list surfacing unassigned VIPs and approaching deadlines, so that I know what to act on today, not just raw data. → FR-102.

## Admin (Support Staff)

- **US-080**: As an admin, I want to see every subscriber and event on the platform, so that I can find and assist a specific customer quickly. → FR-121.
- **US-081**: As an admin, I want to open a subscriber's event and see/do exactly what they see, so that I can reproduce and fix their issue directly instead of guessing from a description. → FR-122.
- **US-082**: As an admin, I want every action I take on someone else's event logged automatically, so that there's an accountable record of support activity. → FR-123.
- **US-083**: As an admin, I want platform-wide analytics (signups, revenue by currency/provider), so that I can report on business health without querying the database by hand. → FR-111.
- **US-084**: As an admin, I want to author and publish blog articles and manage the landing page's Services cards, so that marketing content can be updated without a code deploy. → FR-131, FR-130.

## Guest / Ticket Buyer (Public, Unauthenticated)

- **US-090**: As a guest, I want to open a link and RSVP without creating an account, so that responding is effortless. → FR-030, FR-031.
- **US-091**: As a guest with dietary needs, I want to specify my meal preference and any allergies when I RSVP, so that the host can plan catering correctly. → FR-031 (`allowMealSelection`/`allowDietary` toggles).
- **US-092**: As a guest, I want to buy event merchandise and pay in a currency the event actually accepts, so that checkout doesn't fail with a confusing error. → FR-072, FR-073.
- **US-093**: As a member of the public, I want to discover and buy tickets to a public event without needing an invitation, so that I can attend events I hear about through a shared link. → FR-091.
