import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { isPayoutAccountConnected } from "../payouts/payouts.service";
import {
  DEFAULT_PROVIDER_PREFERENCE,
  capturePaypalOrderCore,
  startPaypalCheckout,
  startPaystackCheckout,
  startStripeCheckout,
} from "../products/orders.service";
import { releaseTickets, reserveTickets } from "./ticketTypes.service";
import { CreateTicketCheckoutInput } from "./checkout.schema";

// --- Public read (event + on-sale ticket types) -----------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePublicTicketType(ticketType: any) {
  const remaining =
    ticketType.quantityTotal === null ? null : Math.max(ticketType.quantityTotal - ticketType.quantitySold, 0);
  const now = new Date();
  const withinSalesWindow =
    (!ticketType.salesStartAt || ticketType.salesStartAt <= now) &&
    (!ticketType.salesEndAt || ticketType.salesEndAt >= now);
  return {
    id: ticketType.id,
    name: ticketType.name,
    description: ticketType.description,
    price: ticketType.priceCents / 100,
    currency: ticketType.currency,
    quantityRemaining: remaining,
    minPerOrder: ticketType.minPerOrder,
    maxPerOrder: ticketType.maxPerOrder,
    // Whether a guest can actually buy this right now -- collapses
    // isActive + sales window + remaining capacity into one flag so the
    // public page doesn't need to reimplement this logic client-side.
    onSale: ticketType.isActive && withinSalesWindow && (remaining === null || remaining > 0),
  };
}

export async function getPublicTicketEvent(slug: string) {
  const event = await prisma.event.findUnique({
    where: { publicSlug: slug },
    include: { ticketTypes: { orderBy: { sortOrder: "asc" } } },
  });
  if (!event || !event.isPublic) throw new NotFoundError("This event isn't available");

  const payoutAccounts = await prisma.eventPayoutAccount.findMany({ where: { eventId: event.id } });
  const paymentOptionsByCurrency: Record<string, string[]> = {};
  for (const account of payoutAccounts) {
    if (!isPayoutAccountConnected(account)) continue;
    (paymentOptionsByCurrency[account.currency] ??= []).push(account.provider);
  }

  return {
    event: {
      id: event.id,
      name: event.name,
      publicSlug: event.publicSlug,
      publicCategory: event.publicCategory,
      publicDescription: event.publicDescription,
      minAge: event.minAge,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      hasCoverImage: !!event.coverImageMimeType,
    },
    ticketTypes: event.ticketTypes.map(serializePublicTicketType),
    paymentOptionsByCurrency,
  };
}

// Internal (no auth) -- the public /tickets/:slug page's cover image, as
// opposed to the authenticated planner-side download at
// GET /events/:eventId/cover-image (see events.service.ts).
export async function getPublicTicketEventCoverImageBytes(slug: string) {
  const event = await prisma.event.findUnique({
    where: { publicSlug: slug },
    select: { isPublic: true, coverImageData: true, coverImageMimeType: true },
  });
  if (!event || !event.isPublic || !event.coverImageData || !event.coverImageMimeType) {
    throw new NotFoundError("Cover image not found");
  }
  return { data: event.coverImageData, mimeType: event.coverImageMimeType };
}

// Ticket codes/status for a completed (or in-progress) order -- the
// confirmation page polls/reads this by orderId once the guest lands back
// on the public ticket page. orderId (a cuid) is the bearer credential
// here, same trust model as rsvpToken/publicSlug/Ticket.code elsewhere in
// this app -- there's no buyer login to gate this behind.
export async function getPublicTicketOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tickets: { include: { ticketType: { select: { name: true } } } } },
  });
  if (!order || order.kind !== "TICKET") throw new NotFoundError("Order not found");
  return {
    id: order.id,
    status: order.status,
    guestName: order.guestName,
    guestEmail: order.guestEmail,
    total: order.totalCents / 100,
    currency: order.currency,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tickets: order.tickets.map((t: any) => ({
      id: t.id,
      code: t.code,
      status: t.status,
      ticketTypeName: t.ticketType?.name ?? "Ticket",
      attendeeName: t.attendeeName,
    })),
  };
}

// --- Public checkout ---------------------------------------------------------

