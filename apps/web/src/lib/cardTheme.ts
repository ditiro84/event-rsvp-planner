// Client-side colour extraction from an event's invitation card image, used
// to theme the public RSVP page (hero banner, title, buttons, badges) and
// give it a soft blurred version of the card as an ambient background. Runs
// entirely in the browser and is never persisted -- it's cheap (a
// downscaled canvas read), so it's just recomputed on each page load.
//
// Deliberately defensive throughout: any failure (network, CORS, a decode
// error, a plain white/cream card with nothing colourful on it) resolves to
// `null` rather than throwing, so callers always have a safe fallback back
// to the app's default brand/coral look -- see the CardThemeContext usage
// in PublicRsvpPage.tsx.

export interface CardTheme {
  // Two accent colours pulled from the card, already darkened as needed for
  // readable contrast against white text/icons.
  primary: string;
  secondary: string;
  // Object URL for the card image itself, so it can also be used as a
  // blurred ambient background layer. Caller owns it and should revoke it
  // (URL.revokeObjectURL) when no longer needed.
  imageUrl: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// Darkens a colour just enough to read reliably as white text/icon-on-fill
// (roughly WCAG AA for large text), while keeping its hue and most of its
// character -- a straight lightness clamp in HSL space rather than a flat
// alpha-darken, so a pale pastel from the card still reads as "that colour,
// but usable" instead of turning muddy grey.
function darkenForContrast(hex: string, maxLightness = 0.44): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const [h, s, l] = rgbToHsl(r, g, b);
  if (l <= maxLightness) return hex;
  const [nr, ng, nb] = hslToRgb(h, Math.max(s, 0.35), maxLightness);
  return rgbToHex(nr, ng, nb);
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

// Rotates a hex colour's hue by the given degrees -- used to invent a
// second accent when the card is essentially monochrome (e.g. a single
// colour design with white/cream space), so the app's usual two-colour
// duotone feel still comes through.
function rotateHue(hex: string, degrees: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb((h + degrees + 360) % 360, s, l);
  return rgbToHex(nr, ng, nb);
}

const BUCKET_STEP = 32;

export async function extractCardTheme(imageUrl: string): Promise<CardTheme | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    const objectUrl = URL.createObjectURL(blob);

    const img = new Image();
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = objectUrl;
    });
    if (!loaded) {
      URL.revokeObjectURL(objectUrl);
      return null;
    }

    // Downscale hard -- this only needs to find dominant colours, not
    // preserve detail, and a tiny canvas keeps the pixel scan effectively
    // instant regardless of the original card's resolution.
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      return null;
    }
    ctx.drawImage(img, 0, 0, size, size);

    let data: Uint8ClampedArray;
    try {
      data = ctx.getImageData(0, 0, size, size).data;
    } catch {
      // Tainted canvas (CORS) or any other read failure -- fall back
      // gracefully rather than propagating a security error.
      URL.revokeObjectURL(objectUrl);
      return null;
    }

    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 200) continue; // skip transparent pixels
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      // Skip near-white, near-black, and low-saturation greys -- these are
      // almost always page background or body text, not the design's
      // actual accent colours.
      if (min > 225) continue;
      if (max < 30) continue;
      if (max - min < 24) continue;

      const key = `${Math.round(r / BUCKET_STEP)}-${Math.round(g / BUCKET_STEP)}-${Math.round(b / BUCKET_STEP)}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        buckets.set(key, { count: 1, r, g, b });
      }
    }

    const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
    if (sorted.length === 0) {
      // Nothing colourful found (e.g. a plain white card with black text
      // only) -- let the caller fall back to the default theme.
      URL.revokeObjectURL(objectUrl);
      return null;
    }

    const primaryRgb: [number, number, number] = [sorted[0].r, sorted[0].g, sorted[0].b];
    const primaryHex = darkenForContrast(rgbToHex(...primaryRgb));

    const distinct = sorted.find((c) => colorDistance([c.r, c.g, c.b], primaryRgb) > 70);
    const secondaryHex = darkenForContrast(distinct ? rgbToHex(distinct.r, distinct.g, distinct.b) : rotateHue(primaryHex, 40));

    return { primary: primaryHex, secondary: secondaryHex, imageUrl: objectUrl };
  } catch {
    return null;
  }
}
