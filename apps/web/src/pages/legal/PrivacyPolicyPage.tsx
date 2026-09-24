import { LegalPageLayout, LegalSection } from "./LegalPageLayout";

// Section topics are specific to what Gadaova actually does (guest RSVP
// data, third-party payment processors, QR check-in, email delivery) --
// see LegalPageLayout's notice for why the wording itself is a draft.
export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="Draft -- not yet published" path="/privacy">
      <LegalSection heading="What this covers">
        <p>
          This policy describes how Gadaova handles information for event planners who create an account, and for
          their guests who RSVP, buy tickets, or shop merchandise through a Gadaova event link.
        </p>
      </LegalSection>

      <LegalSection heading="Information planners provide">
        <p>
          Account details (name, email, password), event details you create (name, date, venue, description), and
          any guest lists you upload or enter.
        </p>
      </LegalSection>

      <LegalSection heading="Information guests provide">
        <p>
          Guests don&rsquo;t need an account. When someone RSVPs, buys a ticket, or shops merchandise through an
          event link, Gadaova collects what they enter on that form -- name, email, phone, meal or dietary notes,
          and a shipping address if they buy something that ships.
        </p>
      </LegalSection>

      <LegalSection heading="Payments">
        <p>
          Ticket and merchandise payments are processed by Stripe, Paystack, or PayPal, whichever the event&rsquo;s
          planner has connected. Gadaova doesn&rsquo;t receive or store full card numbers -- that happens directly
          between the guest and the payment processor. Payouts land in the planner&rsquo;s own connected account;
          Gadaova never holds guest funds.
        </p>
      </LegalSection>

      <LegalSection heading="How this information is used">
        <p>
          To run the event a guest is RSVPing to or buying from (seating, check-in, fulfilling an order), to let the
          planner who owns that event manage their guest list, and to send transactional email (RSVP confirmations,
          invites, receipts).
        </p>
      </LegalSection>

      <LegalSection heading="Cookies and similar technology">
        <p>
          Gadaova uses the minimum needed to keep a planner signed in and remember basic preferences. It does not
          use third-party advertising trackers.
        </p>
      </LegalSection>

      <LegalSection heading="Data retention">
        <p>
          Event and guest data is kept for as long as the planner&rsquo;s account and event remain active, and for a
          reasonable period after in case it&rsquo;s needed for support or legal reasons. A planner can request
          deletion of their account and associated data.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>Gadaova is not directed at children, and planner accounts must be held by someone 18 or older.</p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>Questions about this policy can be sent to the contact address listed on gadaova.com.</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
