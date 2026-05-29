import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dojo: {
          black: "#0a0a0a",
          surface: "#111111",
          elevated: "#1a1a1a",
          border: "#2a2a2a",
          muted: "#9ca3af",
          white: "#f5f5f5",
          red: "#c41e3a",
          "red-hover": "#d42a4a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
