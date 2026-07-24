import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api";
import { useCreateVendor, useUpdateVendor } from "@/hooks/useVendors";
import type { VendorRecord } from "@/types";

const CATEGORY_OPTIONS = [
  "CATERING",
  "VENUE",
  "PHOTOGRAPHY",
  "VIDEOGRAPHY",
  "FLORAL",
  "MUSIC_ENTERTAINMENT",
  "DECOR",
  "RENTALS",
  "TRANSPORTATION",
  "BEAUTY",
  "STATIONERY",
  "OTHER",
] as const;

const STATUS_OPTIONS = ["CONTACTED", "QUOTE_RECEIVED", "BOOKED", "CONFIRMED", "CANCELLED"] as const;

const schema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  category: z.enum(CATEGORY_OPTIONS),
  status: z.enum(STATUS_OPTIONS),
  contactName: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  cost: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  depositPaid: z.boolean().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function VendorFormModal({
  open,
  onClose,
  eventId,
  vendor,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  vendor?: VendorRecord;
}) {
  const isEdit = !!vendor;
  const createVendor = useCreateVendor(eventId);
  const updateVendor = useUpdateVendor(eventId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: vendor
      ? {
          name: vendor.name,
          category: vendor.category,
          status: vendor.status,
          contactName: vendor.contactName ?? "",
          email: vendor.email ?? "",
          phone: vendor.phone ?? "",
          website: vendor.website ?? "",
          cost: vendor.cost ?? "",
          depositPaid: vendor.depositPaid,
          notes: vendor.notes ?? "",
        }
      : { name: "", category: "OTHER", status: "CONTACTED", depositPaid: false },
  });

  async function onSubmit(values: FormValues) {
    const payload = { ...values, cost: values.cost === "" ? undefined : values.cost };
    try {
      if (isEdit) {
        await updateVendor.mutateAsync({ vendorId: vendor.id, input: payload });
        toast.success("Vendor updated");
      } else {
        await createVendor.mutateAsync(payload);
        toast.success("Vendor added");
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit vendor" : "Add vendor"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Vendor name" htmlFor="v-name" error={errors.name?.message}>
          <Input id="v-name" {...register("name")} error={!!errors.name} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" htmlFor="v-category">
            <Select id="v-category" {...register("category")}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase())}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="v-status">
            <Select id="v-status" {...register("status")}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase())}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact name" htmlFor="v-contact">
            <Input id="v-contact" {...register("contactName")} />
          </Field>
          <Field label="Cost ($)" htmlFor="v-cost" error={errors.cost?.message as string | undefined}>
            <Input id="v-cost" type="number" step="0.01" min="0" {...register("cost")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" htmlFor="v-email" error={errors.email?.message}>
            <Input id="v-email" type="email" {...register("email")} error={!!errors.email} />
          </Field>
          <Field label="Phone" htmlFor="v-phone">
            <Input id="v-phone" {...register("phone")} />
          </Field>
        </div>
        <Field label="Website" htmlFor="v-website">
          <Input id="v-website" placeholder="https://" {...register("website")} />
        </Field>
        <Field label="Notes" htmlFor="v-notes">
          <Textarea id="v-notes" rows={3} {...register("notes")} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox {...register("depositPaid")} />
          Deposit paid
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? "Save changes" : "Add vendor"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
