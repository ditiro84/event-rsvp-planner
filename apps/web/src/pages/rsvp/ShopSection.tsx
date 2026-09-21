import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, MapPin, Minus, Package, Plus, ShoppingBag, Truck, XCircle } from "lucide-react";
import { useCapturePaypal, useCheckout, usePublicShop, publicProductImageUrl } from "@/hooks/useProducts";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { formatMoney } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import type { CurrencyCode, PayoutProvider, PublicShopProduct } from "@/types";

const PROVIDER_LABELS: Record<PayoutProvider, string> = {
  STRIPE_CONNECT: "Card (Stripe)",
  PAYSTACK: "Card / Bank Transfer (Paystack)",
  PAYPAL: "PayPal",
};

function ProductRow({
  product,
  quantity,
  disabled,
  onAdd,
  onChangeQty,
}: {
  product: PublicShopProduct;
  quantity: number;
  disabled: boolean;
  onAdd: () => void;
  onChangeQty: (delta: number) => void;
}) {
  const soldOut = product.stockQuantity === 0;
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {product.hasImage ? (
          <img src={publicProductImageUrl(product.id)} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Package className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">
          {product.name}
          {product.size && <span className="ml-1.5 font-normal text-slate-400">· Size {product.size}</span>}
        </p>
        {/* Shown in full (not truncated) -- planners sometimes use this
            field for payment instructions (e.g. "Pay via Zelle to ...")
            for events not using in-app checkout, so clipping it would hide
            something guests actually need to read. whitespace-pre-line
            keeps any line breaks the planner typed. */}
        {product.description && (
          <p className="mt-0.5 whitespace-pre-line text-xs text-slate-500">{product.description}</p>
        )}
        <p className="mt-0.5 text-sm font-medium text-brand-700">{formatMoney(product.price, product.currency)}</p>
      </div>
      {soldOut ? (
        <span className="shrink-0 text-xs font-medium text-slate-400">Sold out</span>
      ) : quantity > 0 ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeQty(-1)}
            aria-label={`Remove one ${product.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-4 text-center text-sm font-semibold text-slate-900">{quantity}</span>
          <button
            type="button"
            onClick={() => onChangeQty(1)}
            aria-label={`Add one more ${product.name}`}
            disabled={product.stockQuantity !== null && quantity >= product.stockQuantity}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="shrink-0 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      )}
    </div>
  );
}

// Shown once the guest lands back on this page after approving payment on
// PayPal's site -- captures the order server-side (see
// orders.service.ts capturePaypalCheckout) and reports the outcome.
function PaypalReturnBanner({ rsvpToken, paypalOrderId, onDone }: { rsvpToken: string; paypalOrderId: string; onDone: () => void }) {
  const capturePaypal = useCapturePaypal(rsvpToken);
  const [state, setState] = useState<"capturing" | "success" | "error">("capturing");
  const [error, setError] = useState("");

  useEffect(() => {
    capturePaypal
      .mutateAsync(paypalOrderId)
      .then(() => setState("success"))
      .catch((err) => {
        setState("error");
        setError(getApiErrorMessage(err));
      });
    // Only ever run once per paypalOrderId -- the mutation itself isn't a stable dependency.
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
  if (state === "success") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl2 border border-success-200 bg-success-50 p-4 shadow-card">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600" />
        <div>
          <p className="text-sm font-semibold text-success-800">Payment confirmed</p>
          <p className="text-sm text-success-700">Thanks for your purchase — see you at the event!</p>
        </div>
        <button onClick={onDone} className="ml-auto text-xs font-medium text-success-700 hover:underline">
          Dismiss
        </button>
      </div>
    );
  }
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl2 border border-danger-200 bg-danger-50 p-4 shadow-card">
      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-600" />
      <div>
        <p className="text-sm font-semibold text-danger-800">We couldn't confirm this payment</p>
        <p className="text-sm text-danger-700">{error || "Please contact the event organizer for help."}</p>
      </div>
      <button onClick={onDone} className="ml-auto text-xs font-medium text-danger-700 hover:underline">
        Dismiss
      </button>
    </div>
  );
}

export function ShopSection({
  rsvpToken,
  guestName: prefillName,
  guestEmail: prefillEmail,
  guestId,
}: {
  rsvpToken: string;
  guestName?: string;
  guestEmail?: string;
  guestId?: string;
}) {
  const { data, isLoading } = usePublicShop(rsvpToken);
  const checkout = useCheckout(rsvpToken);
  const [searchParams, setSearchParams] = useSearchParams();

  const [cart, setCart] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [guestName, setGuestName] = useState(prefillName ?? "");
  const [guestEmail, setGuestEmail] = useState(prefillEmail ?? "");
  const [provider, setProvider] = useState<PayoutProvider | "">("");
  const [deliveryMethod, setDeliveryMethod] = useState<"AT_EVENT" | "SHIPPING">("AT_EVENT");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");
  const [dialCode, setDialCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const orderParam = searchParams.get("order");
  const paypalOrderId = orderParam === "paypal_return" ? searchParams.get("token") : null;

  function dismissOrderBanner() {
    const next = new URLSearchParams(searchParams);
    next.delete("order");
    next.delete("token");
    next.delete("PayerID");
    setSearchParams(next, { replace: true });
  }

  const products = useMemo(() => data?.products ?? [], [data]);
  const paymentOptionsByCurrency = data?.paymentOptionsByCurrency ?? {};

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const cartCurrency: CurrencyCode | null = useMemo(() => {
    const [firstId] = Object.keys(cart).filter((id) => (cart[id] ?? 0) > 0);
    return firstId ? productById.get(firstId)?.currency ?? null : null;
  }, [cart, productById]);

  const cartItems = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([productId, quantity]) => ({ product: productById.get(productId), quantity }))
    .filter((i): i is { product: PublicShopProduct; quantity: number } => !!i.product);

  const cartTotal = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const availableProviders = cartCurrency ? paymentOptionsByCurrency[cartCurrency] ?? [] : [];

  function setQty(productId: string, product: PublicShopProduct, nextQty: number) {
    if (nextQty > 0 && cartCurrency && product.currency !== cartCurrency) {
      toast.error(`Your cart is in ${cartCurrency}. Clear it first to buy items priced in a different currency.`);
      return;
    }
    setCart((c) => ({ ...c, [productId]: Math.max(0, nextQty) }));
  }

  function clearCart() {
    setCart({});
    setShowForm(false);
    setDeliveryMethod("AT_EVENT");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setPostcode("");
    setCountry("");
    setDialCode("");
    setPhoneNumber("");
  }

  async function handleCheckout(e: FormEvent) {
    e.preventDefault();
    if (!guestName.trim() || !guestEmail.trim()) {
      toast.error("Enter your name and email to check out");
      return;
    }
    if (
      deliveryMethod === "SHIPPING" &&
      (!addressLine1.trim() || !city.trim() || !postcode.trim() || !country || !dialCode || !phoneNumber.trim())
    ) {
      toast.error("Fill in your shipping address and phone number to check out");
      return;
    }
    if (availableProviders.length === 0) {
      toast.error("This event hasn't connected a way to accept payment in this currency yet");
      return;
    }
    try {
      const { checkoutUrl } = await checkout.mutateAsync({
        guestName,
        guestEmail,
        guestId,
        deliveryMethod,
        ...(deliveryMethod === "SHIPPING"
          ? {
              shippingAddressLine1: addressLine1,
              shippingAddressLine2: addressLine2 || undefined,
              shippingCity: city,
              shippingPostcode: postcode,
              shippingCountry: country,
              shippingPhone: `${dialCode} ${phoneNumber}`.trim(),
            }
          : {}),
        items: cartItems.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        provider: provider || undefined,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  if (paypalOrderId) {
    return <PaypalReturnBanner rsvpToken={rsvpToken} paypalOrderId={paypalOrderId} onDone={dismissOrderBanner} />;
  }

  if (orderParam === "success") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl2 border border-success-200 bg-success-50 p-4 shadow-card">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600" />
        <div>
          <p className="text-sm font-semibold text-success-800">Payment successful</p>
          <p className="text-sm text-success-700">Thanks for your purchase — see you at the event!</p>
        </div>
        <button onClick={dismissOrderBanner} className="ml-auto text-xs font-medium text-success-700 hover:underline">
          Dismiss
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-6 flex justify-center rounded-xl2 border border-slate-200 bg-white p-6 shadow-card">
        <Spinner />
      </div>
    );
  }

  if (!data?.enabled || products.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
      {orderParam === "cancelled" && (
        <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">
          Checkout was cancelled — your cart is still here if you'd like to try again.
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-brand-600" />
          <h2 className="font-display text-lg font-semibold text-slate-900">Event Shop</h2>
        </div>
        {cartCount > 0 && <Badge variant="brand">{cartCount} in cart</Badge>}
      </div>
      <p className="mt-1 text-sm text-slate-500">Buy merchandise for this event — pick up at the event or have it shipped to you.</p>

      <div className="mt-3 divide-y divide-slate-100">
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            quantity={cart[product.id] ?? 0}
            disabled={product.stockQuantity === 0}
            onAdd={() => setQty(product.id, product, (cart[product.id] ?? 0) + 1)}
            onChangeQty={(delta) => setQty(product.id, product, (cart[product.id] ?? 0) + delta)}
          />
        ))}
      </div>

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
              <Button size="sm" onClick={() => setShowForm(true)} type="button">
                Checkout
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="mt-3 space-y-3">
              <Field label="Your name" htmlFor="shop-name">
                <Input id="shop-name" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
              </Field>
              <Field label="Your email" htmlFor="shop-email">
                <Input
                  id="shop-email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                />
              </Field>

              <Field label="Delivery">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("AT_EVENT")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      deliveryMethod === "AT_EVENT"
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Pickup at event
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("SHIPPING")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      deliveryMethod === "SHIPPING"
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Truck className="h-3.5 w-3.5" />
                    Ship to me
                  </button>
                </div>
              </Field>

              {deliveryMethod === "SHIPPING" && (
                <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <Field label="Address line 1" htmlFor="shop-address1">
                    <Input
                      id="shop-address1"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Address line 2 (optional)" htmlFor="shop-address2">
                    <Input id="shop-address2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City" htmlFor="shop-city">
                      <Input id="shop-city" value={city} onChange={(e) => setCity(e.target.value)} required />
                    </Field>
                    <Field label="Postcode" htmlFor="shop-postcode">
                      <Input id="shop-postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} required />
                    </Field>
                  </div>
                  <Field label="Country" htmlFor="shop-country">
                    <Select
                      id="shop-country"
                      value={country}
                      onChange={(e) => {
                        const code = e.target.value;
                        setCountry(code);
                        // Default the dial code to match -- guests can still
                        // override it below (e.g. shipping to a friend's
                        // address abroad but giving their own phone number).
                        const match = COUNTRIES.find((c) => c.code === code);
                        if (match) setDialCode(match.dialCode);
                      }}
                      required
                    >
                      <option value="">Select a country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Phone number" htmlFor="shop-phone-number">
                    <div className="flex gap-2">
                      <Select
                        id="shop-phone-dial-code"
                        aria-label="Country code"
                        value={dialCode}
                        onChange={(e) => setDialCode(e.target.value)}
                        className="w-28 shrink-0"
                        required
                      >
                        <option value="">Code</option>
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.dialCode}>
                            {c.dialCode} {c.name}
                          </option>
                        ))}
                      </Select>
                      <Input
                        id="shop-phone-number"
                        type="tel"
                        inputMode="tel"
                        placeholder="7700 900000"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                      />
                    </div>
                  </Field>
                </div>
              )}

              {availableProviders.length > 1 && (
                <Field label="Payment method" htmlFor="shop-provider">
                  <Select
                    id="shop-provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as PayoutProvider | "")}
                  >
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
                <Button type="submit" size="sm" isLoading={checkout.isPending} className="flex-1">
                  Pay {formatMoney(cartTotal, cartCurrency ?? "USD")}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
