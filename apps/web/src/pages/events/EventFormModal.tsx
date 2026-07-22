import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api";
import { EVENT_TYPE_LABELS, formatDateInput } from "@/lib/format";
import { useCreateEvent, useUpdateEvent } from "@/hooks/useEvents";
import type { EventRecord } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Event name is required"),
  type: z.string(),
  description: z.string().optional(),
  date: z.string().min(1, "Event date is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  capacity: z.string().optional(),
  rsvpDeadline: z.string().optional(),
  customMessage: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function EventFormModal({
  open,
  onClose,
  event,
}: {
  open: boolean;
  onClose: () => void;
  event?: EventRecord;
}) {
  const isEdit = !!event;
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent(event?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: event
      ? {
          name: event.name,
          type: event.type,
          description: event.description ?? "",
          date: formatDateInput(event.date),
          startTime: event.startTime ?? "",
          endTime: event.endTime ?? "",
          venueName: event.venueName ?? "",
          venueAddress: event.venueAddress ?? "",
          capacity: event.capacity ? String(event.capacity) : "",
          rsvpDeadline: formatDateInput(event.rsvpDeadline),
          customMessage: event.customMessage ?? "",
        }
      : undefined,
  });

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      capacity: values.capacity ? Number(values.capacity) : undefined,
      rsvpDeadline: values.rsvpDeadline || undefined,
    };
    try {
      if (isEdit) {
        await updateEvent.mutateAsync(payload);
        toast.success("Event updated");
      } else {
        await createEvent.mutateAsync(payload);
        toast.success("Event created");
        reset();
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit event" : "Create a new event"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Event name" htmlFor="name" error={errors.name?.message} >
          <Input id="name" {...register("name")} error={!!errors.name} />
        </Field>
        <Field label="Event type" htmlFor="type">
          <Select id="type" {...register("type")}>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Event date" htmlFor="date" error={errors.date?.message}>
          <Input id="date" type="date" {...register("date")} error={!!errors.date} />
        </Field>
        <Field label="RSVP deadline" htmlFor="rsvpDeadline" hint="Optional">
          <Input id="rsvpDeadline" type="date" {...register("rsvpDeadline")} />
        </Field>
        <Field label="Start time" htmlFor="startTime" hint="Optional, e.g. 17:00">
          <Input id="startTime" {...register("startTime")} />
        </Field>
        <Field label="End time" htmlFor="endTime" hint="Optional">
          <Input id="endTime" {...register("endTime")} />
        </Field>
        <Field label="Venue name" htmlFor="venueName">
          <Input id="venueName" {...register("venueName")} />
        </Field>
        <Field label="Guest capacity" htmlFor="capacity" hint="Optional">
          <Input id="capacity" type="number" min={1} {...register("capacity")} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Venue address" htmlFor="venueAddress">
            <Input id="venueAddress" {...register("venueAddress")} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description" htmlFor="description">
            <Textarea id="description" {...register("description")} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Message to guests" htmlFor="customMessage" hint="Shown on the public RSVP page">
            <Textarea id="customMessage" {...register("customMessage")} />
          </Field>
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? "Save changes" : "Create event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
