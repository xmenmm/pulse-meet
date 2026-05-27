import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f4f1ff",
          100: "#ebe5ff",
          200: "#d9ceff",
          300: "#bda6ff",
          400: "#9d77ff",
          500: "#7c4dff",
          600: "#6a35f5",
          700: "#5a25d8",
          800: "#4a1eb0",
          900: "#3d1c8c",
        },
        ink:    "#0f0f1a",
        muted:  "#6b6b80",
        line:   "#e6e6ef",
        panel:  "#fafaff",
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "Arial", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 24px -8px rgba(124,77,255,0.18)",
        card: "0 10px 40px -12px rgba(15,15,26,0.12)",
      },
      backgroundImage: {
        "brand-grad": "linear-gradient(135deg,#7c4dff 0%,#5a25d8 60%,#3d1c8c 100%)",
        "soft-grad":  "radial-gradient(1200px 600px at 80% -10%, #ebe5ff 0%, transparent 60%), radial-gradient(900px 500px at 0% 100%, #fde7f3 0%, transparent 60%)",
      },
    },
  },
  plugins: [],
};
export default config;
