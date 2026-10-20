import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useCreateBundle, useUpdateBundle } from "@/hooks/useProducts";
import type { ProductBundleRecord, ProductRecord } from "@/types";

// Planner picks which products make up the pack, how many of each, and one
// price for the lot. All products must share a currency; the bundle takes it.
export function BundleFormModal({
  open,
  onClose,
  eventId,
  products,
  bundle,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  products: ProductRecord[];
  bundle?: ProductBundleRecord;
}) {
  const createBundle = useCreateBundle(eventId);
  const updateBundle = useUpdateBundle(eventId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [active, setActive] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(bundle?.name ?? "");
    setDescription(bundle?.description ?? "");
    setPrice(bundle ? String(bundle.price) : "");
    setActive(bundle?.active ?? true);
    setQuantities(Object.fromEntries((bundle?.items ?? []).map((i) => [i.productId, i.quantity])));
  }, [open, bundle]);

  const chosen = products.filter((p) => (quantities[p.id] ?? 0) > 0);
  const currencies = Array.from(new Set(chosen.map((p) => p.currency)));
  const mixedCurrency = currencies.length > 1;
  const currency = currencies[0] ?? null;
  const separateTotal = chosen.reduce((sum, p) => sum + p.price * (quantities[p.id] ?? 0), 0);
  const priceNumber = Number(price);

  function setQty(productId: string, next: number) {
    setQuantities((q) => ({ ...q, [productId]: Math.max(0, Math.min(99, next)) }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Give the bundle a name");
    if (chosen.length === 0) return toast.error("Choose at least one product for the bundle");
    if (mixedCurrency) return toast.error("All products in a bundle must use the same currency");
    if (!Number.isFinite(priceNumber) || priceNumber < 0 || price.trim() === "") {
      return toast.error("Enter a price for the bundle");
    }
    const input = {
      name: name.trim(),
      description: description.trim() || null,
      price: priceNumber,
      active,
      items: chosen.map((p) => ({ productId: p.id, quantity: quantities[p.id] })),
    };
    setSaving(true);
    try {
      if (bundle) {
        await updateBundle.mutateAsync({ bundleId: bundle.id, input });
        toast.success("Bundle updated");
      } else {
        await createBundle.mutateAsync(input);
        toast.success("Bundle added");
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={bundle ? "Edit bundle" : "Add bundle"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Bundle name" htmlFor="b-name">
          <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Family pack" />
        </Field>
        <Field label="Description (optional)" htmlFor="b-desc">
          <Textarea id="b-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">What is in the bundle?</p>
          {products.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Add some products first.</p>
          ) : (
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {products.map((p) => {
                const qty = quantities[p.id] ?? 0;
                return (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{formatMoney(p.price, p.currency)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty(p.id, qty - 1)}
                        disabled={qty === 0}
                        aria-label={`Remove one ${p.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-slate-900">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(p.id, qty + 1)}
                        aria-label={`Add one ${p.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {mixedCurrency && (
            <p className="mt-1.5 text-xs font-medium text-danger-600">
              These products are priced in different currencies. Pick products that share one.
            </p>
          )}
        </div>

        <Field
          label={`Bundle price${currency ? ` (${currency})` : ""}`}
          htmlFor="b-price"
          hint={
            currency && !mixedCurrency
              ? `Bought separately these cost ${formatMoney(separateTotal, currency)}.`
              : "Choose products to see what they cost separately."
          }
        >
          <Input id="b-price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox checked={active} onChange={(e) => setActive(e.target.checked)} />
          Available to guests
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {bundle ? "Save bundle" : "Add bundle"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