export async function createTicketCheckoutSession(slug: string, input: CreateTicketCheckoutInput) {
  const event = await prisma.event.findUnique({
    where: { publicSlug: slug },
    select: { id: true, name: true, isPublic: true },
  });
  if (!event || !event.isPublic) throw new NotFoundError("This event isn't available");
  if (input.items.length === 0) throw new BadRequestError("Your cart is empty");

  const ticketTypeIds = input.items.map((i) => i.ticketTypeId);
  const ticketTypes = await prisma.ticketType.findMany({ where: { id: { in: ticketTypeIds }, eventId: event.id } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ticketTypeById = new Map<string, any>(ticketTypes.map((t: any) => [t.id, t]));

  const orderItemsData: { ticketTypeId: string; productName: string; unitPriceCents: number; quantity: number }[] =
    [];
  const reserveItems: { ticketTypeId: string; quantity: number }[] = [];
  let totalCents = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currency: any = null;
  const now = new Date();

  for (const item of input.items) {
    const ticketType = ticketTypeById.get(item.ticketTypeId);
    if (!ticketType) throw new BadRequestError("One of the ticket types in your cart is no longer available");
    if (!ticketType.isActive) throw new BadRequestError(`"${ticketType.name}" isn't currently on sale`);
    if (ticketType.salesStartAt && ticketType.salesStartAt > now) {
      throw new BadRequestError(`"${ticketType.name}" isn't on sale yet`);
    }
    if (ticketType.salesEndAt && ticketType.salesEndAt < now) {
      throw new BadRequestError(`Sales for "${ticketType.name}" have ended`);
    }
    if (item.quantity < ticketType.minPerOrder || item.quantity > ticketType.maxPerOrder) {
      throw new BadRequestError(
        `"${ticketType.name}" must be bought in quantities of ${ticketType.minPerOrder}-${ticketType.maxPerOrder} per order`
      );
    }
    const remaining = ticketType.quantityTotal === null ? null : ticketType.quantityTotal - ticketType.quantitySold;
    if (remaining !== null && remaining < item.quantity) {
      throw new BadRequestError(`Only ${Math.max(remaining, 0)} of "${ticketType.name}" left`);
    }
    // Carts can't mix currencies -- same backstop as merchandise checkout
    // (see orders.service.ts createCheckoutSession).
    if (currency && ticketType.currency !== currency) {
      throw new BadRequestError(
        "Your cart mixes tickets priced in different currencies -- please check out one currency at a time."
      );
    }
    currency = ticketType.currency;

    totalCents += ticketType.priceCents * item.quantity;
    orderItemsData.push({
      ticketTypeId: ticketType.id,
      productName: ticketType.name,
      unitPriceCents: ticketType.priceCents,
      quantity: item.quantity,
    });
    reserveItems.push({ ticketTypeId: ticketType.id, quantity: item.quantity });
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
    if (!payoutAccount) throw new BadRequestError(`${input.provider} isn't connected for ${currency} on this event.`);
  } else {
    for (const provider of DEFAULT_PROVIDER_PREFERENCE) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payoutAccount = connectedAccounts.find((a: any) => a.provider === provider);
      if (payoutAccount) break;
    }
  }

  // Gadaova's cut of a ticket sale is TICKET_FEE_PERCENT, not
  // PLATFORM_FEE_PERCENT -- ticketing is priced separately from merchandise
  // (see env.ts).
  const platformFeeCents = Math.round(totalCents * (env.ticketFeePercent / 100));

  // Reserve capacity and create the PENDING order in one transaction -- if
  // any ticket type can't cover the requested quantity, reserveTickets
  // throws and the whole thing (including order creation) rolls back, so we
  // never end up with a PENDING order holding capacity it can't use.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = await prisma.$transaction(async (tx: any) => {
    await reserveTickets(tx, reserveItems);
    return tx.order.create({
      data: {
        eventId: event.id,
        guestName: input.buyerName,
        guestEmail: input.buyerEmail,
        status: "PENDING",
        kind: "TICKET",
        currency,
        provider: payoutAccount.provider,
        payoutAccountId: payoutAccount.id,
        totalCents,
        platformFeeCents,
        items: {
          create: orderItemsData.map((i) => ({
            ticketTypeId: i.ticketTypeId,
            productName: i.productName,
            unitPriceCents: i.unitPriceCents,
            quantity: i.quantity,
          })),
        },
      },
    });
  });

  try {
    const base = `${env.publicAppUrl}/tickets/${slug}`;
    if (payoutAccount.provider === "STRIPE_CONNECT") {
      const successUrl = `${base}?order=success&orderId=${order.id}`;
      const cancelUrl = `${base}?order=cancelled`;
      return await startStripeCheckout(
        event,
        successUrl,
        cancelUrl,
        order,
        orderItemsData,
        currency,
        platformFeeCents,
        payoutAccount
      );
    }
    if (payoutAccount.provider === "PAYSTACK") {
      const successUrl = `${base}?order=success&orderId=${order.id}`;
      return await startPaystackCheckout(event, successUrl, order, totalCents, payoutAccount);
    }
    const returnUrl = `${base}?order=paypal_return&orderId=${order.id}`;
    const cancelUrl = `${base}?order=cancelled`;
    return await startPaypalCheckout(order, totalCents, currency, platformFeeCents, payoutAccount, returnUrl, cancelUrl);
  } catch (err) {
    // Clean up: release the reserved capacity and delete the orphaned
    // PENDING order if the processor rejected checkout, mirroring the
    // merchandise flow's cleanup (see orders.service.ts createCheckoutSession).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      await releaseTickets(tx, reserveItems);
      await tx.order.delete({ where: { id: order.id } });
    });
    throw err;
  }
}

// Called once the guest approves the PayPal order and is redirected back to
// the public ticket page (see orders.service.ts capturePaypalOrderCore).
export async function captureTicketPaypalCheckout(slug: string, paypalOrderId: string) {
  const order = await prisma.order.findUnique({
    where: { paypalOrderId },
    include: { items: true, event: { select: { id: true, name: true, userId: true, publicSlug: true } } },
  });
  if (!order || order.event.publicSlug !== slug) throw new NotFoundError("Order not found");
  return capturePaypalOrderCore(order, paypalOrderId);
}
