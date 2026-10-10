import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Red23 brand: terracotta wordmark + sage "23" from the original logo.
        brand: { 50: "#FBF3EF", 100: "#F5E1D7", 200: "#EBC3AF", 300: "#DE9F81", 400: "#CF7F5C", 500: "#C2683F", 600: "#A85433", 700: "#87422A", 800: "#6B3624", 900: "#4F281C" },
        sage: { 50: "#F4F7F3", 100: "#E6EEE5", 200: "#C2D3C0", 300: "#A5BFA2", 400: "#84A580", 500: "#668A62", 600: "#506E4D", 700: "#40583E", 800: "#344733", 900: "#283727" },
        ink: { DEFAULT: "#1E2420", soft: "#4A524D", muted: "#7A827D" },
        cream: "#FAF7F2",
        line: "#E8E3DA",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(30,36,32,.04), 0 4px 16px rgba(30,36,32,.06)",
        lift: "0 8px 30px rgba(30,36,32,.12)",
      },
      keyframes: {
        "slide-in": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: { "slide-in": "slide-in .28s cubic-bezier(.2,.8,.2,1)", "fade-in": "fade-in .2s ease-out" },
    },
  },
  plugins: [],
} satisfies Config;
