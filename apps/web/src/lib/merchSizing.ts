import type { ProductFitType, PublicShopProduct } from "@/types";

// Guest-side sizing helpers shared by the RSVP-page cart and the standalone
// shop. A cart line keeps one string for whatever the product asks for:
// T-shirts hold the chosen size ("M"), caps hold the head measurement
// encoded as "56 cm" or "22 in". Everything else holds "".

export type LengthUnit = "cm" | "in";

export const HEAD_MIN_CM = 40;
export const HEAD_MAX_CM = 70;

export function encodeHead(value: string, unit: LengthUnit): string {
  return value.trim() === "" ? "" : `${value.trim()} ${unit}`;
}

export function parseHead(encoded: string): { value: number; unit: LengthUnit } | null {
  const match = /^\s*([0-9]+(?:\.[0-9]+)?)\s*(cm|in)\s*$/.exec(encoded);
  if (!match) return null;
  return { value: Number(match[1]), unit: match[2] as LengthUnit };
}

export function headInCm(value: number, unit: LengthUnit): number {
  return Math.round((unit === "in" ? value * 2.54 : value) * 10) / 10;
}

// What to tell the guest when their entry for this cart line isn't usable
// yet, or null when it is.
export function sizingProblem(product: { name: string; fitType: ProductFitType }, entry: string): string | null {
  if (product.fitType === "SIZE_CHART") {
    return entry.trim() ? null : `Choose a size for ${product.name}`;
  }
  if (product.fitType === "HEAD_CIRCUMFERENCE") {
    const head = parseHead(entry);
    if (!head) return `Enter your head circumference for ${product.name}`;
    const cm = headInCm(head.value, head.unit);
    if (cm < HEAD_MIN_CM || cm > HEAD_MAX_CM) {
      return `Head circumference for ${product.name} should be between ${HEAD_MIN_CM} and ${HEAD_MAX_CM} cm (about 16 to 27.5 in)`;
    }
  }
  return null;
}

// First problem across the whole cart, for blocking checkout.
export function firstCartSizingProblem(items: { product: PublicShopProduct; size: string }[]): string | null {
  for (const item of items) {
    const problem = sizingProblem(item.product, item.size);
    if (problem) return problem;
  }
  return null;
}

// The line item the checkout API expects.
export function toCheckoutItem(item: { product: PublicShopProduct; quantity: number; size: string }) {
  const base = { productId: item.product.id, quantity: item.quantity };
  if (item.product.fitType === "SIZE_CHART") return { ...base, selectedSize: item.size.trim() };
  if (item.product.fitType === "HEAD_CIRCUMFERENCE") {
    const head = parseHead(item.size);
    return head ? { ...base, headCircumference: head } : base;
  }
  return base;
}
