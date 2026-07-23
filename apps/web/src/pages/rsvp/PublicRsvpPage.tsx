import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarHeart, CheckCircle2, MapPin, PartyPopper } from "lucide-react";
import { useInvitePrefill, usePublicEvent, useSubmitRsvp, useSubmitRsvpViaInvite } from "@/hooks/useRsvp";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { formatDate } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";

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

  const submitByToken = useSubmitRsvp(token ?? "");
  const submitByInvite = useSubmitRsvpViaInvite(invitationToken ?? "");
  const submitRsvp = isInvite ? submitByInvite : submitByToken;

  const [submitted, setSubmitted] = useState<{ firstName: string; rsvpStatus: string } | null>(null);

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
      setSubmitted({ firstName: result.guest.firstName, rsvpStatus: result.guest.rsvpStatus });
    } catch (err) {
      alert(getApiErrorMessage(err));
    }
  }

  if (isLoading) return <Spinner />;

  if (isError || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">This RSVP link isn't valid</h1>
          <p className="mt-2 text-sm text-slate-500">Please double-check the link or contact the event organizer.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
        <div className="max-w-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Thanks, {submitted.firstName}!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your RSVP has been recorded as <strong>{submitted.rsvpStatus.toLowerCase()}</strong>. The event host will be
            able to see your response.
          </p>
        </div>
      </div>
    );
  }

  if (!event.rsvpOpen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">RSVPs are closed</h1>
          <p className="mt-2 text-sm text-slate-500">
            RSVPs for {event.name} are no longer being accepted. Please contact the event organizer for help.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {event.imageUrl && (
        <div className="h-48 w-full overflow-hidden sm:h-64">
          <img src={event.imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="mx-auto max-w-lg px-4 pt-8">
        <div className="text-center">
          <PartyPopper className="mx-auto h-8 w-8 text-brand-600" />
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">{event.name}</h1>
          <div className="mt-2 flex flex-col items-center gap-1 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <CalendarHeart className="h-4 w-4" />
              {formatDate(event.date)}
              {event.startTime ? ` at ${event.startTime}` : ""}
            </span>
            {event.venueName && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
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
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
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

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Submit RSVP
          </Button>
        </form>
      </div>
    </div>
  );
}
