/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand -- violet, per the "Open Ring" brand identity
        // (2026 refresh). Anchor: #9d3fff at 600 (buttons, links, primary
        // actions) -- a more saturated, higher-energy violet than the
        // original #633bfe, chosen deliberately to read as vivid/modern
        // rather than the muted evolution first proposed. Rest of the
        // ramp is interpolated in HSL space to keep a consistent hue.
        brand: {
          50: "#f6eeff",
          100: "#eddcfe",
          200: "#dbb9fd",
          300: "#c187fd",
          400: "#a856fd",
          500: "#a54eff",
          600: "#9d3fff",
          700: "#7500f0",
          800: "#5905b1",
          900: "#42087f",
          950: "#270946",
        },
        // Neutral scale retinted with a faint violet cast to match the
        // mockups' text/border grays (heading #110b29, body #524e6e,
        // muted #908b9f, border #e8e6ed) -- overriding Tailwind's stock
        // "slate" so every existing `text-slate-*`/`border-slate-*` class
        // in the app picks up the new tone automatically.
        slate: {
          50: "#f8f7fa",
          100: "#f1f0f4",
          200: "#e8e6ed",
          300: "#d3d0dc",
          400: "#908b9f",
          500: "#6f6a82",
          600: "#524e6e",
          700: "#3d3a54",
          800: "#221b3d",
          900: "#170f2e",
          950: "#110b29",
        },
        canvas: {
          DEFAULT: "#f8f7fa",
          surface: "#ffffff",
        },
        // Secondary accent -- vivid coral-tangerine, paired with the brand
        // violet so the app has two voices instead of one ("duotone"
        // direction): brand stays primary (nav, primary actions), coral
        // calls out money-moment CTAs (buy ticket, checkout) and
        // category/highlight tags. Anchor: #ff5c3d at 500, pushed brighter
        // than the original muted terracotta as part of the 2026 identity
        // refresh so the UI reads as vivid rather than desaturated.
        coral: {
          50: "#fff0ee",
          100: "#feddd7",
          200: "#fec0b4",
          300: "#ff9480",
          400: "#ff6f54",
          500: "#ff5c3d",
          600: "#f92d06",
          700: "#c0290c",
          800: "#8e220e",
          900: "#601a0d",
        },
        success: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
        },
        info: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
        },
      },
      fontFamily: {
        // DM Sans for body/UI text, Outfit for display/headings -- per the
        // "DESKTOP SCREENS" mockups (login, dashboard, etc.), superseding
        // the earlier Geist/Geist Mono pairing.
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Outfit", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(17 11 41 / 0.04), 0 1px 3px 0 rgb(17 11 41 / 0.03)",
        card: "0 2px 8px -2px rgb(34 17 89 / 0.08), 0 1px 2px -1px rgb(17 11 41 / 0.04)",
        elevated: "0 12px 32px -8px rgb(34 17 89 / 0.16), 0 4px 12px -4px rgb(17 11 41 / 0.06)",
      },
      borderRadius: {
        xl2: "0.75rem",
      },
    },
  },
  plugins: [],
};
