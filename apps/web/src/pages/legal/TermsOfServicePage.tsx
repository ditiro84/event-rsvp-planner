import { LegalPageLayout, LegalSection } from "./LegalPageLayout";

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="Draft -- not yet published" path="/terms">
      <LegalSection heading="Using Gadaova">
        <p>
          Creating events, managing a guest list, sending RSVP invites, seating, and door check-in are free.
          Gadaova takes a small platform fee only on ticket and merchandise sales made through the platform.
        </p>
      </LegalSection>

      <LegalSection heading="Your account">
        <p>
          You&rsquo;re responsible for the events, products, and ticket types you create, and for the accuracy of
          what you tell your guests. You must be 18 or older to hold a planner account.
        </p>
      </LegalSection>

      <LegalSection heading="Payments and payouts">
        <p>
          Payment processing is handled by Stripe, Paystack, or PayPal, each governed by that provider&rsquo;s own
          terms. Payouts go directly to the account you connect -- Gadaova is not a party to the transaction between
          you and your guest, and doesn&rsquo;t hold or guarantee funds.
        </p>
      </LegalSection>

      <LegalSection heading="Guest-facing links">
        <p>
          RSVP, ticket, and merchandise links you generate are intended for the guests you invite. You&rsquo;re
          responsible for how widely you share them.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>
          Don&rsquo;t use Gadaova to collect payment for something you don&rsquo;t intend to deliver, to harvest
          guest data for unrelated purposes, or to send content that&rsquo;s illegal, fraudulent, or abusive.
        </p>
      </LegalSection>

      <LegalSection heading="Service availability">
        <p>
          Gadaova is provided as-is. While we aim for high uptime, we don&rsquo;t guarantee the service will be
          uninterrupted or error-free.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>These terms may be updated from time to time; continued use of Gadaova after a change means you accept it.</p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>Questions about these terms can be sent to the contact address listed on gadaova.com.</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
