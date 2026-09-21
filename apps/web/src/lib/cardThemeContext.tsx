import { createContext, useContext, type CSSProperties } from "react";
import type { CardTheme } from "@/lib/cardTheme";

// Shared across the public RSVP page and the ShopSection embedded in it, so
// a colour pulled from the event's invitation card can theme both without
// threading props down through every component. `null` = no theme (either
// no image card, extraction failed, or the card had nothing colourful to
// pull) -- every consumer below is written to fall back to the app's normal
// brand/coral look in that case, never to break or render unstyled.
export const CardThemeContext = createContext<CardTheme | null>(null);

export function useCardTheme(): CardTheme | null {
  return useContext(CardThemeContext);
}

// Adds an alpha suffix to a "#rrggbb" hex colour, e.g. for a soft tinted
// badge background behind a solid icon of the same colour. Exported too --
// PublicRsvpPage.tsx uses it directly to build the page's ambient
// background gradient (see the fixed bg-canvas-replacement layer there).
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

export type ThemeColorKey = "primary" | "secondary" | "tertiary" | "quaternary";

// Small set of reusable inline-style helpers built from a card theme (or
// undefined-everywhere when there isn't one) -- so every themed element
// across PublicRsvpPage.tsx and ShopSection.tsx pulls from the same
// four-colour palette instead of each computing its own gradient, and
// instead of the whole page repeating just two colours everywhere. Pure
// function (not a hook) so PublicRsvpPage -- which holds the theme as local
// state, not context, since it's the one computing it -- can call it
// directly, while ShopSection (a child that only has the context) uses the
// useCardThemeStyles hook version below.
export function buildCardThemeStyles(theme: CardTheme | null) {
  return {
    theme,
    // Gradient banner / hero fill -- three stops instead of two so it reads
    // as an actual palette rather than a flat two-tone duotone. Used when
    // there's no theme too, via the caller's own Tailwind gradient classes
    // (this only returns a style object when there IS a theme, so callers
    // do `theme ? style : undefined` alongside their default className).
    heroGradient: theme
      ? ({
          backgroundImage: `linear-gradient(to bottom right, ${theme.primary}, ${theme.tertiary}, ${theme.secondary})`,
        } as CSSProperties)
      : undefined,
    titleGradient: theme
      ? ({
          backgroundImage: `linear-gradient(to right, ${theme.primary}, ${theme.tertiary}, ${theme.secondary})`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        } as CSSProperties)
      : undefined,
    // Solid CTA fill in one of the theme colours (primary by default), with
    // a brightness-dip hover handled via the `hover:brightness-90
    // transition` className (kept as a className, not inline, since :hover
    // isn't expressible in a plain style object).
    primaryFill: theme ? ({ backgroundColor: theme.primary } as CSSProperties) : undefined,
    fill: (color: ThemeColorKey): CSSProperties | undefined => (theme ? { backgroundColor: theme[color] } : undefined),
    // A light tint of one of the four colours plus matching icon/text
    // colour -- for small badges (date/venue icons, "in cart" pill) that
    // shouldn't be a full solid fill.
    tint: (color: ThemeColorKey): CSSProperties | undefined =>
      theme ? { backgroundColor: withAlpha(theme[color], 0.16), color: theme[color] } : undefined,
    // Border + text in one of the four colours, active/selected state for
    // toggle-style buttons (delivery method, etc).
    outline: (color: ThemeColorKey): CSSProperties | undefined =>
      theme ? { borderColor: theme[color], color: theme[color], backgroundColor: withAlpha(theme[color], 0.08) } : undefined,
    // A translucent, blurred near-white backing panel -- NOT a colour
    // helper, a *legibility* one. Any text sitting directly on the page's
    // vivid ambient background (see PublicRsvpPage.tsx's fixed background
    // layer) needs a guaranteed-readable surface under it regardless of how
    // saturated or dark the extracted palette is; this gives every such
    // block the same frosted-glass card look the RSVP form already has
    // (bg-white/95 backdrop-blur-sm) rather than leaving text to fend for
    // itself against whatever colour the card happened to produce.
    surface: (theme ? { backgroundColor: "rgba(255,255,255,0.9)" } : undefined) as CSSProperties | undefined,
  };
}

export function useCardThemeStyles() {
  return buildCardThemeStyles(useCardTheme());
}
