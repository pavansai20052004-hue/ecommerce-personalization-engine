import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        surface: {
          50: "#f8f9fb",
          100: "#f0f1f5",
          200: "#e2e4ea",
          800: "#1e2030",
          900: "#13141f",
          950: "#0b0c14",
        },
        accent: {
          DEFAULT: "#6366f1",
          light: "#818cf8",
          dark: "#4f46e5",
        },
        state: {
          browser: "#94a3b8",
          comparer: "#f59e0b",
          discount: "#ec4899",
          abandoner: "#ef4444",
          loyal: "#10b981",
        },
      },
    },
  },
  plugins: [],
};
export default config;
