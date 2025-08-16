/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        primary: "#2BBEB4",     // Aqua Teal
        secondary: "#0F5D5D",   // Deep Teal
        background: "#FAFAFA",  // Background
        text: "#333333",        // Text base
        
        // Support Colors
        error: "#EF4444",       // Red (error/critical)
        warning: "#FBBF24",     // Amber (warning)
        success: "#10B981",     // Green (success)
        info: "#6366F1",        // Indigo (info)
        neutral: "#64748B",     // Slate (neutral UI)
        dark: "#1F2937",        // Dark text
        grey: "#F3F4F6",        // Grey panel
        
        // Legacy flag colors (keeping for backward compatibility)
        flag: {
          urgent: "#EF4444",    // 🔥 Red (updated)
          finance: "#0e7490",   // 💰 Teal
          complaint: "#FBBF24"  // ⚠️ Yellow (updated)
        },
        
        // Extended palette for richer UI
        teal: {
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#2BBEB4", // Primary
          600: "#0D9488",
          700: "#0F5D5D", // Secondary
          800: "#115E59",
          900: "#134E4A"
        },
        
        slate: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B", // Neutral
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A"
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
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.5s ease-in-out 2', // quick nudge, 2 cycles
        'bounce-slow': 'bounce-slow 2s infinite',
      },
    }
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwind-scrollbar")
  ]
}
