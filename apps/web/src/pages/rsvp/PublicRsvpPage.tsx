import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarHeart, CheckCircle2, FileText, MapPin, PartyPopper, XCircle } from "lucide-react";
import { useInvitePrefill, usePublicEvent, useSubmitRsvp, useSubmitRsvpViaInvite } from "@/hooks/useRsvp";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { formatDate } from "@/lib/format";
import { apiBaseUrl, getApiErrorMessage } from "@/lib/api";
import { ShopSection } from "./ShopSection";
import { usePageMeta } from "@/hooks/usePageMeta";
import { extractCardTheme, type CardTheme } from "@/lib/cardTheme";
import { CardThemeContext, buildCardThemeStyles, withAlpha } from "@/lib/cardThemeContext";

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email").optional().or(z.literal("")),
    phone: z.string().optional(),
    attending: z.enum(["CONFIRMED", "DECLINED", "MAYBE"]),
    additionalGuestsCount: z.string().optional(),
    additionalGuestNamesRaw: z.string().optional(),
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

  // Both the shared event link and the personalized invite link serve the
  // card from a public, unauthenticated endpoint -- just pick whichever
  // token got us to this page.
  const invitationCardUrl = isInvite
    ? `${apiBaseUrl}/rsvp/invite/${invitationToken}/invitation-card`
    : `${apiBaseUrl}/rsvp/${token}/invitation-card`;

  const [submitted, setSubmitted] = useState<
    { guestId: string; firstName: string; lastName: string; email: string; rsvpStatus: string } | null
  >(null);

  // Colours (and the card image itself, for a blurred ambient background)
  // pulled from the event's invitation card, so the whole guest page can
  // pick up the card's look -- see lib/cardTheme.ts for the extraction and
  // lib/cardThemeContext.tsx for how it's shared with ShopSection below.
  // Only attempted for image cards (invitationCardIsImage); a PDF card is
  // left alone and the page just keeps its default brand/coral look.
  const [theme, setTheme] = useState<CardTheme | null>(null);

  useEffect(() => {
    if (!event?.invitationCardIsImage) return;
    let cancelled = false;
    let createdUrl: string | null = null;
    extractCardTheme(invitationCardUrl).then((result) => {
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
    // invitationCardUrl is derived from token/invitationToken, which don't
    // change without a full remount, so it's intentionally left out here to
    // avoid re-extracting on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.invitationCardIsImage]);

  const themeStyles = buildCardThemeStyles(theme);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { attending: "CONFIRMED" } });

  useEffect(() => {
    if (guestPrefill) {
      reset({
        attending: "CONFIRMED",
        firstName: guestPrefill.firstName,
        lastName: guestPrefill.lastName,
        email: guestPrefill.email ?? "",
        phone: guestPrefill.phone ?? "",
      });
    }
  }, [guestPrefill, reset]);

  const attending = watch("attending");

  async function onSubmit(values: FormValues) {
    const additionalGuestNames = (values.additionalGuestNamesRaw || "")
      .split(",")
      .map((n) => n.trim())
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
              {/* Shown right after confirming, not just before -- a guest who
                  just RSVP'd is the most likely to be curious about merch,
                  and this way they don't have to refresh the page to see it
                  again. */}
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
              {event.hasInvitationCard && (
                <a
                  href={invitationCardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-base font-semibold text-white shadow-card transition-colors hover:bg-brand-700 hover:brightness-90"
                  style={themeStyles.primaryFill}
                >
                  <FileText className="h-5 w-5" />
                  View invitation card
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
              {event.allowPlusOnes && (
                <Field label="Number of additional guests" htmlFor="additionalGuestsCount" hint="Not including yourself">
                  <Input id="additionalGuestsCount" type="number" min={0} {...register("additionalGuestsCount")} />
                </Field>
              )}
              {event.allowPlusOneNames && (
                <Field label="Names of additional guests" htmlFor="additionalGuestNamesRaw" hint="Separate names with commas">
                  <Input id="additionalGuestNamesRaw" {...register("additionalGuestNamesRaw")} placeholder="e.g. Michael Johnson, Priya Patel" />
                </Field>
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

          <Button
            type="submit"
            className="w-full hover:brightness-90"
            style={themeStyles.primaryFill}
            isLoading={isSubmitting}
          >
            Submit RSVP
          </Button>
        </form>

          <ShopSection
            rsvpToken={event.rsvpToken}
            guestName={guestPrefill ? `${guestPrefill.firstName} ${guestPrefill.lastName}`.trim() : undefined}
            guestEmail={guestPrefill?.email ?? undefined}
          />
        </div>
        </div>
      </div>
    </CardThemeContext.Provider>
  );
}
