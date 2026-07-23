/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand purple -- refined toward a slightly deeper, less
        // saturated violet so it reads as premium rather than "default
        // Tailwind purple". Used for primary actions, active nav, and the
        // brand mark.
        brand: {
          50: "#f6f4fd",
          100: "#ede8fb",
          200: "#dad0f7",
          300: "#bfaded",
          400: "#a688e6",
          500: "#8b6fd6",
          600: "#6f4fc4",
          700: "#5c3ea8",
          800: "#4b3388",
          900: "#3d2b6e",
          950: "#241a44",
        },
        // Soft lavender accent -- used sparingly for highlight backgrounds,
        // subtle fills, and decorative surfaces (never for body text).
        lavender: {
          50: "#faf9fe",
          100: "#f2effb",
          200: "#e6def7",
          300: "#d4c5f0",
          400: "#bda3e4",
        },
        // Neutral background/surface scale kept distinct from brand so the
        // app doesn't read as "everything is purple". Warmer than pure
        // slate to feel less like a generic admin dashboard.
        canvas: {
          DEFAULT: "#faf9fc",
          surface: "#ffffff",
        },
        // Semantic status colors, named intentionally rather than reused
        // ad-hoc across screens.
        success: {
          50: "#ecfdf5",
          100: "#d1fae5",
          600: "#059669",
          700: "#047857",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          600: "#d97706",
          700: "#b45309",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          600: "#dc2626",
          700: "#b91c1c",
        },
        info: {
          50: "#eff6ff",
          100: "#dbeafe",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.03)",
        card: "0 2px 8px -2px rgb(76 29 149 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)",
        elevated: "0 12px 32px -8px rgb(76 29 149 / 0.14), 0 4px 12px -4px rgb(15 23 42 / 0.06)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
