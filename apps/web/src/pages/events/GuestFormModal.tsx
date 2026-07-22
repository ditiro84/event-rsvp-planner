import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
  additionalGuestsCount: z.string().optional(),
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
          additionalGuestsCount: String(guest.additionalGuestsCount ?? 0),
          mealPreference: guest.mealPreference ?? "",
          dietaryRequirements: guest.dietaryRequirements ?? "",
          accessibilityRequirements: guest.accessibilityRequirements ?? "",
          specialNotes: guest.specialNotes ?? "",
          isVip: guest.isVip,
        }
      : { firstName: "", lastName: "", rsvpStatus: "PENDING", isVip: false },
  });

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      additionalGuestsCount: values.additionalGuestsCount ? Number(values.additionalGuestsCount) : 0,
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
        <Field label="Additional guests" htmlFor="additionalGuestsCount" hint="Number of +1s / plus-ones">
          <Input id="additionalGuestsCount" type="number" min={0} {...register("additionalGuestsCount")} />
        </Field>
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
