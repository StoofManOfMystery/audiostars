import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#1A1612",
        surface: "#252019",
        "surface-elevated": "#2E2820",
        border: "#3D3530",
        "text-primary": "#F0EAE2",
        "text-secondary": "#A89B8C",
        accent: "#E8832A",
        "accent-hover": "#F09440",
        "accent-muted": "rgba(232,131,42,0.13)",
        destructive: "#C0392B",
        success: "#7BAF6E",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: ["11px", { lineHeight: "1.5" }],
        sm: ["13px", { lineHeight: "1.5" }],
        base: ["15px", { lineHeight: "1.6" }],
        lg: ["17px", { lineHeight: "1.5" }],
        xl: ["20px", { lineHeight: "1.4" }],
        "2xl": ["26px", { lineHeight: "1.3" }],
        "3xl": ["34px", { lineHeight: "1.2" }],
      },
      borderRadius: {
        card: "8px",
        btn: "6px",
        input: "4px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.4)",
        "card-hover": "0 4px 20px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
