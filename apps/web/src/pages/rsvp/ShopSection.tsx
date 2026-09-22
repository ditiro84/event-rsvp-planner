import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, MapPin, Minus, Package, Pencil, ShoppingBag, Plus, Truck, XCircle } from "lucide-react";
import {
  useCapturePaypal,
  useCheckout,
  useMyOrders,
  usePublicShop,
  useUpdateOrderDelivery,
  publicProductImageUrl,
} from "@/hooks/useProducts";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { formatMoney } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import { formatOrderItems, formatShippingAddress } from "@/lib/orders";
import { useCardThemeStyles } from "@/lib/cardThemeContext";
import type { CurrencyCode, OrderRecord, PayoutProvider, PublicShopProduct } from "@/types";

const PROVIDER_LABELS: Record<PayoutProvider, string> = {
  STRIPE_CONNECT: "Card (Stripe)",
  PAYSTACK: "Card / Bank Transfer (Paystack)",
  PAYPAL: "PayPal",
};

function ProductRow({
  product,
  quantity,
  size,
  disabled,
  onAdd,
  onChangeQty,
  onSizeChange,
}: {
  product: PublicShopProduct;
  quantity: number;
  size: string;
  disabled: boolean;
  onAdd: () => void;
  onChangeQty: (delta: number) => void;
  onSizeChange: (size: string) => void;
}) {
  const soldOut = product.stockQuantity === 0;
  const themeStyles = useCardThemeStyles();
  return (
    <div className="py-3">
      <div className="flex items-center gap-3">
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
            style={themeStyles.outline("primary")}
          >
            Add
          </button>
        )}
      </div>
      {/* Guest-specified size for this line item -- most items here are one
          listing covering a range of sizes (see the Size field's own
          comment on the planner side), so the guest picks theirs once
          they've added it to their cart. */}
      {quantity > 0 && (
        <div className="ml-[68px] mt-2">
          <Input
            value={size}
            onChange={(e) => onSizeChange(e.target.value)}
            placeholder="Size (optional, e.g. M or 42)"
            aria-label={`Size for ${product.name}`}
            className="h-8 max-w-[220px] text-xs"
          />
        </div>
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

// Editable delivery state shared by both the checkout form (a brand-new
// order) and ExistingOrderCard's edit form (an order already placed) --
// pulled out so the two never drift apart on the actual fields collected.
interface DeliveryFieldsValue {
  deliveryMethod: "AT_EVENT" | "SHIPPING";
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  country: string;
  dialCode: string;
  phoneNumber: string;
}

function DeliveryFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: DeliveryFieldsValue;
  onChange: (patch: Partial<DeliveryFieldsValue>) => void;
}) {
  const themeStyles = useCardThemeStyles();
  const { deliveryMethod, addressLine1, addressLine2, city, postcode, country, dialCode, phoneNumber } = value;

  return (
    <>
      <Field label="Delivery">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ deliveryMethod: "AT_EVENT" })}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              deliveryMethod === "AT_EVENT"
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
            style={deliveryMethod === "AT_EVENT" ? themeStyles.outline("primary") : undefined}
          >
            <MapPin className="h-3.5 w-3.5" />
            Pickup at event
          </button>
          <button
            type="button"
            onClick={() => onChange({ deliveryMethod: "SHIPPING" })}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              deliveryMethod === "SHIPPING"
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
            style={deliveryMethod === "SHIPPING" ? themeStyles.outline("tertiary") : undefined}
          >
            <Truck className="h-3.5 w-3.5" />
            Ship to me
          </button>
        </div>
      </Field>

      {deliveryMethod === "SHIPPING" && (
        <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <Field label="Address line 1" htmlFor={`${idPrefix}-address1`}>
            <Input
              id={`${idPrefix}-address1`}
              value={addressLine1}
              onChange={(e) => onChange({ addressLine1: e.target.value })}
              required
            />
          </Field>
          <Field label="Address line 2 (optional)" htmlFor={`${idPrefix}-address2`}>
            <Input
              id={`${idPrefix}-address2`}
              value={addressLine2}
              onChange={(e) => onChange({ addressLine2: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" htmlFor={`${idPrefix}-city`}>
              <Input id={`${idPrefix}-city`} value={city} onChange={(e) => onChange({ city: e.target.value })} required />
            </Field>
            <Field label="Postcode" htmlFor={`${idPrefix}-postcode`}>
              <Input
                id={`${idPrefix}-postcode`}
                value={postcode}
                onChange={(e) => onChange({ postcode: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="Country" htmlFor={`${idPrefix}-country`}>
            <Select
              id={`${idPrefix}-country`}
              value={country}
              onChange={(e) => {
                const code = e.target.value;
                // Default the dial code to match -- can still be
                // overridden below (e.g. shipping to a friend's address
                // abroad but giving their own phone number).
                const match = COUNTRIES.find((c) => c.code === code);
                onChange({ country: code, dialCode: match ? match.dialCode : dialCode });
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
          <Field label="Phone number" htmlFor={`${idPrefix}-phone-number`}>
            <div className="flex gap-2">
              <Select
                id={`${idPrefix}-phone-dial-code`}
                aria-label="Country code"
                value={dialCode}
                onChange={(e) => onChange({ dialCode: e.target.value })}
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
                id={`${idPrefix}-phone-number`}
                type="tel"
                inputMode="tel"
                placeholder="7700 900000"
                value={phoneNumber}
                onChange={(e) => onChange({ phoneNumber: e.target.value })}
                required
              />
            </div>
          </Field>
        </div>
      )}
    </>
  );
}

// Splits a stored "full international format" phone (e.g. "+44 7700
// 900000", see Order.shippingPhone's comment in schema.prisma) back into
// the dial-code + number pair DeliveryFields edits separately. Best-effort:
// falls back to putting everything in the number field if there's no space
// to split on.
function splitPhone(phone: string | null): { dialCode: string; phoneNumber: string } {
  if (!phone) return { dialCode: "", phoneNumber: "" };
  const spaceIdx = phone.indexOf(" ");
  if (spaceIdx <= 0) return { dialCode: "", phoneNumber: phone };
  return { dialCode: phone.slice(0, spaceIdx), phoneNumber: phone.slice(spaceIdx + 1) };
}

// One order a returning guest has already placed, with an inline "Edit
// delivery details" flow -- items/quantities are shown read-only (see the
// scope note on updateOrderDeliverySchema in orders.schema.ts: this only
// ever touches delivery, never what was actually purchased).
function ExistingOrderCard({ order, guestId, rsvpToken }: { order: OrderRecord; guestId: string; rsvpToken: string }) {
  const updateDelivery = useUpdateOrderDelivery(rsvpToken);
  const [editing, setEditing] = useState(false);
  const { dialCode: initialDialCode, phoneNumber: initialPhoneNumber } = splitPhone(order.shippingAddress?.phone ?? null);
  const [value, setValue] = useState<DeliveryFieldsValue>({
    deliveryMethod: order.deliveryMethod === "SHIPPING" ? "SHIPPING" : "AT_EVENT",
    addressLine1: order.shippingAddress?.line1 ?? "",
    addressLine2: order.shippingAddress?.line2 ?? "",
    city: order.shippingAddress?.city ?? "",
    postcode: order.shippingAddress?.postcode ?? "",
    country: order.shippingAddress?.country ?? "",
    dialCode: initialDialCode,
    phoneNumber: initialPhoneNumber,
  });

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (
      value.deliveryMethod === "SHIPPING" &&
      (!value.addressLine1.trim() || !value.city.trim() || !value.postcode.trim() || !value.country || !value.dialCode || !value.phoneNumber.trim())
    ) {
      toast.error("Fill in your shipping address and phone number");
      return;
    }
    try {
      await updateDelivery.mutateAsync({
        orderId: order.id,
        guestId,
        deliveryMethod: value.deliveryMethod,
        ...(value.deliveryMethod === "SHIPPING"
          ? {
              shippingAddressLine1: value.addressLine1,
              shippingAddressLine2: value.addressLine2 || undefined,
              shippingCity: value.city,
              shippingPostcode: value.postcode,
              shippingCountry: value.country,
              shippingPhone: `${value.dialCode} ${value.phoneNumber}`.trim(),
            }
          : {}),
      });
      toast.success("Delivery details updated");
      setEditing(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <p className="text-sm font-medium text-slate-900">{formatOrderItems(order.items)}</p>
      {!editing ? (
        <>
          <p className="mt-1 text-xs text-slate-500">
            {order.shippingAddress ? formatShippingAddress(order.shippingAddress) : "Collecting at the event"}
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
          >
            <Pencil className="h-3 w-3" />
            Edit delivery details
          </button>
        </>
      ) : (
        <form onSubmit={handleSave} className="mt-3 space-y-3">
          <DeliveryFields idPrefix={`order-${order.id}`} value={value} onChange={(patch) => setValue((v) => ({ ...v, ...patch }))} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={updateDelivery.isPending} className="flex-1">
              Save
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// Shown when a returning guest (identified by guestId -- see the prop's
// comment on ShopSection below) already has merchandise order(s) for this
// event, so they can fix up delivery details instead of placing a
// duplicate order for the same items.
function ExistingOrders({ rsvpToken, guestId }: { rsvpToken: string; guestId?: string }) {
  const { data: orders } = useMyOrders(rsvpToken, guestId);
  if (!guestId || !orders || orders.length === 0) return null;

  return (
    <div className="mb-5 border-b border-slate-100 pb-5">
      <h3 className="text-sm font-semibold text-slate-900">Your order{orders.length > 1 ? "s" : ""}</h3>
      <div className="mt-2 space-y-2">
        {orders.map((order) => (
          <ExistingOrderCard key={order.id} order={order} guestId={guestId} rsvpToken={rsvpToken} />
        ))}
      </div>
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
  // Picked up from CardThemeContext -- see PublicRsvpPage.tsx, which
  // computes the theme from the event's invitation card and provides it to
  // this whole subtree. Falls back to the app's default brand/coral look
  // everywhere below when there's no theme (theme === null).
  const themeStyles = useCardThemeStyles();

  // Keyed by productId. size is guest-entered per line item -- see
  // OrderItem.selectedSize in schema.prisma.
  const [cart, setCart] = useState<Record<string, { quantity: number; size: string }>>({});
  // Set once a MANUAL order (no payment processor connected -- see
  // orders.service.ts createCheckoutSession) is placed, so the form can be
  // swapped for a confirmation instead of redirecting anywhere.
  const [orderPlaced, setOrderPlaced] = useState(false);
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
  // Guest self-report, only meaningful (and only shown) when there's no
  // payment processor connected -- see the field's comment on Order in
  // schema.prisma for why this never auto-confirms payment on its own.
  const [guestMarkedPaid, setGuestMarkedPaid] = useState(false);

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
    const [firstId] = Object.keys(cart).filter((id) => (cart[id]?.quantity ?? 0) > 0);
    return firstId ? productById.get(firstId)?.currency ?? null : null;
  }, [cart, productById]);

  const cartItems = Object.entries(cart)
    .filter(([, v]) => v.quantity > 0)
    .map(([productId, v]) => ({ product: productById.get(productId), quantity: v.quantity, size: v.size }))
    .filter((i): i is { product: PublicShopProduct; quantity: number; size: string } => !!i.product);

  const cartTotal = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const availableProviders = cartCurrency ? paymentOptionsByCurrency[cartCurrency] ?? [] : [];

  function setQty(productId: string, product: PublicShopProduct, nextQty: number) {
    if (nextQty > 0 && cartCurrency && product.currency !== cartCurrency) {
      toast.error(`Your cart is in ${cartCurrency}. Clear it first to buy items priced in a different currency.`);
      return;
    }
    setCart((c) => ({ ...c, [productId]: { quantity: Math.max(0, nextQty), size: c[productId]?.size ?? "" } }));
  }

  function setItemSize(productId: string, size: string) {
    setCart((c) => ({ ...c, [productId]: { quantity: c[productId]?.quantity ?? 0, size } }));
  }

  function clearCart() {
    setCart({});
    setOrderPlaced(false);
    setDeliveryMethod("AT_EVENT");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setPostcode("");
    setCountry("");
    setDialCode("");
    setPhoneNumber("");
    setGuestMarkedPaid(false);
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
        items: cartItems.map((i) => ({ productId: i.product.id, quantity: i.quantity, selectedSize: i.size.trim() || undefined })),
        provider: provider || undefined,
        guestMarkedPaid: availableProviders.length === 0 ? guestMarkedPaid : undefined,
      });
      if (checkoutUrl) {
        // A processor is connected -- hand off to its hosted checkout page
        // as before.
        window.location.href = checkoutUrl;
        return;
      }
      // No processor connected for this currency -- the order was captured
      // directly (status MANUAL, see orders.service.ts). Nothing to redirect
      // to, so just confirm inline; the guest pays the host however the
      // product description says to.
      setOrderPlaced(true);
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
          <ShoppingBag className="h-5 w-5 text-brand-600" style={themeStyles.theme ? { color: themeStyles.theme.primary } : undefined} />
          <h2 className="font-display text-lg font-semibold text-slate-900">Event Shop</h2>
        </div>
        {cartCount > 0 &&
          (themeStyles.theme ? (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
              style={themeStyles.tint("primary")}
            >
              {cartCount} in cart
            </span>
          ) : (
            <Badge variant="brand">{cartCount} in cart</Badge>
          ))}
      </div>
      <p className="mt-1 text-sm text-slate-500">Buy merchandise for this event — pick up at the event or have it shipped to you.</p>

      <ExistingOrders rsvpToken={rsvpToken} guestId={guestId} />

      <div className="mt-3 divide-y divide-slate-100">
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            quantity={cart[product.id]?.quantity ?? 0}
            size={cart[product.id]?.size ?? ""}
            disabled={product.stockQuantity === 0}
            onAdd={() => setQty(product.id, product, (cart[product.id]?.quantity ?? 0) + 1)}
            onChangeQty={(delta) => setQty(product.id, product, (cart[product.id]?.quantity ?? 0) + delta)}
            onSizeChange={(size) => setItemSize(product.id, size)}
          />
        ))}
      </div>

      {cartItems.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600">Total</span>
            <span className="font-bold text-slate-900">{formatMoney(cartTotal, cartCurrency ?? "USD")}</span>
          </div>

          {/* Opens the moment the cart has anything in it (i.e. right when
              a guest clicks Add) rather than gating it behind a separate
              Checkout click -- delivery details and (if this event has one
              connected) payment happen in one step. */}
          {orderPlaced ? (
            <div className="mt-3 flex items-start gap-3 rounded-lg border border-success-200 bg-success-50 p-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600" />
              <div>
                <p className="text-sm font-semibold text-success-800">Order placed!</p>
                <p className="text-sm text-success-700">
                  The host will be in touch about payment — check the item description above for how they'd like to be paid.
                </p>
                <button
                  type="button"
                  onClick={clearCart}
                  className="mt-2 text-xs font-medium text-success-700 hover:underline"
                >
                  Shop for something else
                </button>
              </div>
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

              <DeliveryFields
                idPrefix="shop"
                value={{ deliveryMethod, addressLine1, addressLine2, city, postcode, country, dialCode, phoneNumber }}
                onChange={(patch) => {
                  if (patch.deliveryMethod !== undefined) setDeliveryMethod(patch.deliveryMethod);
                  if (patch.addressLine1 !== undefined) setAddressLine1(patch.addressLine1);
                  if (patch.addressLine2 !== undefined) setAddressLine2(patch.addressLine2);
                  if (patch.city !== undefined) setCity(patch.city);
                  if (patch.postcode !== undefined) setPostcode(patch.postcode);
                  if (patch.country !== undefined) setCountry(patch.country);
                  if (patch.dialCode !== undefined) setDialCode(patch.dialCode);
                  if (patch.phoneNumber !== undefined) setPhoneNumber(patch.phoneNumber);
                }}
              />

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

              {/* Only meaningful when there's no in-app processor -- the
                  guest is paying the host directly (see the item
                  description above), so this is a self-report the host
                  still needs to verify, not a real payment confirmation. */}
              {availableProviders.length === 0 && (
                <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={guestMarkedPaid}
                    onChange={(e) => setGuestMarkedPaid(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    style={themeStyles.theme ? { accentColor: themeStyles.theme.primary } : undefined}
                  />
                  <span>
                    <span className="font-medium text-slate-900">I've already sent payment</span>
                    <span className="block text-xs text-slate-500">
                      Optional: tick this if you've already paid the host directly (e.g. via Zelle).
                    </span>
                  </span>
                </label>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={clearCart}>
                  Clear cart
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={checkout.isPending}
                  className="flex-1 hover:brightness-90"
                  style={themeStyles.primaryFill}
                >
                  {availableProviders.length > 0
                    ? `Pay ${formatMoney(cartTotal, cartCurrency ?? "USD")}`
                    : `Submit order — ${formatMoney(cartTotal, cartCurrency ?? "USD")}`}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
