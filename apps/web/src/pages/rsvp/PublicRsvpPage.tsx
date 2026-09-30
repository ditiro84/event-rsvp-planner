import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarHeart, CheckCircle2, FileText, MapPin, PartyPopper, Plus, ShoppingBag, X, XCircle } from "lucide-react";
import { useInvitePrefill, usePublicEvent, useSubmitRsvp, useSubmitRsvpViaInvite } from "@/hooks/useRsvp";
import { useCheckout, usePublicShop } from "@/hooks/useProducts";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { formatDate, formatMoney } from "@/lib/format";
import { apiBaseUrl, getApiErrorMessage } from "@/lib/api";
import { DeliveryFields, PROVIDER_LABELS, ProductRow, ShopSection } from "./ShopSection";
import { usePageMeta } from "@/hooks/usePageMeta";
import { extractCardTheme, type CardTheme } from "@/lib/cardTheme";
import { CardThemeContext, buildCardThemeStyles, withAlpha } from "@/lib/cardThemeContext";
import type { CurrencyCode, PayoutProvider, PublicShopProduct } from "@/types";

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email").optional().or(z.literal("")),
    phone: z.string().optional(),
    attending: z.enum(["CONFIRMED", "DECLINED", "MAYBE"]),
    additionalGuestsCount: z.string().optional(),
    additionalGuestNames: z.array(z.object({ fullName: z.string() })).optional(),
    mealPreference: z.string().optional(),
    dietaryRequirements: z.string().optional(),
    accessibilityRequirements: z.string().optional(),
    message: z.string().optional(),
  });
type FormValues = z.infer<typeof schema>;

