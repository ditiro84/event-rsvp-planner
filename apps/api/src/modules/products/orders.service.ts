import crypto from "crypto";
import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { getStripeClient } from "../../lib/stripeClient";
import { paystackRequest } from "../../lib/paystackClient";
import { capturePaypalOrder, createPaypalOrder } from "../../lib/paypalClient";
import { getOwnedEvent } from "../events/events.service";
import { notifyOrderPaid } from "../notifications/notifications.service";
import { handleStripeAccountUpdated, isPayoutAccountConnected } from "../payouts/payouts.service";
import { releaseTickets } from "../tickets/ticketTypes.service";
import { CreateCheckoutInput } from "./orders.schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeOrder(order: any) {
  return {
    id: order.id,
    eventId: order.eventId,
    guestId: order.guestId,
    guestName: order.guestName,
    guestEmail: order.guestEmail,
    status: order.status,
    currency: order.currency,
    total: order.totalCents / 100,
    deliveryMethod: order.deliveryMethod,
    createdAt: order.createdAt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (order.items ?? []).map((i: any) => ({
      productName: i.productName,
      unitPrice: i.unitPriceCents / 100,
      quantity: i.quantity,
    })),
  };
}

// --- Planner-facing ----------------------------------------------------------

export async function listOrders(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);
  const orders = await prisma.order.findMany({
    where: { eventId, status: { not: "PENDING" } },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return orders.map(serializeOrder);
}

// Every payment attempt logged for this event -- successes AND
// declines/failures/expirations, see logPaymentEvent below. Available to
// both the owning planner and admin support (getOwnedEvent's bypass) --
// the cross-event admin view lives separately at GET /api/admin/payment-events.
export async function listPaymentEvents(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);
  const events = await prisma.paymentEvent.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return events.map((e) => ({
    id: e.id,
    orderId: e.orderId,
    provider: e.provider,
    type: e.type,
    status: e.status,
    amount: e.amountCents !== null ? e.amountCents / 100 : null,
    currency: e.currency,
    message: e.message,
    createdAt: e.createdAt,
  }));
}

