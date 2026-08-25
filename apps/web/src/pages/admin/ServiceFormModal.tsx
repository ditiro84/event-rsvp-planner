import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api";
import { useCreateService, useUpdateService } from "@/hooks/useLandingServices";
import { SERVICE_ICON_OPTIONS, type LandingService } from "@/types";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().min(1, "Description is required").max(400),
  icon: z.enum(SERVICE_ICON_OPTIONS),
  isActive: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export function ServiceFormModal({
  open,
  onClose,
  service,
}: {
  open: boolean;
  onClose: () => void;
  service?: LandingService;
}) {
  const isEdit = !!service;
  const createService = useCreateService();
  const updateService = useUpdateService();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: service
      ? { title: service.title, description: service.description, icon: service.icon, isActive: service.isActive }
      : { title: "", description: "", icon: "Sparkles", isActive: true },
  });

  const selectedIcon = watch("icon");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PreviewIcon = (Icons as any)[selectedIcon] ?? Icons.Sparkles;

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && service) {
        await updateService.mutateAsync({ serviceId: service.id, input: values });
        toast.success("Service updated");
      } else {
        await createService.mutateAsync(values);
        toast.success("Service added");
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit service" : "Add service"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <PreviewIcon className="h-6 w-6" />
          </span>
          <Field label="Icon" htmlFor="s-icon" className="flex-1">
            <Select id="s-icon" {...register("icon")}>
              {SERVICE_ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Title" htmlFor="s-title" error={errors.title?.message}>
          <Input id="s-title" {...register("title")} error={!!errors.title} />
        </Field>
        <Field label="Description" htmlFor="s-description" error={errors.description?.message}>
          <Textarea id="s-description" rows={3} {...register("description")} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox {...register("isActive")} />
          Show on the landing page
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? "Save changes" : "Add service"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
