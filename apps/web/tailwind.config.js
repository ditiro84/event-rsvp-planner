/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand -- violet, matching the approved Figma "DESKTOP
        // SCREENS" mockups (the literal, page-level designs), which take
        // precedence over the earlier abstract design-system reference
        // sheet. Anchors: #7c5cff (accents/glow) and #633bfe (buttons,
        // links, primary actions) -- the rest of the ramp is interpolated
        // to keep a consistent hue.
        brand: {
          50: "#f4f1ff",
          100: "#ebe5ff",
          200: "#d9ceff",
          300: "#bfabff",
          400: "#9d7fff",
          500: "#7c5cff",
          600: "#633bfe",
          700: "#5028e0",
          800: "#4320b8",
          900: "#371d93",
          950: "#221159",
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
