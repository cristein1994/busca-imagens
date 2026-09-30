import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b1220",
          900: "#121a2b",
          800: "#1c2740",
          700: "#2a3a55",
          600: "#3d516f",
        },
        mist: {
          50: "#f3f7fb",
          100: "#e7eef7",
          200: "#d0deee",
          300: "#a9c0db",
        },
        tide: {
          400: "#2f9e9a",
          500: "#1f7f7c",
          600: "#176663",
        },
        ember: {
          400: "#e8a24a",
          500: "#d4892f",
          600: "#b36f1f",
        },
      },
      fontFamily: {
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        body: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px rgba(18, 26, 43, 0.12)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(12px,-10px,0) scale(1.04)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        rise: "rise 0.7s ease-out both",
        drift: "drift 14s ease-in-out infinite",
        "pulse-soft": "pulseSoft 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
