# 04 — BDD Acceptance Criteria

Gherkin scenarios describing implemented behaviour, derived from reading the service-layer logic (INFERRED as test-style prose; the underlying business rules are CONFIRMED against the cited files). These are **not** verbatim from an existing `.feature` file — the codebase has no Cucumber/Gherkin test runner (see [13-test-automation-documentation.md](13-test-automation-documentation.md)). Where an automated test already exercises the same behaviour, it is noted.

## Feature: Guest RSVP submission

```gherkin
Feature: Public guest RSVP
  Evidence: apps/api/src/modules/rsvp/rsvp.service.ts

  Scenario: Guest confirms attendance before the deadline
    Given an event with rsvpOpen = true and no rsvpDeadline in the past
    And a guest opens the event's public RSVP link
    When the guest submits "CONFIRMED" with their name and meal preference
    Then a Guest record is created or updated with rsvpStatus = CONFIRMED
    And the event owner receives an RSVP_CONFIRMED notification
    Covered by: apps/api/tests/integration/rsvp.test.ts

  Scenario: Guest attempts to RSVP after the deadline
    Given an event whose rsvpDeadline has passed
    When a guest submits an RSVP
    Then the request is rejected with a 400 Bad Request
    And no Guest record is modified
    Evidence: rsvp.service.ts checkRsvpIsOpen()

  Scenario: Guest un-confirms after previously being seated
    Given a guest is CONFIRMED and assigned to a seat
    When the guest resubmits their RSVP as "DECLINED"
    Then their rsvpStatus becomes DECLINED
    And their SeatingAssignment (and their party's) is deleted
    Evidence: rsvp.service.ts submitRsvp(), utils/rsvpMath.ts shouldReleaseSeatOnStatusChange()
```

## Feature: Seating assignment with capacity rules

```gherkin
Feature: Seat a guest at a table
  Evidence: apps/api/src/modules/seating/seating.service.ts, apps/api/src/utils/capacity.ts

  Scenario: Assign a confirmed guest to a table with room
    Given a table with capacity 8 and 5 seats currently occupied
    And a confirmed guest with no accompanying party members
    When the planner assigns the guest to that table
    Then the assignment succeeds
    And the guest occupies exactly 1 of the table's seats
    Covered by: apps/api/tests/integration/seating.test.ts, apps/api/tests/unit/capacity.test.ts

  Scenario: Assign a guest whose party would overflow the table
    Given a table with 2 seats remaining
    And a confirmed guest with 2 named party members (party size 3)
    When the planner assigns the guest without overriding capacity
    Then the assignment is rejected with a reason describing the party-size shortfall
    Evidence: capacity.ts canAssignGuest()

  Scenario: Planner overrides capacity intentionally
    Given a table already at full capacity
    When the planner assigns a guest with overrideCapacity = true
    Then the assignment succeeds
    And a warning "Table is now over capacity" is returned
    Evidence: capacity.ts canAssignGuest()

  Scenario: Shrinking a table unseats the highest-numbered occupied seats
    Given a table with 8 seats, seats 7 and 8 occupied
    When the planner reduces capacity to 6
    Then seats 7 and 8 are removed
    And the guests who occupied them (and their whole party) are unassigned, not deleted
    And the response lists the unseated guests' names
    Evidence: seating.service.ts updateTable()
```

## Feature: Merchandise checkout

```gherkin
Feature: Guest purchases merchandise
  Evidence: apps/api/src/modules/products/orders.service.ts

  Scenario: Successful checkout via Stripe Connect
    Given an event with merchandiseEnabled = true
    And a connected, onboarding-complete Stripe payout account for USD
    And a guest has items in their cart priced in USD
    When the guest starts checkout
    Then a PENDING Order is created with the computed platform fee
    And a Stripe Checkout Session is created with application_fee_amount set
    And the guest is redirected to Stripe's hosted checkout
    Covered by: apps/api/tests/integration/merchandise.test.ts

  Scenario: Cart mixes currencies
    Given a cart containing one USD-priced item and one GBP-priced item
    When the guest attempts checkout
    Then the request is rejected with a message about mixed currencies
    Evidence: orders.service.ts createCheckoutSession()

  Scenario: No payment provider connected for the cart's currency
    Given an event with no EventPayoutAccount connected for NGN
    When a guest attempts checkout with an NGN-priced cart
    Then the request is rejected explaining NGN payments aren't accepted yet
    Evidence: orders.service.ts createCheckoutSession()

  Scenario: Stripe confirms payment via webhook
    Given a PENDING order tied to a Stripe Checkout Session
    When Stripe sends a verified checkout.session.completed webhook event
    Then the order status becomes PAID
    And the purchased product's stockQuantity is decremented
    And the event owner receives an ORDER_PAID notification
    Evidence: orders.service.ts handleStripeWebhook(), finalizeOrderPaid()
```

