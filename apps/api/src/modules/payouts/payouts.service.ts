import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { getStripeClient } from "../../lib/stripeClient";
import { paystackRequest } from "../../lib/paystackClient";
import { getOwnedEvent } from "../events/events.service";
import { ConnectPaypalInput, ConnectPaystackInput, ConnectStripeInput } from "./payouts.schema";

// Which Stripe Connect account country to create per currency. NGN has no
// entry -- Nigeria isn't a supported Stripe Connect country, so NGN payouts
// go through Paystack Subaccounts instead (see #117).
const STRIPE_COUNTRY_BY_CURRENCY: Record<string, string> = {
  USD: "US",
  GBP: "GB",
};

// Which EventPayoutAccount rows actually count as "ready to accept
// payments" -- an unfinished Stripe Connect onboarding or a row with no
// provider-specific detail filled in yet shouldn't be offered at checkout.
// Shared by orders.service.ts's checkout routing and the public shop
// listing (products.service.ts), so guests only ever see currencies/
// providers that will actually work.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPayoutAccountConnected(account: any): boolean {
  if (account.provider === "STRIPE_CONNECT") return Boolean(account.stripeOnboardingComplete);
  if (account.provider === "PAYSTACK") return Boolean(account.paystackSubaccountCode);
  if (account.provider === "PAYPAL") return Boolean(account.paypalEmail);
  return false;
}

