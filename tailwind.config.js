/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./popup.tsx",
    "./contents/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
          950: "#3b0764",
        },
        accent: {
          DEFAULT: "#f472b6",
          50: "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#ec4899",
          600: "#db2777",
          700: "#be185d",
          800: "#9d174d",
          900: "#831843",
        },
        background: {
          light: "#f7f5f8",
          dark: "#191022",
        },
        surface: {
          light: "#ffffff",
          dark: "#1e1625",
        },
      },
      fontFamily: {
        display: ["Spline Sans", "system-ui", "sans-serif"],
        body: ["Noto Sans", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-ring":
          "pulse-ring 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
        "bounce-slow": "bounce 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": {
            boxShadow:
              "0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2)",
          },
          "50%": {
            boxShadow:
              "0 0 30px rgba(168, 85, 247, 0.6), 0 0 60px rgba(168, 85, 247, 0.3)",
          },
        },
        "pulse-ring": {
          "0%": {
            transform: "scale(0.95)",
            boxShadow: "0 0 0 0 rgba(168, 85, 247, 0.7)",
          },
          "70%": {
            transform: "scale(1)",
            boxShadow: "0 0 0 20px rgba(168, 85, 247, 0)",
          },
          "100%": {
            transform: "scale(0.95)",
            boxShadow: "0 0 0 0 rgba(168, 85, 247, 0)",
          },
        },
        shimmer: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      boxShadow: {
        "glow-sm": "0 0 10px rgba(168, 85, 247, 0.3)",
        "glow-md": "0 0 20px rgba(168, 85, 247, 0.4)",
        "glow-lg": "0 0 30px rgba(168, 85, 247, 0.5)",
        "glow-xl": "0 0 40px rgba(168, 85, 247, 0.6)",
        panel: "0 8px 30px rgb(0, 0, 0, 0.12)",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "2rem",
        "3xl": "3rem",
      },
    },
  },
  plugins: [],
};
