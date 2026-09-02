import type { Config } from "tailwindcss";

/**
 * Design tokens live as CSS variables in styles/globals.css so the
 * "paper" (light) and "midnight" (dark) themes can swap without
 * duplicating utilities. Tailwind colors reference those variables.
 */
const rgb = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: rgb("paper"),
          2: rgb("paper-2"),
          3: rgb("paper-3"),
        },
        ink: {
          DEFAULT: rgb("ink"),
          2: rgb("ink-2"),
          3: rgb("ink-3"),
        },
        rule: {
          DEFAULT: rgb("rule"),
          2: rgb("rule-2"),
        },
        green: {
          DEFAULT: rgb("green"),
          2: rgb("green-2"),
          soft: rgb("green-soft"),
        },
        gold: {
          DEFAULT: rgb("gold"),
          soft: rgb("gold-soft"),
        },
        rose: {
          DEFAULT: rgb("rose"),
          soft: rgb("rose-soft"),
        },
        page: {
          DEFAULT: rgb("page"),
          ink: rgb("page-ink"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-mincho)", "var(--font-sans)"],
        numeral: ["var(--font-fraunces)", "var(--font-mincho)", "serif"],
      },
      boxShadow: {
        paper: "0 1px 2px rgb(var(--shadow) / 0.06), 0 8px 24px -12px rgb(var(--shadow) / 0.18)",
        "paper-lg": "0 2px 4px rgb(var(--shadow) / 0.06), 0 24px 60px -24px rgb(var(--shadow) / 0.35)",
        lift: "0 1px 0 rgb(var(--shadow) / 0.08), 0 12px 32px -16px rgb(var(--shadow) / 0.3)",
        inset: "inset 0 1px 0 rgb(255 255 255 / 0.5)",
      },
      borderRadius: {
        card: "1.25rem",
      },
      maxWidth: {
        shell: "80rem",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "sheet-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "pop": {
          "0%": { transform: "scale(1)" },
          "35%": { transform: "scale(1.18)" },
          "100%": { transform: "scale(1)" },
        },
        "flag-wave": {
          "0%, 100%": { transform: "skewX(0deg)" },
          "50%": { transform: "skewX(-6deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.25s ease-out both",
        "scale-in": "scale-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        "sheet-up": "sheet-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        pop: "pop 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
        "flag-wave": "flag-wave 2.4s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
