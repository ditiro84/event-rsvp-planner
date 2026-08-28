import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CalendarHeart, CheckCircle2, MapPin, Minus, Plus, Ticket, XCircle } from "lucide-react";
import {
  publicTicketEventCoverImageUrl,
  useCaptureTicketPaypal,
  usePublicTicketEvent,
  usePublicTicketOrder,
  useTicketCheckout,
} from "@/hooks/useTicketCheckout";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { formatDate, formatMoney, PUBLIC_EVENT_CATEGORY_LABELS } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { usePageMeta } from "@/hooks/usePageMeta";
import type { CurrencyCode, PayoutProvider, PublicTicketType } from "@/types";

const PROVIDER_LABELS: Record<PayoutProvider, string> = {
  STRIPE_CONNECT: "Card (Stripe)",
  PAYSTACK: "Card / Bank Transfer (Paystack)",
  PAYPAL: "PayPal",
};

function StatusScreen({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-center">
      <div className="max-w-sm rounded-xl2 border border-slate-200 bg-white p-8 shadow-card">
        {icon}
        <h1 className="mt-4 font-display text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function TicketTypeRow({
  ticketType,
  quantity,
  onChangeQty,
}: {
  ticketType: PublicTicketType;
  quantity: number;
  onChangeQty: (delta: number) => void;
}) {
  const atMax = ticketType.quantityRemaining !== null && quantity >= ticketType.quantityRemaining;
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{ticketType.name}</p>
        {ticketType.description && <p className="mt-0.5 text-sm text-slate-500">{ticketType.description}</p>}
        <p className="mt-1 text-sm font-medium text-brand-700">{formatMoney(ticketType.price, ticketType.currency)}</p>
        {!ticketType.onSale && <p className="mt-1 text-xs text-slate-400">Not currently on sale</p>}
        {ticketType.onSale && ticketType.quantityRemaining !== null && ticketType.quantityRemaining <= 10 && (
          <span className="mt-1 inline-flex items-center rounded-full bg-coral-50 px-2 py-0.5 text-xs font-semibold text-coral-700">
            Only {ticketType.quantityRemaining} left
          </span>
        )}
      </div>
      {ticketType.onSale && (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeQty(-1)}
            disabled={quantity <= 0}
            aria-label={`Remove one ${ticketType.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-5 text-center text-sm font-semibold text-slate-900">{quantity}</span>
          <button
            type="button"
            onClick={() => onChangeQty(1)}
            disabled={atMax}
            aria-label={`Add one more ${ticketType.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// Shown once tickets are issued -- lists each ticket's code as the door
// credential (a simple text code for now; a scannable QR render is a
// follow-up, the code itself is already what checkInTicketByCode expects).
function TicketConfirmation({ orderId }: { orderId: string }) {
  const { data: order, isLoading } = usePublicTicketOrder(orderId);

  if (isLoading || !order) {
    return (
      <div className="flex items-center gap-3 rounded-xl2 border border-slate-200 bg-white p-4 shadow-card">
        <Spinner />
        <p className="text-sm text-slate-600">Confirming your order…</p>
      </div>
    );
  }

  if (order.status === "PENDING") {
    return (
      <div className="flex items-center gap-3 rounded-xl2 border border-slate-200 bg-white p-4 shadow-card">
        <Spinner />
        <p className="text-sm text-slate-600">Waiting for payment confirmation…</p>
      </div>
    );
  }

  if (order.status !== "PAID") {
    return (
      <div className="flex items-start gap-3 rounded-xl2 border border-danger-200 bg-danger-50 p-4 shadow-card">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-600" />
        <div>
          <p className="text-sm font-semibold text-danger-800">This order wasn't completed</p>
          <p className="text-sm text-danger-700">Contact the event organizer if you were charged.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl2 border border-success-200 bg-success-50 p-5 shadow-card">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600" />
        <div>
          <p className="text-sm font-semibold text-success-800">You're in — payment confirmed</p>
          <p className="text-sm text-success-700">Show a ticket code at the door for entry.</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {order.tickets.map((t, i) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg border border-success-200 bg-white px-3 py-2">
            <div>
              <p className="text-xs font-medium text-slate-500">
                {t.ticketTypeName} #{i + 1}
              </p>
              <p className="font-mono text-sm font-semibold text-slate-900">{t.code}</p>
            </div>
            <Badge variant={t.status === "CHECKED_IN" ? "neutral" : "success"}>
              {t.status === "CHECKED_IN" ? "Checked in" : "Valid"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaypalReturnBanner({ slug, paypalOrderId, onDone }: { slug: string; paypalOrderId: string; onDone: (orderId?: string) => void }) {
  const capturePaypal = useCaptureTicketPaypal(slug);
  const [state, setState] = useState<"capturing" | "success" | "error">("capturing");
  const [error, setError] = useState("");

  useEffect(() => {
    capturePaypal
      .mutateAsync(paypalOrderId)
      .then((res) => {
        setState("success");
        onDone(res.order.id);
      })
      .catch((err) => {
        setState("error");
        setError(getApiErrorMessage(err));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paypalOrderId]);

  if (state === "capturing") {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl2 border border-slate-200 bg-white p-4 shadow-card">
        <Spinner />
        <p className="text-sm text-slate-600">Confirming your PayPal payment…</p>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl2 border border-danger-200 bg-danger-50 p-4 shadow-card">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-600" />
        <div>
          <p className="text-sm font-semibold text-danger-800">We couldn't confirm this payment</p>
          <p className="text-sm text-danger-700">{error || "Please contact the event organizer for help."}</p>
        </div>
        <button onClick={() => onDone()} className="ml-auto text-xs font-medium text-danger-700 hover:underline">
          Dismiss
        </button>
      </div>
    );
  }
  return null;
}

export default function PublicTicketEventPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = usePublicTicketEvent(slug);

  usePageMeta({
    title: data ? `${data.event.name} - Gadaova` : null,
    description: data
      ? data.event.publicDescription ||
        `Get tickets for ${data.event.name}${data.event.venueName ? ` at ${data.event.venueName}` : ""} on ${formatDate(data.event.date)}.`
      : null,
    image: data?.event.hasCoverImage && slug ? publicTicketEventCoverImageUrl(slug) : null,
    path: slug ? `/tickets/${slug}` : null,
  });
  const checkout = useTicketCheckout(slug ?? "");
  const [searchParams, setSearchParams] = useSearchParams();

  const [cart, setCart] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [provider, setProvider] = useState<PayoutProvider | "">("");

  const orderParam = searchParams.get("order");
  const paypalOrderId = orderParam === "paypal_return" ? searchParams.get("token") : null;
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(
    orderParam === "success" ? searchParams.get("orderId") : null
  );

  function dismissBanner(nextOrderId?: string) {
    if (nextOrderId) setConfirmedOrderId(nextOrderId);
    const next = new URLSearchParams(searchParams);
    next.delete("order");
    next.delete("token");
    next.delete("PayerID");
    next.delete("orderId");
    setSearchParams(next, { replace: true });
  }

  const ticketTypes = useMemo(() => data?.ticketTypes ?? [], [data]);
  const ticketTypeById = useMemo(() => new Map(ticketTypes.map((t) => [t.id, t])), [ticketTypes]);
  const paymentOptionsByCurrency = data?.paymentOptionsByCurrency ?? {};

  const cartCurrency: CurrencyCode | null = useMemo(() => {
    const [firstId] = Object.keys(cart).filter((id) => (cart[id] ?? 0) > 0);
    return firstId ? ticketTypeById.get(firstId)?.currency ?? null : null;
  }, [cart, ticketTypeById]);

  const cartItems = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([ticketTypeId, quantity]) => ({ ticketType: ticketTypeById.get(ticketTypeId), quantity }))
    .filter((i): i is { ticketType: PublicTicketType; quantity: number } => !!i.ticketType);

  const cartTotal = cartItems.reduce((sum, i) => sum + i.ticketType.price * i.quantity, 0);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const availableProviders = cartCurrency ? paymentOptionsByCurrency[cartCurrency] ?? [] : [];

  function setQty(ticketType: PublicTicketType, nextQty: number) {
    if (nextQty > 0 && cartCurrency && ticketType.currency !== cartCurrency) {
      toast.error(`Your cart is in ${cartCurrency}. Clear it first to buy tickets priced in a different currency.`);
      return;
    }
    const bounded = Math.max(0, nextQty);
    setCart((c) => ({ ...c, [ticketType.id]: bounded }));
  }

  function clearCart() {
    setCart({});
    setShowForm(false);
  }

  async function handleCheckout(e: FormEvent) {
    e.preventDefault();
    if (!buyerName.trim() || !buyerEmail.trim()) {
      toast.error("Enter your name and email to check out");
      return;
    }
    for (const item of cartItems) {
      if (item.quantity < item.ticketType.minPerOrder || item.quantity > item.ticketType.maxPerOrder) {
        toast.error(
          `"${item.ticketType.name}" must be bought in quantities of ${item.ticketType.minPerOrder}-${item.ticketType.maxPerOrder} per order`
        );
        return;
      }
    }
    if (availableProviders.length === 0) {
      toast.error("This event hasn't connected a way to accept payment in this currency yet");
      return;
    }
    try {
      const { checkoutUrl } = await checkout.mutateAsync({
        buyerName,
        buyerEmail,
        items: cartItems.map((i) => ({ ticketTypeId: i.ticketType.id, quantity: i.quantity })),
        provider: provider || undefined,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  if (isLoading) return <Spinner />;

  if (isError || !data) {
    return (
      <StatusScreen
        icon={<XCircle className="mx-auto h-10 w-10 text-slate-300" />}
        title="This event isn't available"
        description="Please double-check the link, or the event may no longer be selling tickets."
      />
    );
  }

  const { event } = data;

  if (paypalOrderId && slug) {
    return (
      <div className="min-h-screen bg-canvas px-4 pb-16 pt-16">
        <div className="mx-auto max-w-lg">
          <PaypalReturnBanner slug={slug} paypalOrderId={paypalOrderId} onDone={dismissBanner} />
        </div>
      </div>
    );
  }

  if (confirmedOrderId) {
    return (
      <div className="min-h-screen bg-canvas px-4 pb-16 pt-16">
        <div className="mx-auto max-w-lg">
          <h1 className="mb-4 font-display text-xl font-semibold text-slate-900">{event.name}</h1>
          <TicketConfirmation orderId={confirmedOrderId} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-16">
      {event.hasCoverImage && slug && (
        <div className="h-56 w-full bg-slate-200 sm:h-72">
          <img src={publicTicketEventCoverImageUrl(slug)} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="mx-auto max-w-lg px-4 pt-8">
        {orderParam === "cancelled" && (
          <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">
            Checkout was cancelled — your cart is still here if you'd like to try again.
          </div>
        )}

        <div className="rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            {event.publicCategory && (
              <Badge variant="brand">{PUBLIC_EVENT_CATEGORY_LABELS[event.publicCategory] ?? event.publicCategory}</Badge>
            )}
            {event.minAge && <Badge variant="warning">{event.minAge}+</Badge>}
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold text-slate-950">{event.name}</h1>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <CalendarHeart className="h-4 w-4 shrink-0 text-brand-600" />
              {formatDate(event.date)}
              {event.startTime && ` · ${event.startTime}`}
            </p>
            {event.venueName && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
                {event.venueName}
                {event.venueAddress && `, ${event.venueAddress}`}
              </p>
            )}
          </div>
          {event.publicDescription && <p className="mt-4 text-sm text-slate-600">{event.publicDescription}</p>}
        </div>

        <div className="mt-6 rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-brand-600" />
              <h2 className="font-display text-lg font-semibold text-slate-900">Tickets</h2>
            </div>
            {cartCount > 0 && <Badge variant="brand">{cartCount} in cart</Badge>}
          </div>

          {ticketTypes.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Tickets aren't on sale for this event yet.</p>
          ) : (
            <div className="mt-3">
              {ticketTypes.map((ticketType) => (
                <TicketTypeRow
                  key={ticketType.id}
                  ticketType={ticketType}
                  quantity={cart[ticketType.id] ?? 0}
                  onChangeQty={(delta) => setQty(ticketType, (cart[ticketType.id] ?? 0) + delta)}
                />
              ))}
            </div>
          )}

          {cartItems.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">Total</span>
                <span className="font-bold text-slate-900">{formatMoney(cartTotal, cartCurrency ?? "USD")}</span>
              </div>

              {cartCurrency && availableProviders.length === 0 ? (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  This event hasn't connected a way to accept {cartCurrency} payments yet — check back later.
                </p>
              ) : !showForm ? (
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={clearCart} type="button">
                    Clear cart
                  </Button>
                  <Button variant="accent" size="sm" onClick={() => setShowForm(true)} type="button">
                    Checkout
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCheckout} className="mt-3 space-y-3">
                  <Field label="Your name" htmlFor="tix-name">
                    <Input id="tix-name" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required />
                  </Field>
                  <Field label="Your email" htmlFor="tix-email" hint="Your ticket codes are sent here.">
                    <Input
                      id="tix-email"
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      required
                    />
                  </Field>
                  {availableProviders.length > 1 && (
                    <Field label="Payment method" htmlFor="tix-provider">
                      <Select id="tix-provider" value={provider} onChange={(e) => setProvider(e.target.value as PayoutProvider | "")}>
                        <option value="">Default</option>
                        {availableProviders.map((p) => (
                          <option key={p} value={p}>
                            {PROVIDER_LABELS[p]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>
                      Back
                    </Button>
                    <Button type="submit" variant="accent" size="sm" isLoading={checkout.isPending} className="flex-1">
                      Pay {formatMoney(cartTotal, cartCurrency ?? "USD")}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