## Feature: Ticket checkout and capacity reservation

```gherkin
Feature: Public ticket purchase
  Evidence: apps/api/src/modules/tickets/checkout.service.ts, apps/api/src/modules/tickets/ticketTypes.service.ts

  Scenario: Two buyers race for the last ticket
    Given a ticket type with 1 ticket remaining
    When two checkout requests for that ticket type are submitted concurrently
    Then exactly one reservation succeeds
    And the other is rejected with "Not enough tickets remaining"
    Evidence: ticketTypes.service.ts reserveTickets() — single conditional UPDATE, not read-then-write
    Automated test coverage: NOT FOUND for this specific concurrency scenario — see 12-testing-documentation.md

  Scenario: Ticket order abandoned before payment
    Given a PENDING ticket order that reserved capacity
    When the Stripe Checkout Session expires without payment
    Then the reserved capacity is released back to the ticket type
    And the order is marked CANCELLED
    Evidence: orders.service.ts releasePendingTicketOrder(), handleStripeWebhook() (checkout.session.expired)

  Scenario: Ticket order confirmed paid
    Given a PENDING ticket order
    When the processor confirms payment
    Then one Ticket row (unique code) is created per unit purchased
    And the buyer's confirmation page can retrieve them via the order id
    Evidence: orders.service.ts finalizeOrderPaid(), tickets/checkout.service.ts getPublicTicketOrder()
```

## Feature: Door check-in by QR scan

```gherkin
Feature: Ticket door check-in
  Evidence: apps/api/src/modules/tickets/ticketTypes.service.ts checkInTicketByCode()

  Scenario: First scan of a valid ticket
    Given a Ticket with status VALID
    When staff scan its code
    Then the ticket status becomes CHECKED_IN
    And alreadyCheckedIn = false is returned

  Scenario: Re-scan of an already checked-in ticket
    Given a Ticket with status CHECKED_IN
    When staff scan its code again
    Then no error occurs
    And alreadyCheckedIn = true is returned, flagging a possible duplicate/shared ticket

  Scenario: Scan of a cancelled ticket
    Given a Ticket with status CANCELLED
    When staff scan its code
    Then the request is rejected explaining the ticket can't be used for entry
```

## Feature: Admin support access and audit logging

```gherkin
Feature: Admin drill-in to a subscriber's event
  Evidence: apps/api/src/modules/events/events.service.ts getOwnedEvent(), apps/api/src/middleware/auditAdminEventActions.ts

  Scenario: Admin reads a subscriber's event
    Given a user with role ADMIN who does not own event E
    When they issue GET /api/events/:E
    Then the request succeeds (not 403/404)
    And no audit log entry is written (GET requests are not audited)

  Scenario: Admin edits a subscriber's guest
    Given a user with role ADMIN who does not own event E
    When they issue PUT /api/events/:E/guests/:guestId
    And the request succeeds
    Then an AdminAuditLog row is written recording the admin's email, event, method, and a human-readable summary

  Scenario: Admin attempts to delete a subscriber's event
    Given a user with role ADMIN who does not own event E
    When they issue DELETE /api/events/:E
    Then the request is rejected with 404 Not Found
    Evidence: events.service.ts deleteEvent() calls getOwnedEventStrict(), which has no admin bypass

  Scenario: Non-admin planner attempts to reach /api/admin
    Given a user with role PLANNER
    When they issue any request to /api/admin/*
    Then the request is rejected with 403 Forbidden
    Evidence: middleware/auth.ts requireAdmin()
```
