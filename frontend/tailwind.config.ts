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
          // Channel tokens so academy layouts can remap the palette via CSS variables.
          black: "rgb(var(--color-dojo-black) / <alpha-value>)",
          surface: "rgb(var(--color-dojo-surface) / <alpha-value>)",
          elevated: "rgb(var(--color-dojo-elevated) / <alpha-value>)",
          border: "rgb(var(--color-dojo-border) / <alpha-value>)",
          muted: "rgb(var(--color-dojo-muted) / <alpha-value>)",
          white: "rgb(var(--color-dojo-white) / <alpha-value>)",
          red: "rgb(var(--color-dojo-red) / <alpha-value>)",
          "red-hover": "rgb(var(--color-dojo-red-hover) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
