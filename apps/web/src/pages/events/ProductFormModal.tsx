import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api";
import { useCreateProduct, useUpdateProduct, useUploadProductImage, productImageUrl } from "@/hooks/useProducts";
import type { ProductRecord } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
  stockQuantity: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  active: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export function ProductFormModal({
  open,
  onClose,
  eventId,
  product,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  product?: ProductRecord;
}) {
  const isEdit = !!product;
  const createProduct = useCreateProduct(eventId);
  const updateProduct = useUpdateProduct(eventId);
  const uploadImage = useUploadProductImage(eventId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: product
      ? {
          name: product.name,
          description: product.description ?? "",
          price: product.price,
          stockQuantity: product.stockQuantity ?? "",
          active: product.active,
        }
      : { name: "", description: "", price: 0, stockQuantity: "", active: true },
  });

  async function onSubmit(values: FormValues) {
    const payload = { ...values, stockQuantity: values.stockQuantity === "" ? null : values.stockQuantity };
    try {
      let productId = product?.id;
      if (isEdit && product) {
        await updateProduct.mutateAsync({ productId: product.id, input: payload });
        toast.success("Product updated");
      } else {
        const created = await createProduct.mutateAsync(payload);
        productId = created.id;
        toast.success("Product added");
      }
      if (pendingFile && productId) {
        await uploadImage.mutateAsync({ productId, file: pendingFile });
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit product" : "Add product"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-brand-400 hover:text-brand-600"
          >
            {pendingFile ? (
              <img src={URL.createObjectURL(pendingFile)} alt="" className="h-full w-full object-cover" />
            ) : product?.hasImage ? (
              <img src={productImageUrl(eventId, product.id)} alt="" className="h-full w-full object-cover" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
          </button>
          <div className="text-xs text-slate-500">
            <p className="font-medium text-slate-700">Product photo</p>
            <p>PNG, JPEG, or WEBP, up to 5MB.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <Field label="Product name" htmlFor="p-name" error={errors.name?.message}>
          <Input id="p-name" {...register("name")} error={!!errors.name} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price" htmlFor="p-price" error={errors.price?.message}>
            <Input id="p-price" type="number" step="0.01" min="0" {...register("price")} error={!!errors.price} />
          </Field>
          <Field label="Stock (blank = unlimited)" htmlFor="p-stock" error={errors.stockQuantity?.message as string | undefined}>
            <Input id="p-stock" type="number" min="0" {...register("stockQuantity")} />
          </Field>
        </div>
        <Field label="Description" htmlFor="p-description">
          <Textarea id="p-description" rows={3} {...register("description")} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox {...register("active")} />
          Visible in the guest-facing shop
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? "Save changes" : "Add product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
