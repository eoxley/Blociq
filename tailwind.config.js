/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2BBEB4",     // Aqua Teal
        dark: "#0F5D5D",        // Deep Teal
        soft: "#FAFAFA",        // Soft White
        charcoal: "#333333",    // Charcoal Grey
        flag: {
          urgent: "#dc2626",    // 🔥 Red
          finance: "#0e7490",   // 💰 Teal
          complaint: "#facc15"  // ⚠️ Yellow
        }
      },
      fontFamily: {
        brand: ["Georgia", "serif"] // Closest to IvyPresto
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      },
      boxShadow: {
        soft: "0 4px 12px rgba(0,0,0,0.05)"
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
}