// Public-safe summary of which providers a guest can actually check out
// with, grouped by currency -- no account IDs, bank details, or emails,
// just enough for the shop UI to gray out unavailable currencies and offer
// a provider choice when more than one is connected for the same currency.
export async function getConnectedProvidersByCurrency(eventId: string) {
  const accounts = await prisma.eventPayoutAccount.findMany({ where: { eventId } });
  const byCurrency: Record<string, string[]> = {};
  for (const account of accounts) {
    if (!isPayoutAccountConnected(account)) continue;
    (byCurrency[account.currency] ??= []).push(account.provider);
  }
  return byCurrency;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePayoutAccount(account: any) {
  const connected = isPayoutAccountConnected(account);

  return {
    id: account.id,
    currency: account.currency,
    provider: account.provider,
    connected,
    // Provider-specific display info only -- never raw bank account numbers.
    stripeOnboardingComplete: account.provider === "STRIPE_CONNECT" ? account.stripeOnboardingComplete : undefined,
    paystackBankName: account.provider === "PAYSTACK" ? account.paystackBankName : undefined,
    paystackAccountLast4: account.provider === "PAYSTACK" ? account.paystackAccountLast4 : undefined,
    paypalEmail: account.provider === "PAYPAL" ? account.paypalEmail : undefined,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function listPayoutAccounts(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);
  const accounts = await prisma.eventPayoutAccount.findMany({
    where: { eventId },
    orderBy: [{ currency: "asc" }, { provider: "asc" }],
  });
  return accounts.map(serializePayoutAccount);
}

export async function disconnectPayoutAccount(userId: string, eventId: string, payoutAccountId: string) {
  await getOwnedEvent(userId, eventId);
  const account = await prisma.eventPayoutAccount.findUnique({ where: { id: payoutAccountId } });
  if (!account || account.eventId !== eventId) throw new NotFoundError("Payout account not found");
  await prisma.eventPayoutAccount.delete({ where: { id: payoutAccountId } });
}

// --- Stripe Connect (USD/GBP) -------------------------------------------------

// Creates (or reuses) a Stripe Express connected account for this event +
// currency, then returns a fresh Account Link URL to Stripe's own hosted
// onboarding page -- bank details are collected entirely there, never seen
// by our backend or stored in our database. Safe to call again for the same
// event+currency: an already-created-but-incomplete account just gets a new
// link (Account Links are single-use and expire after a few minutes).
export async function connectStripe(userId: string, eventId: string, input: ConnectStripeInput) {
  await getOwnedEvent(userId, eventId);
  const country = STRIPE_COUNTRY_BY_CURRENCY[input.currency];
  if (!country) {
    throw new BadRequestError(`Stripe Connect doesn't support ${input.currency} payouts -- use Paystack for NGN.`);
  }

  const stripe = getStripeClient();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

  const existing = await prisma.eventPayoutAccount.findUnique({
    where: { eventId_currency_provider: { eventId, currency: input.currency, provider: "STRIPE_CONNECT" } },
  });

  let stripeAccountId = existing?.stripeAccountId ?? undefined;
  if (!stripeAccountId) {
    const stripeAccount = await stripe.accounts.create({
      type: "express",
      country,
      email: user?.email,
      business_type: "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { eventId, currency: input.currency },
    });
    stripeAccountId = stripeAccount.id;
  }

  const account = await prisma.eventPayoutAccount.upsert({
    where: { eventId_currency_provider: { eventId, currency: input.currency, provider: "STRIPE_CONNECT" } },
    create: { eventId, currency: input.currency, provider: "STRIPE_CONNECT", stripeAccountId },
    update: { stripeAccountId },
  });

  // Return/refresh land back on the event's Merchandise/Payouts settings
  // area with a query flag the frontend can use to re-fetch payout status
  // (Stripe doesn't push the outcome to these URLs -- only account.updated
  // webhooks confirm onboarding actually completed, see handleStripeAccountUpdated below).
  const returnUrl = `${env.publicAppUrl}/events/${eventId}/merchandise?payouts=stripe_return&currency=${input.currency}`;
  const refreshUrl = `${env.publicAppUrl}/events/${eventId}/merchandise?payouts=stripe_refresh&currency=${input.currency}`;

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: "account_onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });

  return { onboardingUrl: accountLink.url, payoutAccountId: account.id };
}

// Called from the Stripe webhook (account.updated -- see orders.service.ts's
// handleStripeWebhook) to flip stripeOnboardingComplete once Stripe confirms
// the connected account can actually receive charges and payouts. We can't
// trust the return_url redirect alone since a planner can land there without
// finishing (or after Stripe later un-verifies something).
export async function handleStripeAccountUpdated(stripeAccount: Stripe.Account) {
  const account = await prisma.eventPayoutAccount.findFirst({
    where: { provider: "STRIPE_CONNECT", stripeAccountId: stripeAccount.id },
  });
  if (!account) return;

  const complete = Boolean(stripeAccount.charges_enabled && stripeAccount.payouts_enabled);
  if (complete === account.stripeOnboardingComplete) return;

  await prisma.eventPayoutAccount.update({
    where: { id: account.id },
    data: { stripeOnboardingComplete: complete },
  });
}

// --- Paystack Subaccount (NGN) ------------------------------------------------

interface PaystackBank {
  name: string;
  code: string;
}

// Powers the bank dropdown on the NGN payout-connection form. Doesn't need
// event ownership -- it's the same static reference list for everyone.
export async function listNigerianBanks() {
  const banks = await paystackRequest<PaystackBank[]>("/bank?country=nigeria&currency=NGN");
  return banks.map((b) => ({ name: b.name, code: b.code }));
}

// Creates (or replaces) a Paystack Subaccount for this event's NGN payouts.
// The raw account number is sent to Paystack directly in this one request
// and is never written to our database -- only the resulting
// subaccount_code and a masked last-4 are stored, for display.
export async function connectPaystack(userId: string, eventId: string, input: ConnectPaystackInput) {
  const event = await getOwnedEvent(userId, eventId);

  // Verifies the account number/bank code pair is real (and gets the bank's
  // display name) before we create anything -- Paystack's resolve endpoint
  // rejects invalid combinations outright.
  const resolved = await paystackRequest<{ account_number: string; account_name: string }>(
    `/bank/resolve?account_number=${encodeURIComponent(input.accountNumber)}&bank_code=${encodeURIComponent(input.bankCode)}`
  );

  const banks = await listNigerianBanks();
  const bank = banks.find((b) => b.code === input.bankCode);

  // percentage_charge is the share of each transaction that stays with the
  // platform (us) rather than settling to the subaccount -- i.e. our
  // platform fee. Fixed at creation time from the current
  // PLATFORM_FEE_PERCENT; a later change to that env var only affects
  // subaccounts connected afterward (existing ones keep their original
  // rate unless reconnected).
  const subaccount = await paystackRequest<{ subaccount_code: string }>("/subaccount", {
    method: "POST",
    body: {
      business_name: event.name || resolved.account_name,
      settlement_bank: input.bankCode,
      account_number: input.accountNumber,
      percentage_charge: env.platformFeePercent,
    },
  });

  const account = await prisma.eventPayoutAccount.upsert({
    where: { eventId_currency_provider: { eventId, currency: "NGN", provider: "PAYSTACK" } },
    create: {
      eventId,
      currency: "NGN",
      provider: "PAYSTACK",
      paystackSubaccountCode: subaccount.subaccount_code,
      paystackBankName: bank?.name ?? input.bankCode,
      paystackAccountLast4: input.accountNumber.slice(-4),
    },
    update: {
      paystackSubaccountCode: subaccount.subaccount_code,
      paystackBankName: bank?.name ?? input.bankCode,
      paystackAccountLast4: input.accountNumber.slice(-4),
    },
  });

  return { payoutAccountId: account.id, accountName: resolved.account_name };
}

// --- PayPal (cross-currency) --------------------------------------------------

// No hosted onboarding or approval step needed here -- payee.email_address
// routing works with a plain PayPal email (see lib/paypalClient.ts). Can be
// connected for any of the three currencies, independent of whether the
// event also has Stripe Connect/Paystack set up for that currency.
export async function connectPaypal(userId: string, eventId: string, input: ConnectPaypalInput) {
  await getOwnedEvent(userId, eventId);

  const account = await prisma.eventPayoutAccount.upsert({
    where: { eventId_currency_provider: { eventId, currency: input.currency, provider: "PAYPAL" } },
    create: { eventId, currency: input.currency, provider: "PAYPAL", paypalEmail: input.email },
    update: { paypalEmail: input.email },
  });

  return { payoutAccountId: account.id };
}