export async function getOrdersSummary(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paidOrders: any[] = await prisma.order.findMany({
    where: { eventId, status: "PAID" },
    include: { items: true },
  });

  const totalSalesCents = paidOrders.reduce((sum, o) => sum + o.totalCents, 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemsSold = paidOrders.reduce((sum, o) => sum + o.items.reduce((s: number, i: any) => s + i.quantity, 0), 0);

  return {
    totalSales: totalSalesCents / 100,
    orderCount: paidOrders.length,
    itemsSold,
  };
}

// --- Public (guest-facing) checkout ------------------------------------------

// Preferred provider when the guest/frontend doesn't specify one explicitly.
// Exported for reuse by the public ticket checkout flow (see
// tickets/checkout.service.ts), which routes through the same
// EventPayoutAccount infrastructure as merchandise.
export const DEFAULT_PROVIDER_PREFERENCE = ["STRIPE_CONNECT", "PAYSTACK", "PAYPAL"] as const;

export async function createCheckoutSession(rsvpToken: string, input: CreateCheckoutInput) {
  const event = await prisma.event.findUnique({
    where: { rsvpToken },
    select: { id: true, name: true, merchandiseEnabled: true },
  });
  if (!event) throw new NotFoundError("This RSVP link is invalid");
  if (!event.merchandiseEnabled) throw new BadRequestError("This event's shop isn't open");
  if (input.items.length === 0) throw new BadRequestError("Your cart is empty");

  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, eventId: event.id, active: true } });
  // NOTE: typed as `any` here because this sandbox could not run `prisma generate`
  // (see DEPLOYMENT.md); once generated, this can be tightened back to proper
  // Prisma types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productById = new Map<string, any>(products.map((p: any) => [p.id, p]));

  const orderItemsData: { productId: string; productName: string; unitPriceCents: number; quantity: number }[] = [];
  let totalCents = 0;
  // Typed `any` (not `string`) so it flows freely into the `Currency` enum
  // fields below regardless of whether the Prisma client in this build is
  // fully generated -- see the `productById` note above.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currency: any = null;

  for (const item of input.items) {
    const product = productById.get(item.productId);
    if (!product) throw new BadRequestError(`One of the items in your cart is no longer available`);
    if (product.stockQuantity !== null && product.stockQuantity < item.quantity) {
      throw new BadRequestError(`Only ${product.stockQuantity} of "${product.name}" left in stock`);
    }
    // Carts can't mix currencies -- one Order settles through exactly one
    // EventPayoutAccount, so every item in it must price in the same
    // currency (the frontend groups the shop by currency to prevent this
    // in the first place, this is the backend backstop).
    if (currency && product.currency !== currency) {
      throw new BadRequestError("Your cart mixes items priced in different currencies -- please check out one currency at a time.");
    }
    currency = product.currency;

    totalCents += product.priceCents * item.quantity;
    orderItemsData.push({
      productId: product.id,
      productName: product.name,
      unitPriceCents: product.priceCents,
      quantity: item.quantity,
    });
  }

  if (!currency) throw new BadRequestError("Your cart is empty");

  const payoutAccounts = await prisma.eventPayoutAccount.findMany({ where: { eventId: event.id, currency } });
  const connectedAccounts = payoutAccounts.filter(isPayoutAccountConnected);
  if (connectedAccounts.length === 0) {
    throw new BadRequestError(`This event hasn't connected a way to accept ${currency} payments yet.`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payoutAccount: any;
  if (input.provider) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payoutAccount = connectedAccounts.find((a: any) => a.provider === input.provider);
    if (!payoutAccount) {
      throw new BadRequestError(`${input.provider} isn't connected for ${currency} on this event.`);
    }
  } else {
    for (const provider of DEFAULT_PROVIDER_PREFERENCE) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payoutAccount = connectedAccounts.find((a: any) => a.provider === provider);
      if (payoutAccount) break;
    }
  }

  const platformFeeCents = Math.round(totalCents * (env.platformFeePercent / 100));

  const order = await prisma.order.create({
    data: {
      eventId: event.id,
      guestId: input.guestId ?? null,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      status: "PENDING",
      currency,
      provider: payoutAccount.provider,
      payoutAccountId: payoutAccount.id,
      totalCents,
      platformFeeCents,
      deliveryMethod: input.deliveryMethod ?? "AT_EVENT",
      items: { create: orderItemsData },
    },
  });

  try {
    if (payoutAccount.provider === "STRIPE_CONNECT") {
      const successUrl = `${env.publicAppUrl}/rsvp/${rsvpToken}?order=success`;
      const cancelUrl = `${env.publicAppUrl}/rsvp/${rsvpToken}?order=cancelled`;
      return await startStripeCheckout(event, successUrl, cancelUrl, order, orderItemsData, currency, platformFeeCents, payoutAccount);
    }
    if (payoutAccount.provider === "PAYSTACK") {
      const successUrl = `${env.publicAppUrl}/rsvp/${rsvpToken}?order=success`;
      return await startPaystackCheckout(event, successUrl, order, totalCents, payoutAccount);
    }
    const returnUrl = `${env.publicAppUrl}/rsvp/${rsvpToken}?order=paypal_return`;
    const cancelUrl = `${env.publicAppUrl}/rsvp/${rsvpToken}?order=cancelled`;
    return await startPaypalCheckout(order, totalCents, currency, platformFeeCents, payoutAccount, returnUrl, cancelUrl);
  } catch (err) {
    // Clean up the pending order if the processor rejected checkout, rather
    // than leaving an orphaned PENDING order with no way to ever complete it.
    await prisma.order.delete({ where: { id: order.id } });
    throw err;
  }
}

