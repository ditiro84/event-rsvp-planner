// Sizing rules for merchandise. Only some products need a measurement:
// T-shirts pick from a size chart, caps give a head circumference, and
// everything else (aso ebi fabric, gele, favours) asks nothing, because guests
// handle any tailoring themselves.

export type ProductFitType = "NONE" | "SIZE_CHART" | "HEAD_CIRCUMFERENCE";
export type LengthUnit = "cm" | "in";

export const DEFAULT_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

// Plausible adult/child head circumference range, in centimetres.
export const HEAD_CIRCUMFERENCE_MIN_CM = 40;
export const HEAD_CIRCUMFERENCE_MAX_CM = 70;

const CM_PER_INCH = 2.54;

// The planner's size list for a product, or the default list when they
// haven't customised it.
export function resolveSizeOptions(sizeOptions: unknown): string[] {
  if (Array.isArray(sizeOptions)) {
    const cleaned = sizeOptions
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (cleaned.length > 0) return cleaned;
  }
  return DEFAULT_SIZE_OPTIONS;
}

export function toCentimetres(value: number, unit: LengthUnit): number {
  const cm = unit === "in" ? value * CM_PER_INCH : value;
  return Math.round(cm * 10) / 10;
}

export interface HeadCircumferenceMeasurement {
  value: number;
  unit: LengthUnit;
  cm: number;
}

export interface ItemSizing {
  selectedSize: string | null;
  measurements: { headCircumference: HeadCircumferenceMeasurement } | null;
}

export interface SizingInput {
  selectedSize?: string | null;
  headCircumference?: { value: number; unit: LengthUnit } | null;
}

// Validates what a guest entered for one cart line against the product's fit
// type and returns what to store. Throws an Error with a guest-friendly
// message (callers wrap it in a 400).
export function resolveItemSizing(
  product: { name: string; fitType?: string | null; sizeOptions?: unknown },
  input: SizingInput
): ItemSizing {
  const fitType = (product.fitType ?? "NONE") as ProductFitType;

  if (fitType === "SIZE_CHART") {
    const options = resolveSizeOptions(product.sizeOptions);
    const chosen = input.selectedSize?.trim();
    if (!chosen) throw new Error(`Choose a size for "${product.name}"`);
    const match = options.find((o) => o.toLowerCase() === chosen.toLowerCase());
    if (!match) throw new Error(`"${chosen}" isn't an available size for "${product.name}"`);
    return { selectedSize: match, measurements: null };
  }

  if (fitType === "HEAD_CIRCUMFERENCE") {
    const head = input.headCircumference;
    if (!head || !Number.isFinite(head.value)) {
      throw new Error(`Enter your head circumference for "${product.name}"`);
    }
    const cm = toCentimetres(head.value, head.unit);
    if (cm < HEAD_CIRCUMFERENCE_MIN_CM || cm > HEAD_CIRCUMFERENCE_MAX_CM) {
      throw new Error(
        `Head circumference for "${product.name}" should be between ${HEAD_CIRCUMFERENCE_MIN_CM} and ${HEAD_CIRCUMFERENCE_MAX_CM} cm (about 16 to 27.5 in)`
      );
    }
    return {
      selectedSize: null,
      measurements: { headCircumference: { value: head.value, unit: head.unit, cm } },
    };
  }

  return { selectedSize: null, measurements: null };
}

// One short line for planner screens and exports, e.g. "Size M" or
// "Head 22 in (55.9 cm)".
export function describeItemSizing(item: { selectedSize?: string | null; measurements?: unknown }): string {
  const head = (item.measurements as { headCircumference?: HeadCircumferenceMeasurement } | null | undefined)
    ?.headCircumference;
  if (head) return `Head ${head.value} ${head.unit} (${head.cm} cm)`;
  if (item.selectedSize) return `Size ${item.selectedSize}`;
  return "";
}
