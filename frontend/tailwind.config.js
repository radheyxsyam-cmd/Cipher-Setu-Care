/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f172a", // slate-900
        surface: {
          50: "#1e293b",  // slate-800
          100: "#334155", // slate-700
          200: "#475569", // slate-600
          300: "#64748b", // slate-500
        },
        border: "#334155",
        brand: {
          nha: "#1e3a8a",    // blue-900
          orange: "#f97316", // orange-500
          slate: "#475569",  // slate-600
          emerald: "#059669",// emerald-600
          violet: "#6366f1", // indigo-500
        },
        medical: {
          dark: "#0f172a",
          card: "rgba(30, 41, 59, 0.8)",
          primary: "#1e3a8a",
          highlight: "#3b82f6",
          alert: "#dc2626",   // red-600
          warning: "#d97706", // amber-600
          success: "#059669", // emerald-600
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      }
    },
  },
  plugins: [],
};