// successUrl/cancelUrl are passed in by the caller rather than computed here
// -- the merchandise checkout (createCheckoutSession above) points back at
// the RSVP page, the public ticket checkout (tickets/checkout.service.ts)
// points back at the public ticket page, and this function doesn't need to
// know which.
export async function startStripeCheckout(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any,
  successUrl: string,
  cancelUrl: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any,
  orderItemsData: { productName: string; unitPriceCents: number; quantity: number }[],
  currency: string,
  platformFeeCents: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payoutAccount: any
) {
  const stripe = getStripeClient();

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = orderItemsData.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: currency.toLowerCase(),
      unit_amount: item.unitPriceCents,
      product_data: { name: item.productName },
    },
  }));

  // Destination charge: the PaymentIntent is created on our platform Stripe
  // account, but funds (minus our application_fee_amount cut) transfer
  // straight to the planner's connected account -- see payouts.service.ts
  // connectStripe for how stripeAccountId gets onboarded.
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    customer_email: order.guestEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { orderId: order.id, eventId: event.id },
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      transfer_data: { destination: payoutAccount.stripeAccountId },
      // Checkout Sessions don't propagate their own metadata onto the
      // PaymentIntent they create -- set it here too so a later
      // payment_intent.payment_failed webhook can still be tied back to
      // this order/event (see logPaymentEvent below).
      metadata: { orderId: order.id, eventId: event.id },
    },
  });

  await prisma.order.update({ where: { id: order.id }, data: { stripeCheckoutSessionId: session.id } });
  return { checkoutUrl: session.url };
}

export async function startPaystackCheckout(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any,
  successUrl: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any,
  totalCents: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payoutAccount: any
) {
  // Paystack's "amount" is the smallest currency unit (kobo for NGN) --
  // the same convention as our own *Cents fields, so totalCents needs no
  // conversion. percentage_charge was already fixed on the subaccount at
  // connect time (see payouts.service.ts connectPaystack), so the split
  // happens automatically without repeating it here.
  const transaction = await paystackRequest<{ authorization_url: string; access_code: string; reference: string }>(
    "/transaction/initialize",
    {
      method: "POST",
      body: {
        email: order.guestEmail,
        amount: totalCents,
        currency: "NGN",
        subaccount: payoutAccount.paystackSubaccountCode,
        callback_url: successUrl,
        metadata: { orderId: order.id, eventId: event.id },
      },
    }
  );

  await prisma.order.update({ where: { id: order.id }, data: { paystackReference: transaction.reference } });
  return { checkoutUrl: transaction.authorization_url };
}

export async function startPaypalCheckout(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any,
  totalCents: number,
  currency: string,
  platformFeeCents: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payoutAccount: any,
  returnUrl: string,
  cancelUrl: string
) {
  const paypalOrder = await createPaypalOrder({
    amount: totalCents / 100,
    currency: currency as "USD" | "GBP" | "NGN",
    payeeEmail: payoutAccount.paypalEmail,
    platformFeeAmount: platformFeeCents / 100,
    orderId: order.id,
    // PayPal appends its own ?token=<paypalOrderId>&PayerID=... to this once
    // the guest approves -- the frontend reads that `token` param (it's the
    // PayPal order id) and calls capturePaypalCheckout/captureTicketPaypalCheckout
    // with it (see orders.controller.ts capturePaypal / ShopSection.tsx).
    returnUrl,
    cancelUrl,
  });

  const approveLink = paypalOrder.links.find((l) => l.rel === "approve" || l.rel === "payer-action");
  if (!approveLink) throw new BadRequestError("PayPal didn't return an approval link for this order");

  await prisma.order.update({
    where: { id: order.id },
    // If PayPal rejected the platform_fees attempt (no Partner enrollment
    // yet -- see lib/paypalClient.ts), the planner gets 100% of this order
    // instead of us silently keeping a fee we didn't actually collect.
    data: { paypalOrderId: paypalOrder.id, platformFeeCents: paypalOrder.feeApplied ? platformFeeCents : 0 },
  });

  return { checkoutUrl: approveLink.href };
}

