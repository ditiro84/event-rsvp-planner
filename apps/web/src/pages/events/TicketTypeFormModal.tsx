import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api";
import { CURRENCIES } from "@/lib/format";
import { useCreateTicketType, useUpdateTicketType } from "@/hooks/useTicketTypes";
import type { TicketTypeRecord } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Ticket name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
  currency: z.enum(["USD", "GBP", "NGN"]),
  quantityTotal: z.union([z.coerce.number().int().min(1), z.literal("")]).optional(),
  salesStartAt: z.string().optional(),
  salesEndAt: z.string().optional(),
  minPerOrder: z.coerce.number().int().min(1),
  maxPerOrder: z.coerce.number().int().min(1),
  isActive: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

function toLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TicketTypeFormModal({
  open,
  onClose,
  eventId,
  ticketType,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  ticketType?: TicketTypeRecord;
}) {
  const isEdit = !!ticketType;
  const createTicketType = useCreateTicketType(eventId);
  const updateTicketType = useUpdateTicketType(eventId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: ticketType
      ? {
          name: ticketType.name,
          description: ticketType.description ?? "",
          price: ticketType.price,
          currency: ticketType.currency,
          quantityTotal: ticketType.quantityTotal ?? "",
          salesStartAt: toLocalInput(ticketType.salesStartAt),
          salesEndAt: toLocalInput(ticketType.salesEndAt),
          minPerOrder: ticketType.minPerOrder,
          maxPerOrder: ticketType.maxPerOrder,
          isActive: ticketType.isActive,
        }
      : {
          name: "",
          description: "",
          price: 0,
          currency: "USD",
          quantityTotal: "",
          salesStartAt: "",
          salesEndAt: "",
          minPerOrder: 1,
          maxPerOrder: 10,
          isActive: true,
        },
  });

  async function onSubmit(values: FormValues) {
    if (values.minPerOrder > values.maxPerOrder) {
      toast.error("Minimum tickets per order can't be greater than the maximum");
      return;
    }
    const payload = {
      ...values,
      quantityTotal: values.quantityTotal === "" ? null : values.quantityTotal,
      salesStartAt: values.salesStartAt || null,
      salesEndAt: values.salesEndAt || null,
    };
    try {
      if (isEdit && ticketType) {
        await updateTicketType.mutateAsync({ ticketTypeId: ticketType.id, input: payload });
        toast.success("Ticket type updated");
      } else {
        await createTicketType.mutateAsync(payload);
        toast.success("Ticket type added");
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit ticket type" : "Add ticket type"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Ticket name" htmlFor="t-name" error={errors.name?.message} hint="e.g. General Admission, VIP, Early Bird">
          <Input id="t-name" {...register("name")} error={!!errors.name} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Price" htmlFor="t-price" error={errors.price?.message} className="col-span-2">
            <Input id="t-price" type="number" step="0.01" min="0" {...register("price")} error={!!errors.price} />
          </Field>
          <Field label="Currency" htmlFor="t-currency">
            <Select id="t-currency" {...register("currency")}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label="Capacity (blank = unlimited)"
          htmlFor="t-quantity"
          error={errors.quantityTotal?.message as string | undefined}
        >
          <Input id="t-quantity" type="number" min="1" {...register("quantityTotal")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sales start (optional)" htmlFor="t-start">
            <Input id="t-start" type="datetime-local" {...register("salesStartAt")} />
          </Field>
          <Field label="Sales end (optional)" htmlFor="t-end">
            <Input id="t-end" type="datetime-local" {...register("salesEndAt")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min per order" htmlFor="t-min" error={errors.minPerOrder?.message}>
            <Input id="t-min" type="number" min="1" {...register("minPerOrder")} error={!!errors.minPerOrder} />
          </Field>
          <Field label="Max per order" htmlFor="t-max" error={errors.maxPerOrder?.message}>
            <Input id="t-max" type="number" min="1" {...register("maxPerOrder")} error={!!errors.maxPerOrder} />
          </Field>
        </div>
        <Field label="Description" htmlFor="t-description">
          <Textarea id="t-description" rows={3} {...register("description")} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox {...register("isActive")} />
          On sale (visible on the public event page)
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? "Save changes" : "Add ticket type"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
