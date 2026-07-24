/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand -- a saturated indigo/violet matching the approved
        // Figma design system (design-system-components sheet: buttons,
        // focus rings, tabs, and progress fills all use #4f46e5 as the
        // living brand-600). This is Tailwind's stock "indigo" scale.
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        // Neutral background/surface scale. Retinted to a cool slate-50
        // (matching the Figma design system's neutral ramp) instead of the
        // previous warm lavender-tinted canvas, so it sits cleanly next to
        // the more vivid indigo brand color.
        canvas: {
          DEFAULT: "#f8fafc",
          surface: "#ffffff",
        },
        // Semantic status colors -- mapped to Tailwind's stock
        // emerald/amber/red/blue scales to match the Figma design system's
        // "Semantic & Status Colours" section and component states matrix
        // (badges/toasts use the 50/500/800 steps; buttons and other UI use
        // 600/700 as before).
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
        // Geist + Geist Mono, per the approved Figma design system typography
        // scale. "display" previously pointed at a serif (Fraunces) -- the
        // new system uses a single sans-serif family throughout, so it now
        // points at the same Geist Sans family, just kept as a distinct
        // token in case a display treatment is reintroduced later.
        sans: ["Geist Sans", "system-ui", "sans-serif"],
        display: ["Geist Sans", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.03)",
        card: "0 2px 8px -2px rgb(49 46 129 / 0.08), 0 1px 2px -1px rgb(15 23 42 / 0.04)",
        elevated: "0 12px 32px -8px rgb(49 46 129 / 0.16), 0 4px 12px -4px rgb(15 23 42 / 0.06)",
      },
      borderRadius: {
        // 12px -- matches the Figma design system's card radius (was 20px).
        xl2: "0.75rem",
      },
    },
  },
  plugins: [],
};
