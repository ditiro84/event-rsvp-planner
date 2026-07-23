import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api";
import { useCreateGuest, useUpdateGuest } from "@/hooks/useGuests";
import type { Guest } from "@/types";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  groupName: z.string().optional(),
  rsvpStatus: z.enum(["PENDING", "CONFIRMED", "DECLINED", "MAYBE"]),
  additionalGuests: z.array(z.object({ fullName: z.string().min(1, "Enter a name or remove this row") })),
  mealPreference: z.string().optional(),
  dietaryRequirements: z.string().optional(),
  accessibilityRequirements: z.string().optional(),
  specialNotes: z.string().optional(),
  isVip: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export function GuestFormModal({
  open,
  onClose,
  eventId,
  guest,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  guest?: Guest;
}) {
  const isEdit = !!guest;
  const createGuest = useCreateGuest(eventId);
  const updateGuest = useUpdateGuest(eventId);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: guest
      ? {
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email ?? "",
          phone: guest.phone ?? "",
          groupName: guest.groupName ?? "",
          rsvpStatus: guest.rsvpStatus,
          additionalGuests: (guest.party ?? []).map((p) => ({ fullName: p.fullName })),
          mealPreference: guest.mealPreference ?? "",
          dietaryRequirements: guest.dietaryRequirements ?? "",
          accessibilityRequirements: guest.accessibilityRequirements ?? "",
          specialNotes: guest.specialNotes ?? "",
          isVip: guest.isVip,
        }
      : { firstName: "", lastName: "", rsvpStatus: "PENDING", isVip: false, additionalGuests: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "additionalGuests" });

  async function onSubmit(values: FormValues) {
    const { additionalGuests, ...rest } = values;
    const payload = {
      ...rest,
      // Every named "+1" gets its own seat on the seating planner, so send
      // the full list -- additionalGuestsCount is derived from it server-side.
      additionalGuestNames: additionalGuests.map((g) => g.fullName.trim()).filter(Boolean),
    };
    try {
      if (isEdit) {
        await updateGuest.mutateAsync({ guestId: guest.id, input: payload });
        toast.success("Guest updated");
      } else {
        await createGuest.mutateAsync(payload);
        toast.success("Guest added");
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit guest" : "Add a guest"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="firstName" error={errors.firstName?.message}>
          <Input id="firstName" {...register("firstName")} error={!!errors.firstName} />
        </Field>
        <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
          <Input id="lastName" {...register("lastName")} error={!!errors.lastName} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" {...register("email")} error={!!errors.email} />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" {...register("phone")} />
        </Field>
        <Field label="Group" htmlFor="groupName" hint="e.g. Bride's family, Team Marketing">
          <Input id="groupName" {...register("groupName")} />
        </Field>
        <Field label="RSVP status" htmlFor="rsvpStatus">
          <Select id="rsvpStatus" {...register("rsvpStatus")}>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="DECLINED">Declined</option>
            <option value="MAYBE">Maybe</option>
          </Select>
        </Field>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Additional guests (+1s)</label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => append({ fullName: "" })}
            >
              <Plus className="h-4 w-4" />
              Add name
            </Button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Name each person this guest is bringing so they can be seated individually on the seating
            planner, right beside {guest ? "this guest" : "the primary guest"}.
          </p>
          {fields.length > 0 && (
            <div className="mt-3 space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input
                    placeholder={`Guest ${index + 1} full name`}
                    {...register(`additionalGuests.${index}.fullName` as const)}
                    error={!!errors.additionalGuests?.[index]?.fullName}
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label="Remove guest"
                    className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Field label="Meal preference" htmlFor="mealPreference">
          <Input id="mealPreference" {...register("mealPreference")} placeholder="e.g. Vegetarian" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Dietary requirements" htmlFor="dietaryRequirements">
            <Textarea id="dietaryRequirements" {...register("dietaryRequirements")} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Accessibility requirements" htmlFor="accessibilityRequirements">
            <Textarea id="accessibilityRequirements" {...register("accessibilityRequirements")} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Special notes" htmlFor="specialNotes">
            <Textarea id="specialNotes" {...register("specialNotes")} />
          </Field>
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <Checkbox id="isVip" {...register("isVip")} />
          <label htmlFor="isVip" className="text-sm font-medium text-slate-700">
            Mark as VIP
          </label>
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? "Save changes" : "Add guest"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
