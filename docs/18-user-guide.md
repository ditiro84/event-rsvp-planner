# 18 — User Guide (Planner)

This guide describes how to use EventFlow as a planner, based on the capabilities confirmed to exist in the application (see [02-functional-requirements.md](02-functional-requirements.md) for the underlying evidence). Exact button labels/wording were not re-verified against every screen in this pass — treat step-by-step wording as INFERRED from route/component names and prior UI review, not a verbatim transcript of on-screen copy.

## 18.1 Getting started

1. Go to the EventFlow site and select **Register**. Provide your name, email, and a password (at least 8 characters, containing a letter and a number).
2. You're automatically signed in after registering and taken to **My Events**.
3. To sign back in later, use **Log in** with the same email/password. There is currently no self-service "forgot password" flow — if you're locked out, you'll need to contact support (see [20-known-issues-risks-technical-debt.md](20-known-issues-risks-technical-debt.md)).

## 18.2 Creating and managing an event

1. From **My Events**, select **Create Event**. Provide a name, event type, and date at minimum; venue, capacity, an RSVP deadline, a cover image, and a custom welcome message are all optional.
2. Decide which RSVP form fields you want to collect — plus-ones, plus-one names, meal selection, dietary requirements, accessibility needs, and special requests can each be turned on or off per event.
3. Once created, your event gets its own private, shareable RSVP link automatically — you don't need to generate anything for the basic shared-link flow to work.
4. Edit event details at any time from the event's top bar (**Edit**). Deleting an event is permanent and only available to the event's owner.

## 18.3 Adding and inviting guests

1. Open the **Guests** tab. Add guests one at a time, or import a spreadsheet via **Import CSV**.
2. Each guest can have plus-ones tracked either as a simple count or as named individuals (if you've enabled "plus-one names" on the event).
3. For a personal touch, open a guest's **Invite** panel to get a QR code and link unique to them — their RSVP form will already know their name. You can send this by email directly from EventFlow (if your account has email sending configured) or copy the link/QR for WhatsApp or any other channel.
4. If you've designed your own invitation card (a PDF or image), upload it once on the **RSVP** tab — it will be attached automatically to every invite email sent from then on.
5. Track who hasn't responded from the **RSVP** tab's non-responder list, so you know who to follow up with before your deadline.

## 18.4 Seating planner

1. Open the **Seating** tab. Add tables by shape and capacity — seats are created automatically.
2. Drag a confirmed guest from the sidebar onto a table. Their plus-ones (if named) are seated at nearby seats automatically.
3. If a table is full, EventFlow will warn you rather than silently blocking the move in most cases — you can choose to seat someone anyway if you know you'll add an extra chair.
4. If you shrink a table's capacity below what's currently seated, EventFlow tells you exactly who was unseated so you can reseat them.
5. Export a printable seating chart as a PDF from the Seating tab.

## 18.5 Vendors

1. Open the **Vendors** tab and add each vendor with their category, status, contact details, and agreed cost (choose the currency you're paying them in).
2. As you move a vendor's status forward (contacted → quote received → booked → confirmed), you'll get a notification confirming the change was saved.
3. If you're paying vendors in more than one currency, your totals are shown per currency, not blended into one misleading number.

## 18.6 Selling merchandise

1. Open the **Merchandise** tab and add products with a price, currency, and optional stock limit.
2. Before guests can buy anything, turn on the shop for your event and connect at least one way to get paid in that currency (see §18.7).
3. Once live, guests see your shop directly on their RSVP page and can buy with any connected, matching-currency payment method.

## 18.7 Getting paid (Payouts)

1. From the Merchandise or Tickets tab, open **Payouts**.
2. For USD or GBP, connect **Stripe** — you'll be sent to Stripe's own onboarding to enter your business/bank details; EventFlow never sees or stores them.
3. For NGN, connect **Paystack** with your Nigerian bank account and account number.
4. For any currency, you can also connect **PayPal** with just your PayPal email as an additional option alongside Stripe/Paystack.
5. A small platform fee (currently 5%, the same for merchandise and tickets) is taken automatically from each sale — you receive the rest directly from the processor.

## 18.8 Selling tickets to a public event

1. Make your event public from the **Tickets** tab's publish settings — this gives it a public page anyone can find and buy from, without needing an invite.
2. Add one or more ticket types (General Admission, VIP, Early Bird, etc.) with a price, currency, and optional total quantity and sales window.
3. Share your event's public ticket page link — no login required for buyers.
4. On the day, use the **Check-in** tab's QR scanner to scan each ticket at the door. Already-used tickets are flagged instead of silently accepted twice.

## 18.9 Check-in day

1. Open the **Check-in** tab. You can scan a guest's or ticket buyer's QR code with a device camera, or search and check someone in manually if a scan fails.
2. Check-in status updates live across the app — your dashboard and guest list reflect it immediately.

## 18.10 Notifications and Analytics

- The bell icon in the top bar shows recent activity — new RSVPs, vendor status changes, and paid orders — across all your events.
- The **Analytics** page (top nav) gives you a cross-event view: RSVP funnel, check-in rate, and vendor spend by currency, across every event you own.
