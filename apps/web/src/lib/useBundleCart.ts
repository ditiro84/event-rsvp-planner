import { useState } from "react";
import type { CurrencyCode, ProductBundleRecord } from "@/types";
import { parseHead, sizingProblem } from "@/lib/merchSizing";

// The guest's bundle selections, kept apart from the per-product cart. For
// each bundle in the cart we keep a quantity plus the size or head measurement
// the guest gave for each product inside it (same one-string encoding as
// lib/merchSizing.ts).
type BundleEntry = { quantity: number; entries: Record<string, string> };

export function useBundleCart(bundles: ProductBundleRecord[]) {
  const [cart, setCart] = useState<Record<string, BundleEntry>>({});

  const lines = bundles
    .map((bundle) => ({ bundle, quantity: cart[bundle.id]?.quantity ?? 0, entries: cart[bundle.id]?.entries ?? {} }))
    .filter((line) => line.quantity > 0);

  const total = lines.reduce((sum, l) => sum + l.bundle.price * l.quantity, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const currency: CurrencyCode | null = lines[0]?.bundle.currency ?? null;

  function quantityOf(bundleId: string) {
    return cart[bundleId]?.quantity ?? 0;
  }

  function entriesOf(bundleId: string) {
    return cart[bundleId]?.entries ?? {};
  }

  function setQuantity(bundleId: string, quantity: number) {
    setCart((c) => ({
      ...c,
      [bundleId]: { quantity: Math.max(0, quantity), entries: c[bundleId]?.entries ?? {} },
    }));
  }

  function setEntry(bundleId: string, productId: string, value: string) {
    setCart((c) => ({
      ...c,
      [bundleId]: {
        quantity: c[bundleId]?.quantity ?? 0,
        entries: { ...(c[bundleId]?.entries ?? {}), [productId]: value },
      },
    }));
  }

  function clear() {
    setCart({});
  }

  // First thing the guest still has to fill in for a bundle in their cart.
  const problem: string | null = (() => {
    for (const line of lines) {
      for (const item of line.bundle.items) {
        const issue = sizingProblem(
          { name: `${item.productName} (${line.bundle.name})`, fitType: item.fitType },
          line.entries[item.productId] ?? ""
        );
        if (issue) return issue;
      }
    }
    return null;
  })();

  const payload = lines.map((line) => ({
    bundleId: line.bundle.id,
    quantity: line.quantity,
    selections: line.bundle.items
      .filter((item) => item.fitType !== "NONE")
      .map((item) => {
        const value = line.entries[item.productId] ?? "";
        if (item.fitType === "SIZE_CHART") return { productId: item.productId, selectedSize: value.trim() };
        const head = parseHead(value);
        return head ? { productId: item.productId, headCircumference: head } : { productId: item.productId };
      }),
  }));

  return { lines, total, count, currency, quantityOf, entriesOf, setQuantity, setEntry, clear, problem, payload };
}
