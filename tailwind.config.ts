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
        bg: "#080808",
        surface: "#111111",
        "surface-elevated": "#1A1A1A",
        border: "#252525",
        "text-primary": "#F0F0F0",
        "text-secondary": "#555555",
        accent: "#E8832A",
        "accent-hover": "#F09440",
        "accent-muted": "rgba(232,131,42,0.12)",
        destructive: "#C0392B",
        success: "#7BAF6E",
      },
      fontFamily: {
        display: ["var(--font-bebas)", "Impact", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: ["11px", { lineHeight: "1.5" }],
        sm: ["13px", { lineHeight: "1.5" }],
        base: ["15px", { lineHeight: "1.6" }],
        lg: ["17px", { lineHeight: "1.5" }],
        xl: ["20px", { lineHeight: "1.4" }],
        "2xl": ["26px", { lineHeight: "1.2" }],
        "3xl": ["34px", { lineHeight: "1.1" }],
      },
      borderRadius: {
        card: "2px",
        btn: "1px",
        input: "2px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.6)",
        "card-hover": "0 4px 20px rgba(0,0,0,0.7)",
      },
      letterSpacing: {
        widest: "0.2em",
      },
    },
  },
  plugins: [],
};
export default config;
