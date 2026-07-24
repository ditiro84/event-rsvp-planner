import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { getOwnedEvent } from "../events/events.service";
import { notifyOrderPaid } from "../notifications/notifications.service";
import { CreateCheckoutInput } from "./orders.schema";

// Lazily constructed (and only when actually needed) so the app can run
// with checkout disabled -- matching the same "clear error until
// configured" pattern as invite.service.ts's getResendClient(). Guest
// checkout and the webhook are the only two things that need this.
function getStripeClient() {
  if (!env.stripeSecretKey) {
    throw new BadRequestError(
      "The shop isn't accepting payments yet. Add STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET) to enable checkout."
    );
  }
  return new Stripe(env.stripeSecretKey);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeOrder(order: any) {
  return {
    id: order.id,
    eventId: order.eventId,
    guestId: order.guestId,
    guestName: order.guestName,
    guestEmail: order.guestEmail,
    status: order.status,
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

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const orderItemsData: { productId: string; productName: string; unitPriceCents: number; quantity: number }[] = [];
  let totalCents = 0;

  for (const item of input.items) {
    const product = productById.get(item.productId);
    if (!product) throw new BadRequestError(`One of the items in your cart is no longer available`);
    if (product.stockQuantity !== null && product.stockQuantity < item.quantity) {
      throw new BadRequestError(`Only ${product.stockQuantity} of "${product.name}" left in stock`);
    }
    totalCents += product.priceCents * item.quantity;
    orderItemsData.push({
      productId: product.id,
      productName: product.name,
      unitPriceCents: product.priceCents,
      quantity: item.quantity,
    });
    lineItems.push({
      quantity: item.quantity,
      price_data: {
        currency: env.stripeCurrency,
        unit_amount: product.priceCents,
        product_data: { name: product.name },
      },
    });
  }

  const order = await prisma.order.create({
    data: {
      eventId: event.id,
      guestId: input.guestId ?? null,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      status: "PENDING",
      totalCents,
      deliveryMethod: input.deliveryMethod ?? "AT_EVENT",
      items: { create: orderItemsData },
    },
  });

  const stripe = getStripeClient();
  const successUrl = `${env.publicAppUrl}/rsvp/${rsvpToken}?order=success`;
  const cancelUrl = `${env.publicAppUrl}/rsvp/${rsvpToken}?order=cancelled`;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: input.guestEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orderId: order.id, eventId: event.id },
    });
  } catch (err) {
    // Clean up the pending order if Stripe rejected the session, rather than
    // leaving an orphaned PENDING order with no way to ever complete it.
    await prisma.order.delete({ where: { id: order.id } });
    throw err;
  }

  await prisma.order.update({ where: { id: order.id }, data: { stripeCheckoutSessionId: session.id } });

  return { checkoutUrl: session.url };
}

// --- Webhook -----------------------------------------------------------------

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
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
  } catch (err) {
    throw new BadRequestError(`Webhook signature verification failed: ${(err as Error).message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await markOrderPaid(session.id, typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id);
  }

  return { received: true };
}

async function markOrderPaid(stripeCheckoutSessionId: string, stripePaymentIntentId: string | undefined) {
  const order = await prisma.order.findUnique({
    where: { stripeCheckoutSessionId },
    include: { items: true, event: { select: { id: true, name: true, userId: true } } },
  });
  // Not found, or a webhook retry for an order we've already marked PAID --
  // either way there's nothing more to do.
  if (!order || order.status !== "PENDING") return;

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID", stripePaymentIntentId: stripePaymentIntentId ?? null },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...order.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((i: any) => i.productId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((i: any) =>
        prisma.product.updateMany({
          where: { id: i.productId, stockQuantity: { not: null } },
          data: { stockQuantity: { decrement: i.quantity } },
        })
      ),
  ]);

  await notifyOrderPaid(order.event.userId, order.event, order);
}