// Shared by both the RSVP-flow (merchandise) and public ticket-flow capture
// endpoints -- captures the PayPal order, logs the attempt, and finalizes
// the order as PAID on success. Callers look up the order and verify it
// belongs to the right event/link before calling this.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function capturePaypalOrderCore(order: any, paypalOrderId: string) {
  if (order.status !== "PENDING") return serializeOrder(order);

  const capture = await capturePaypalOrder(paypalOrderId);
  const captured = capture.purchase_units[0]?.payments?.captures?.[0];
  const success = capture.status === "COMPLETED" && captured?.status === "COMPLETED";

  await logPaymentEvent({
    eventId: order.eventId,
    orderId: order.id,
    provider: "PAYPAL",
    type: "paypal.order.capture",
    status: success ? "SUCCESS" : "FAILED",
    amountCents: order.totalCents,
    currency: order.currency,
    rawPayload: capture,
  });

  if (!success) {
    // Ticket capacity was reserved at PENDING-order creation (unlike
    // merchandise stock, which is never decremented until PAID) -- if the
    // payment didn't actually go through, give that capacity back instead
    // of leaking it away on every declined/abandoned PayPal attempt.
    await releasePendingTicketOrder(order);
    throw new BadRequestError("PayPal hasn't confirmed this payment yet");
  }

  await finalizeOrderPaid(order);
  return serializeOrder(order);
}

// Called once the guest approves the PayPal order and is redirected back to
// our RSVP page (PayPal Orders v2's "capture on return" pattern -- simpler
// than standing up full webhook subscription infrastructure for this).
export async function capturePaypalCheckout(rsvpToken: string, paypalOrderId: string) {
  const order = await prisma.order.findUnique({
    where: { paypalOrderId },
    include: { items: true, event: { select: { id: true, name: true, userId: true, rsvpToken: true } } },
  });
  // Not found, or belongs to a different event's RSVP link -- treat both as
  // "not found" rather than confirming a valid paypalOrderId exists elsewhere.
  if (!order || order.event.rsvpToken !== rsvpToken) throw new NotFoundError("Order not found");
  return capturePaypalOrderCore(order, paypalOrderId);
}

// --- Payment event log (dispute evidence) ---------------------------------

// Records every payment attempt Stripe/Paystack/PayPal report to us --
// success, decline, failure, or expiry -- not just the ones that end in a
// PAID order. rawPayload keeps the provider's own object so support has
// real evidence to point to, not just our interpretation of it. Best-effort:
// a logging failure here should never break the actual webhook/capture flow
// it's called from.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logPaymentEvent(params: {
  eventId?: string | null;
  orderId?: string | null;
  provider?: "STRIPE_CONNECT" | "PAYSTACK" | "PAYPAL";
  type: string;
  status: "SUCCESS" | "FAILED" | "EXPIRED" | "INFO";
  amountCents?: number | null;
  currency?: string | null;
  message?: string | null;
  rawPayload: unknown;
}) {
  try {
    await prisma.paymentEvent.create({
      data: {
        eventId: params.eventId || null,
        orderId: params.orderId || null,
        provider: params.provider ?? null,
        type: params.type,
        status: params.status,
        amountCents: params.amountCents ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currency: (params.currency?.toUpperCase() as any) || null,
        message: params.message ?? null,
        rawPayload: JSON.stringify(params.rawPayload).slice(0, 20000),
      },
    });
  } catch {
    // best-effort -- never break the real payment flow over a logging failure
  }
}

// --- Webhooks ------------------------------------------------------------------