const CONFIRMATION_COPY: Record<string, { title: (name: string) => string; body: string }> = {
  CONFIRMED: {
    title: (name) => `Thank you, ${name}!`,
    body: "Your RSVP has been received. We look forward to celebrating with you.",
  },
  DECLINED: {
    title: (name) => `Thanks for letting us know, ${name}`,
    body: "We're sorry you can't make it this time, but we appreciate the reply.",
  },
  MAYBE: {
    title: (name) => `Thanks, ${name}`,
    body: "We've noted you as a maybe — let us know as soon as you're sure.",
  },
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

export default function PublicRsvpPage() {
  const { token, invitationToken } = useParams<{ token?: string; invitationToken?: string }>();

  // Two ways to land here: a shared event-wide link (?token) or a
  // personalized invite link from a QR code / email / WhatsApp message
  // (?invitationToken), which also comes back with this guest's own details
  // to pre-fill the form.
  const isInvite = !!invitationToken;
  const publicEventQuery = usePublicEvent(isInvite ? undefined : token);
  const inviteQuery = useInvitePrefill(isInvite ? invitationToken : undefined);

  const event = isInvite ? inviteQuery.data?.event : publicEventQuery.data;
  const guestPrefill = inviteQuery.data?.guestPrefill;
  const isLoading = isInvite ? inviteQuery.isLoading : publicEventQuery.isLoading;
  const isError = isInvite ? inviteQuery.isError : publicEventQuery.isError;

  // Title-only: this is a private, guest-specific invite link, not a page
  // meant to be found via search or given a rich social-share preview, so
  // it skips the description/OG/canonical overrides other pages set.
  usePageMeta({ title: event ? `RSVP - ${event.name}` : null });

  const submitByToken = useSubmitRsvp(token ?? "");
  const submitByInvite = useSubmitRsvpViaInvite(invitationToken ?? "");
  const submitRsvp = isInvite ? submitByInvite : submitByToken;

  // Both the shared event link and the personalized invite link serve
  // invitation media from a public, unauthenticated endpoint -- just pick
  // whichever token got us to this page. Each item is fetched by its own
  // id (see InvitationMediaPage.tsx), unlike the old single-card route.
  function mediaFileUrl(mediaId: string) {
    return isInvite
      ? `${apiBaseUrl}/rsvp/invite/${invitationToken}/invitation-media/${mediaId}/file`
      : `${apiBaseUrl}/rsvp/${token}/invitation-media/${mediaId}/file`;
  }

  // In-app route (not the API) for the standalone multi-item gallery page
  // -- see InvitationMediaPage.tsx. Only ever used as a target="_blank"
  // href, never navigated to from within this component.
  const invitationMediaPageUrl = isInvite
    ? `/rsvp/invite/${invitationToken}/invitation-media`
    : `/rsvp/${token}/invitation-media`;

  const [submitted, setSubmitted] = useState<
    { guestId: string; firstName: string; lastName: string; email: string; rsvpStatus: string } | null
  >(null);

  // Colours (and the image itself, for a blurred ambient background) pulled
  // from the event's first IMAGE invitation-media item, so the whole guest
  // page can pick up its look -- see lib/cardTheme.ts for the extraction
  // and lib/cardThemeContext.tsx for how it's shared with ShopSection
  // below. A PDF or video item is left alone and the page just keeps its
  // default brand/coral look.
  const [theme, setTheme] = useState<CardTheme | null>(null);
  const primaryImageMedia = event?.invitationMedia.find((m) => m.mimeType.startsWith("image/"));

  useEffect(() => {
    if (!primaryImageMedia) return;
    let cancelled = false;
    let createdUrl: string | null = null;
    extractCardTheme(mediaFileUrl(primaryImageMedia.id)).then((result) => {
      if (cancelled) {
        if (result) URL.revokeObjectURL(result.imageUrl);
        return;
      }
      if (result) createdUrl = result.imageUrl;
      setTheme(result);
    });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
    // Re-runs only when which item is primary actually changes, not on
    // every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryImageMedia?.id]);

  const themeStyles = buildCardThemeStyles(theme);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { attending: "CONFIRMED", additionalGuestNames: [] },
  });

  useEffect(() => {
    if (guestPrefill) {
      reset({
        attending: "CONFIRMED",
        firstName: guestPrefill.firstName,
        lastName: guestPrefill.lastName,
        email: guestPrefill.email ?? "",
        phone: guestPrefill.phone ?? "",
        additionalGuestNames: [],
      });
    }
  }, [guestPrefill, reset]);

  const attending = watch("attending");

  // When the host collects both a headcount and names for additional
  // guests, the two are kept in lockstep: typing "3" above immediately
  // gives three required name inputs below, rather than letting the count
  // and the number of names drift apart (planners kept getting RSVPs that
  // said "3 additional guests" with zero or one name attached, which then
  // showed up as unseatable "+2 unnamed" on the guest list).
  const additionalGuestsCountRaw = watch("additionalGuestsCount");
  const namesLinkedToCount = !!event?.allowPlusOnes && !!event?.allowPlusOneNames;
  const { fields: additionalGuestFields, append: appendAdditionalGuest, remove: removeAdditionalGuest } = useFieldArray({
    control,
    name: "additionalGuestNames",
  });

  useEffect(() => {
    if (!namesLinkedToCount) return;
    const count = Math.max(0, Math.min(20, Number(additionalGuestsCountRaw) || 0));
    const diff = count - additionalGuestFields.length;
    if (diff > 0) {
      appendAdditionalGuest(Array.from({ length: diff }, () => ({ fullName: "" })));
    } else if (diff < 0) {
      removeAdditionalGuest(
        Array.from({ length: -diff }, (_, i) => additionalGuestFields.length - 1 - i)
      );
    }
    // Only react to the count (and the event settings that decide whether
    // it drives names at all) -- not to additionalGuestFields itself,
    // which append/remove above already change; including it would fight
    // the very update this effect is making.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [additionalGuestsCountRaw, namesLinkedToCount]);

  // Merchandise, folded into the same submit as the RSVP itself. Guests
  // were completing the RSVP and never reaching the separate merchandise
  // form even when they meant to buy something -- see onSubmit below for
  // how the two are now sequenced under one button, and the mandatory
  // yes/no gate rendered further down the form.
  const shopQuery = usePublicShop(event?.rsvpToken);
  const checkout = useCheckout(event?.rsvpToken ?? "");
  const products = useMemo(() => shopQuery.data?.products ?? [], [shopQuery.data]);
  const shopEnabled = !shopQuery.isLoading && !!shopQuery.data?.enabled && products.length > 0;
  const paymentOptionsByCurrency = shopQuery.data?.paymentOptionsByCurrency ?? {};
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const [wantsMerchandise, setWantsMerchandise] = useState<"yes" | "no" | null>(null);
  const [merchError, setMerchError] = useState("");
  const [merchCheckoutError, setMerchCheckoutError] = useState("");
  const [merchOrderPlaced, setMerchOrderPlaced] = useState(false);
  const [cart, setCart] = useState<Record<string, { quantity: number; size: string }>>({});
  const [provider, setProvider] = useState<PayoutProvider | "">("");
  const [deliveryMethod, setDeliveryMethod] = useState<"AT_EVENT" | "SHIPPING">("AT_EVENT");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");
  const [dialCode, setDialCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [guestMarkedPaid, setGuestMarkedPaid] = useState(false);

  const cartCurrency: CurrencyCode | null = useMemo(() => {
    const [firstId] = Object.keys(cart).filter((id) => (cart[id]?.quantity ?? 0) > 0);
    return firstId ? productById.get(firstId)?.currency ?? null : null;
  }, [cart, productById]);

  const cartItems = Object.entries(cart)
    .filter(([, v]) => v.quantity > 0)
    .map(([productId, v]) => ({ product: productById.get(productId), quantity: v.quantity, size: v.size }))
    .filter((i): i is { product: PublicShopProduct; quantity: number; size: string } => !!i.product);

  const cartTotal = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
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

  // "No" clears any in-progress cart/delivery state along with hiding the
  // section, so switching Yes -> No -> Yes again starts clean rather than
  // resurrecting a stale selection.
  function chooseWantsMerchandise(choice: "yes" | "no") {
    setWantsMerchandise(choice);
    setMerchError("");
    if (choice === "no") {
      setCart({});
      setDeliveryMethod("AT_EVENT");
      setAddressLine1("");
      setAddressLine2("");
      setCity("");
      setPostcode("");
      setCountry("");
      setDialCode("");
      setPhoneNumber("");
      setProvider("");
      setGuestMarkedPaid(false);
    }
  }

  async function onSubmit(values: FormValues) {
    if (values.attending === "CONFIRMED" && namesLinkedToCount) {
      const count = values.additionalGuestsCount ? Number(values.additionalGuestsCount) : 0;
      const names = values.additionalGuestNames ?? [];
      const missingIndex = names.findIndex((n) => !n.fullName.trim());
      if (count > 0 && missingIndex !== -1) {
        setError(`additionalGuestNames.${missingIndex}.fullName` as const, {
          message: "Enter this guest's name",
        });
        return;
      }
    }

    const wantsMerchNow = shopEnabled && values.attending === "CONFIRMED";

    if (wantsMerchNow) {
      if (wantsMerchandise === null) {
        setMerchError("Please let us know if you'd like to purchase merchandise before submitting.");
        return;
      }
      if (wantsMerchandise === "yes") {
        if (cartItems.length === 0) {
          setMerchError('Select at least one item below, or choose "No" if you don\'t want to purchase anything.');
          return;
        }
        if (!values.email || !values.email.trim()) {
          setError("email", { message: "Email is required to complete your merchandise order" });
          return;
        }
        if (
          deliveryMethod === "SHIPPING" &&
          (!addressLine1.trim() || !city.trim() || !postcode.trim() || !country || !dialCode || !phoneNumber.trim())
        ) {
          setMerchError("Fill in your shipping address and phone number to complete your order.");
          return;
        }
      }
    }
    setMerchError("");
    setMerchCheckoutError("");

    const additionalGuestNames = (values.additionalGuestNames ?? [])
      .map((n) => n.fullName.trim())
      .filter(Boolean);

    try {
      const result = await submitRsvp.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email || undefined,
        phone: values.phone || undefined,
        attending: values.attending,
        additionalGuestsCount: values.additionalGuestsCount ? Number(values.additionalGuestsCount) : 0,
        additionalGuestNames,
        mealPreference: values.mealPreference || undefined,
        dietaryRequirements: values.dietaryRequirements || undefined,
        accessibilityRequirements: values.accessibilityRequirements || undefined,
        message: values.message || undefined,
      });
      setSubmitted({
        guestId: result.guest.id,
        firstName: result.guest.firstName,
        lastName: values.lastName,
        email: values.email || "",
        rsvpStatus: result.guest.rsvpStatus,
      });

      // The RSVP is saved at this point no matter what happens next -- a
      // guest's reply shouldn't be held hostage to their order going
      // through. See the merchCheckoutError banner on the confirmation
      // screen for how a failure here is surfaced without losing the RSVP
      // that just succeeded.
      if (wantsMerchNow && wantsMerchandise === "yes" && cartItems.length > 0) {
        try {
          const { checkoutUrl } = await checkout.mutateAsync({
            guestName: `${values.firstName} ${values.lastName}`.trim(),
            guestEmail: values.email || "",
            guestId: result.guest.id,
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
            // A processor is connected -- hand off to its hosted checkout
            // page, same as ShopSection's own standalone checkout. The RSVP
            // above is already saved, so abandoning payment here doesn't
            // lose it.
            window.location.href = checkoutUrl;
            return;
          }
          // No processor connected for this currency -- the order was
          // captured directly (status MANUAL). Surfaced via a note on the
          // confirmation screen; the order itself also shows up in "Your
          // orders" in the shop section below, same as any other order.
          setMerchOrderPlaced(true);
        } catch (err) {
          setMerchCheckoutError(getApiErrorMessage(err));
        }
      }
    } catch (err) {
      alert(getApiErrorMessage(err));
    }
  }

  if (isLoading) return <Spinner />;

  if (isError || !event) {
    return (
      <StatusScreen
        icon={<XCircle className="mx-auto h-10 w-10 text-slate-300" />}
        title="This RSVP link isn't valid"
        description="Please double-check the link or contact the event organizer."
      />
    );
  }

  if (submitted) {
    const copy = CONFIRMATION_COPY[submitted.rsvpStatus] ?? CONFIRMATION_COPY.CONFIRMED;
    return (
      <CardThemeContext.Provider value={theme}>
        <div className="relative min-h-screen">
          {/* Ambient page background: the card's own colours as a gradient
              wash, plus a soft blurred copy of the card image so
              "flowery"/decorative card designs carry through too (see
              lib/cardTheme.ts). This sits in its own plain wrapper at z-0
              with the real content lifted to z-10 -- nesting a negative
              z-index layer inside a div that itself paints bg-canvas would
              put the layer BEHIND that background and hide it completely
              (a real bug from the first pass here: the page stayed plain
              white despite a theme being active). Falls back to the flat
              bg-canvas colour when there's no theme. */}
          <div
            aria-hidden
            className={`fixed inset-0 z-0 scale-110 bg-canvas bg-cover bg-center ${theme ? "blur-lg" : ""}`}
            style={
              theme
                ? {
                    backgroundImage: `linear-gradient(to bottom right, ${withAlpha(theme.primary, 0.55)}, ${withAlpha(theme.secondary, 0.45)}), url(${theme.imageUrl})`,
                  }
                : undefined
            }
          />
          <div className="relative z-10 px-4 pb-16 pt-16">
            <div className="mx-auto max-w-lg">
              <div className="rounded-xl2 border border-slate-200 bg-white/95 p-8 text-center shadow-card backdrop-blur-sm">
                <CheckCircle2 className="mx-auto h-12 w-12 text-success-500" />
                <h1 className="mt-4 font-display text-xl font-semibold text-slate-900">{copy.title(submitted.firstName)}</h1>
                <p className="mt-2 text-sm text-slate-500">{copy.body}</p>
              </div>
              {merchOrderPlaced && (
                <div className="mt-4 flex items-start gap-3 rounded-xl2 border border-success-200 bg-success-50 p-4 shadow-card">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600" />
                  <div>
                    <p className="text-sm font-semibold text-success-800">Your merchandise order was placed too</p>
                    <p className="text-sm text-success-700">See "Your orders" below for details and delivery info.</p>
                  </div>
                </div>
              )}
              {merchCheckoutError && (
                <div className="mt-4 flex items-start gap-3 rounded-xl2 border border-danger-200 bg-danger-50 p-4 shadow-card">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-600" />
                  <div>
                    <p className="text-sm font-semibold text-danger-800">Your RSVP is confirmed, but we couldn't complete your order</p>
                    <p className="text-sm text-danger-700">{merchCheckoutError} You can try again below.</p>
                  </div>
                </div>
              )}
              {/* Shown right after confirming, not just before -- a guest who
                  just RSVP'd is the most likely to be curious about merch,
                  and this way they don't have to refresh the page to see it
                  again. Also doubles as the retry path if the combined
                  submit above got the RSVP through but the order failed. */}
              <ShopSection
                rsvpToken={event.rsvpToken}
                guestName={`${submitted.firstName} ${submitted.lastName}`.trim()}
                guestEmail={submitted.email || undefined}
                guestId={submitted.guestId}
              />
            </div>
          </div>
        </div>
      </CardThemeContext.Provider>
    );
  }

  if (!event.rsvpOpen) {
    return (
      <StatusScreen
        icon={<XCircle className="mx-auto h-10 w-10 text-slate-300" />}
        title="RSVPs are closed"
        description={`RSVPs for ${event.name} are no longer being accepted. Please contact the event organizer for help.`}
      />
    );
  }

  return (
    <CardThemeContext.Provider value={theme}>
      <div className="relative min-h-screen">
        {/* Ambient page background: the card's own colours as a gradient
            wash, plus a soft blurred copy of the card image so
            "flowery"/decorative card designs carry through too -- this is
            what makes the page read as "gold" (or whatever the card's
            colours are) instead of plain white. Sits in its own plain
            wrapper at z-0, with the real content lifted to z-10: nesting a
            negative z-index layer inside a div that itself paints
            bg-canvas puts the layer BEHIND that background and hides it
            completely (the bug in the first pass here -- the page stayed
            plain white despite a theme being active). Falls back to the
            flat bg-canvas colour when there's no theme. */}
        <div
          aria-hidden
          className={`fixed inset-0 z-0 scale-110 bg-canvas bg-cover bg-center ${theme ? "blur-lg" : ""}`}
          style={
            theme
              ? {
                  backgroundImage: `linear-gradient(to bottom right, ${withAlpha(theme.primary, 0.55)}, ${withAlpha(theme.tertiary, 0.5)}, ${withAlpha(theme.secondary, 0.45)}), url(${theme.imageUrl})`,
                }
              : undefined
          }
        />
        <div className="relative z-10 pb-16">
        {event.imageUrl ? (
          <div className="h-48 w-full overflow-hidden sm:h-64">
            <img src={event.imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          // Duotone gradient (brand -> coral) instead of a flat brand fill --
          // matches the app's two-color accent system and gives the hero more
          // life when there's no cover photo to carry the color. When a card
          // theme is available, its two colours replace the default gradient
          // via inline style (className stays as a fallback for when it isn't).
          <div
            className="h-28 w-full bg-gradient-to-br from-brand-600 via-brand-500 to-coral-500 sm:h-36"
            style={themeStyles.heroGradient}
          />
        )}
        <div className="mx-auto max-w-lg px-4 pt-8">
          <div className="text-center">
            {/* Stays outside the text-safety panel below so it keeps doing
                its "avatar overlapping the cover photo" overlap trick
                against the hero banner above, rather than poking out of a
                rounded panel edge. */}
            <div
              className="relative z-10 mx-auto -mt-16 flex h-20 w-20 items-center justify-center rounded-full border-4 border-canvas bg-gradient-to-br from-brand-50 to-coral-50 shadow-card ring-4 ring-white"
              style={theme ? { backgroundImage: "none", backgroundColor: `${theme.primary}1a` } : undefined}
            >
              <PartyPopper className="h-8 w-8 text-brand-600" style={theme ? { color: theme.primary } : undefined} />
            </div>

            {/* Text-safety panel: everything in here sits directly over the
                vivid ambient background (see the fixed layer above), so on a
                richly-coloured card that background can get dark/saturated
                enough that plain text (especially the gradient-filled
                title, which shares its colours with that background) loses
                contrast against it. A translucent near-white backing, the
                same frosted look the RSVP form card below already uses,
                guarantees every piece of text here stays readable no matter
                how bold the extracted palette is. Only applied when there's
                a theme -- otherwise this stays a plain, background-less
                block like before. */}
            <div
              className={theme ? "-mt-6 rounded-3xl px-6 pb-6 pt-10 shadow-card backdrop-blur-sm sm:px-8 sm:pb-8" : "mt-4"}
              style={themeStyles.surface}
            >
              {theme && (
                <div
                  aria-hidden
                  className="mx-auto mb-3 h-1.5 w-20 rounded-full"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${theme.primary}, ${theme.tertiary}, ${theme.secondary}, ${theme.quaternary})`,
                  }}
                />
              )}
              <h1
                className="font-display text-3xl font-extrabold tracking-tight bg-gradient-to-r from-brand-600 to-coral-500 bg-clip-text text-transparent sm:text-4xl"
                style={themeStyles.titleGradient}
              >
                {event.name}
              </h1>
              <div className="mt-3 flex flex-col items-center gap-2 text-sm text-slate-600">
                <span className="flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"
                    style={themeStyles.tint("primary")}
                  >
                    <CalendarHeart className="h-3.5 w-3.5" />
                  </span>
                  {formatDate(event.date)}
                  {event.startTime ? ` at ${event.startTime}` : ""}
                </span>
                {event.venueName && (
                  <span className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-600"
                      style={themeStyles.tint("tertiary")}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                    </span>
                    {event.venueName}
                    {event.venueAddress ? `, ${event.venueAddress}` : ""}
                  </span>
                )}
              </div>
              {event.customMessage && <p className="mt-4 text-sm text-slate-600">{event.customMessage}</p>}
              {guestPrefill && (
                <p className="mt-3 text-xs text-slate-400">
                  This invite was sent to {guestPrefill.firstName} {guestPrefill.lastName} — feel free to update any details below.
                </p>
              )}
              {event.invitationMedia.length > 0 && (
                // Always opens our own standalone gallery page (in a new tab)
                // rather than linking straight to the raw file -- that page
                // sets its own tab title ("Invitation - Event Name") and has
                // a clean in-app URL, whereas a raw file link hands the tab
                // over to the browser's native viewer (title/URL become the
                // file's own dimensions/raw API path, outside our control).
                // It also still handles paging through multiple items.
                <a
                  href={invitationMediaPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-base font-semibold text-white shadow-card transition-colors hover:bg-brand-700 hover:brightness-90"
                  style={themeStyles.primaryFill}
                >
                  <FileText className="h-5 w-5" />
                  {event.invitationMedia.length > 1 ? "View invitation" : "View invitation card"}
                </a>
              )}
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 space-y-4 rounded-xl2 border border-slate-200 bg-white/95 p-5 shadow-card backdrop-blur-sm"
          >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="firstName" error={errors.firstName?.message}>
              <Input id="firstName" {...register("firstName")} error={!!errors.firstName} />
            </Field>
            <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
              <Input id="lastName" {...register("lastName")} error={!!errors.lastName} />
            </Field>
          </div>
          <Field label="Email" htmlFor="email" error={errors.email?.message} hint="Optional, but helps us reach you">
            <Input id="email" type="email" {...register("email")} error={!!errors.email} />
          </Field>
          <Field label="Phone" htmlFor="phone" hint="Optional">
            <Input id="phone" {...register("phone")} />
          </Field>

          <Field label="Will you be attending?" htmlFor="attending">
            <Select id="attending" {...register("attending")}>
              <option value="CONFIRMED">Yes, I'll be there</option>
              <option value="MAYBE">Maybe</option>
              <option value="DECLINED">Sorry, can't make it</option>
            </Select>
          </Field>

          {attending === "CONFIRMED" && (
            <>
              {(event.allowPlusOnes || event.allowPlusOneNames) && (
                <p className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2.5 text-sm font-semibold text-warning-800">
                  Bringing anyone with you? Add them below so we know exactly who's coming -- don't just mention them in the message field.
                </p>
              )}
              {event.allowPlusOnes && (
                <Field
                  label="Number of additional guests"
                  htmlFor="additionalGuestsCount"
                  hint={<strong className="font-semibold text-slate-700">Not including yourself</strong>}
                >
                  <Input id="additionalGuestsCount" type="number" min={0} {...register("additionalGuestsCount")} />
                </Field>
              )}
              {event.allowPlusOneNames && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Names of additional guests</label>
                    {!namesLinkedToCount && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => appendAdditionalGuest({ fullName: "" })}
                      >
                        <Plus className="h-4 w-4" />
                        Add name
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {namesLinkedToCount
                      ? "One name for each additional guest above -- required."
                      : "Add a name for each person you're bringing."}
                  </p>
                  {Array.isArray(errors.additionalGuestNames) &&
                    errors.additionalGuestNames.some((e) => e?.fullName) && (
                    <p className="mt-1 text-xs text-red-600" role="alert">
                      Enter a name for every additional guest below.
                    </p>
                  )}
                  {namesLinkedToCount && additionalGuestFields.length === 0 && (
                    <p className="mt-2 text-xs italic text-slate-400">
                      Enter a number above to add name fields.
                    </p>
                  )}
                  {additionalGuestFields.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {additionalGuestFields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <Input
                            placeholder={`Guest ${index + 1} full name`}
                            {...register(`additionalGuestNames.${index}.fullName` as const)}
                            error={!!errors.additionalGuestNames?.[index]?.fullName}
                          />
                          {!namesLinkedToCount && (
                            <button
                              type="button"
                              onClick={() => removeAdditionalGuest(index)}
                              aria-label="Remove guest"
                              className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {event.allowMealSelection && (
                <Field label="Meal preference" htmlFor="mealPreference">
                  <Select id="mealPreference" {...register("mealPreference")}>
                    <option value="">Select a meal</option>
                    <option value="Standard">Standard</option>
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Halal">Halal</option>
                    <option value="Kosher">Kosher</option>
                    <option value="Gluten-Free">Gluten-Free</option>
                  </Select>
                </Field>
              )}
              {event.allowDietary && (
                <Field label="Dietary requirements" htmlFor="dietaryRequirements" hint="Allergies, intolerances, etc.">
                  <Textarea id="dietaryRequirements" {...register("dietaryRequirements")} />
                </Field>
              )}
              {event.allowAccessibilityInfo && (
                <Field label="Accessibility requirements" htmlFor="accessibilityRequirements">
                  <Textarea id="accessibilityRequirements" {...register("accessibilityRequirements")} />
                </Field>
              )}
            </>
          )}

          {event.allowSpecialRequests && (
            <Field label="Message to the host" htmlFor="message" hint="Optional">
              <Textarea id="message" {...register("message")} />
            </Field>
          )}

          {shopEnabled && attending === "CONFIRMED" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-brand-600" style={theme ? { color: theme.primary } : undefined} />
                <span className="text-sm font-semibold text-slate-900">Would you like to purchase merchandise?</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                This event has Fabric, Gele, Fila, T-Shirt etc available -- let us know now so it can go out with your RSVP.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => chooseWantsMerchandise("yes")}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    wantsMerchandise === "yes"
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                  style={wantsMerchandise === "yes" ? themeStyles.outline("primary") : undefined}
                >
                  Yes, I'd like to buy Fabric, Gele, Fila, T-Shirt etc
                </button>
                <button
                  type="button"
                  onClick={() => chooseWantsMerchandise("no")}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    wantsMerchandise === "no"
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                  style={wantsMerchandise === "no" ? themeStyles.outline("primary") : undefined}
                >
                  No, not this time
                </button>
              </div>
              {merchError && <p className="mt-2 text-xs font-semibold text-danger-600">{merchError}</p>}

              {wantsMerchandise === "yes" && (
                <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                  <div className="divide-y divide-slate-100">
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
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-600">Total</span>
                        <span className="font-bold text-slate-900">{formatMoney(cartTotal, cartCurrency ?? "USD")}</span>
                      </div>

                      <DeliveryFields
                        idPrefix="rsvp-shop"
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
                        <Field label="Payment method" htmlFor="rsvp-shop-provider">
                          <Select
                            id="rsvp-shop-provider"
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

                      {availableProviders.length === 0 && (
                        <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={guestMarkedPaid}
                            onChange={(e) => setGuestMarkedPaid(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            style={theme ? { accentColor: theme.primary } : undefined}
                          />
                          <span>
                            <span className="font-medium text-slate-900">I've already sent payment</span>
                            <span className="block text-xs text-slate-500">
                              Optional: tick this if you've already paid the host directly (e.g. via Zelle).
                            </span>
                          </span>
                        </label>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full hover:brightness-90"
            style={themeStyles.primaryFill}
            isLoading={isSubmitting || checkout.isPending}
          >
            {wantsMerchandise === "yes" && cartItems.length > 0
              ? availableProviders.length > 0
                ? `Submit RSVP & pay ${formatMoney(cartTotal, cartCurrency ?? "USD")}`
                : `Submit RSVP & place order -- ${formatMoney(cartTotal, cartCurrency ?? "USD")}`
              : "Submit RSVP"}
          </Button>
        </form>
        </div>
        </div>
      </div>
    </CardThemeContext.Provider>
  );
}