// Raw request body is required for Stripe's signature verification -- see
// the dedicated express.raw() middleware mounted for this route in app.ts,
// registered before the global express.json() parser.
export async function handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!env.stripeWebhookSecret) {
    throw new BadRequestError("STRIPE_WEBHOOK_SECRET is not configured");
  }
  if (!signature) {
    throw new BadRequestError("Missing Stripe-Signature header");
  }

  const stripe = getStripeClient();
  // Try the primary (own-account) secret first, then the connected-accounts
  // secret if that's configured and the first check fails -- see the
  // env.stripeConnectWebhookSecret comment for why there can be two.
  const secretsToTry = [env.stripeWebhookSecret, env.stripeConnectWebhookSecret].filter(
    (s): s is string => Boolean(s)
  );
  let event: Stripe.Event | undefined;
  let lastError: Error | undefined;
  for (const secret of secretsToTry) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      break;
    } catch (err) {
      lastError = err as Error;
    }
  }
  if (!event) {
    throw new BadRequestError(`Webhook signature verification failed: ${lastError?.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await logPaymentEvent({
      eventId: session.metadata?.eventId,
      orderId: session.metadata?.orderId,
      provider: "STRIPE_CONNECT",
      type: event.type,
      status: "SUCCESS",
      amountCents: session.amount_total,
      currency: session.currency ?? undefined,
      rawPayload: session,
    });
    await markStripeOrderPaid(session.id, typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id);
  } else if (event.type === "checkout.session.expired") {
    // Guest opened checkout but never completed it (closed the tab, session
    // timed out) -- the order stays PENDING forever with no further signal
    // otherwise, so this is the only record that anything was attempted.
    const session = event.data.object as Stripe.Checkout.Session;
    await logPaymentEvent({
      eventId: session.metadata?.eventId,
      orderId: session.metadata?.orderId,
      provider: "STRIPE_CONNECT",
      type: event.type,
      status: "EXPIRED",
      amountCents: session.amount_total,
      currency: session.currency ?? undefined,
      rawPayload: session,
    });
    const pendingOrder = await prisma.order.findUnique({
      where: { stripeCheckoutSessionId: session.id },
      include: { items: true },
    });
    if (pendingOrder) await releasePendingTicketOrder(pendingOrder);
  } else if (event.type === "payment_intent.payment_failed") {
    // A declined card, insufficient funds, etc. -- the checkout session
    // itself may still be open for retry, but this is the actual decline
    // event with Stripe's reason, useful evidence if a guest disputes
    // "my payment didn't go through" or a planner asks why a sale is missing.
    const intent = event.data.object as Stripe.PaymentIntent;
    await logPaymentEvent({
      eventId: intent.metadata?.eventId,
      orderId: intent.metadata?.orderId,
      provider: "STRIPE_CONNECT",
      type: event.type,
      status: "FAILED",
      amountCents: intent.amount,
      currency: intent.currency,
      message: intent.last_payment_error?.message ?? null,
      rawPayload: intent,
    });
  } else if (event.type === "account.updated") {
    // Fired as a planner progresses through Stripe Connect's hosted
    // onboarding -- flips EventPayoutAccount.stripeOnboardingComplete once
    // Stripe confirms the connected account can actually receive charges
    // and payouts (see payouts.service.ts).
    await handleStripeAccountUpdated(event.data.object as Stripe.Account);
  }

  return { received: true };
}

async function markStripeOrderPaid(stripeCheckoutSessionId: string, stripePaymentIntentId: string | undefined) {
  const order = await prisma.order.findUnique({
    where: { stripeCheckoutSessionId },
    include: { items: true, event: { select: { id: true, name: true, userId: true } } },
  });
  // Not found, or a webhook retry for an order we've already marked PAID --
  // either way there's nothing more to do.
  if (!order || order.status !== "PENDING") return;

  await finalizeOrderPaid(order, { stripePaymentIntentId: stripePaymentIntentId ?? null });
}

// Paystack posts events as raw JSON, signed with an HMAC-SHA512 of the raw
// body using the secret key -- verified the same "raw body before the
// global JSON parser" way as Stripe's signature (see webhook.routes.ts).
export async function handlePaystackWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!env.paystackSecretKey) {
    throw new BadRequestError("PAYSTACK_SECRET_KEY is not configured");
  }
  if (!signature) {
    throw new BadRequestError("Missing x-paystack-signature header");
  }

  const expected = crypto.createHmac("sha512", env.paystackSecretKey).update(rawBody).digest("hex");
  if (expected !== signature) {
    throw new BadRequestError("Webhook signature verification failed");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event = JSON.parse(rawBody.toString("utf8")) as { event: string; data: any };
  if (event.event === "charge.success") {
    await logPaymentEvent({
      eventId: event.data.metadata?.eventId,
      orderId: event.data.metadata?.orderId,
      provider: "PAYSTACK",
      type: event.event,
      status: "SUCCESS",
      amountCents: event.data.amount,
      currency: event.data.currency,
      rawPayload: event.data,
    });
    await markPaystackOrderPaid(event.data.reference);
  } else if (event.event === "charge.failed") {
    await logPaymentEvent({
      eventId: event.data.metadata?.eventId,
      orderId: event.data.metadata?.orderId,
      provider: "PAYSTACK",
      type: event.event,
      status: "FAILED",
      amountCents: event.data.amount,
      currency: event.data.currency,
      message: event.data.gateway_response ?? null,
      rawPayload: event.data,
    });
    const pendingOrder = await prisma.order.findUnique({
      where: { paystackReference: event.data.reference },
      include: { items: true },
    });
    if (pendingOrder) await releasePendingTicketOrder(pendingOrder);
  }

  return { received: true };
}

async function markPaystackOrderPaid(paystackReference: string) {
  const order = await prisma.order.findUnique({
    where: { paystackReference },
    include: { items: true, event: { select: { id: true, name: true, userId: true } } },
  });
  if (!order || order.status !== "PENDING") return;

  await finalizeOrderPaid(order);
}

// Shared PAID transition for all three processors: flips status, then does
// the kind-specific fulfillment (decrement merchandise stock, or issue
// ticket rows), and fires the planner notification -- never trusted from a
// client-supplied call, only from a verified webhook/capture confirmation.
export async function finalizeOrderPaid(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any,
  extra: { stripePaymentIntentId?: string | null } = {}
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.$transaction(async (tx: any) => {
    await tx.order.update({ where: { id: order.id }, data: { status: "PAID", ...extra } });

    if (order.kind === "TICKET") {
      // Capacity was already reserved atomically at PENDING-order creation
      // (see ticketTypes.service.ts reserveTickets, called from
      // tickets/checkout.service.ts) -- paying just issues the actual
      // admission credentials, one Ticket row per unit purchased, each with
      // its own unique `code` (the QR payload for door check-in).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of order.items) {
        if (!item.ticketTypeId) continue;
        const ticketsData = Array.from({ length: item.quantity }, () => ({
          ticketTypeId: item.ticketTypeId as string,
          orderId: order.id,
          code: crypto.randomUUID(),
          attendeeName: order.guestName,
          attendeeEmail: order.guestEmail,
        }));
        await tx.ticket.createMany({ data: ticketsData });
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of order.items) {
        if (!item.productId) continue;
        await tx.product.updateMany({
          where: { id: item.productId, stockQuantity: { not: null } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }
    }
  });

  await notifyOrderPaid(order.event.userId, order.event, order);
}

// Releases reserved ticket capacity and marks a still-PENDING ticket order
// CANCELLED -- called whenever we hear (via webhook or a failed PayPal
// capture) that a checkout attempt didn't end in payment, so an abandoned
// or declined ticket order doesn't permanently hold capacity hostage. A
// no-op for merchandise orders (nothing was ever reserved) or orders that
// already resolved to PAID/CANCELLED.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function releasePendingTicketOrder(order: any) {
  if (order.status !== "PENDING" || order.kind !== "TICKET") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.$transaction(async (tx: any) => {
    await releaseTickets(
      tx,
      order.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((i: any) => i.ticketTypeId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((i: any) => ({ ticketTypeId: i.ticketTypeId as string, quantity: i.quantity }))
    );
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
  });
}
