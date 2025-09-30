/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Dynamic brand color
        'brand-primary': 'var(--brand-primary)',
        
        // BlocIQ Design System Colors
        'brand-teal': '#0d9488',
        'brand-blue': '#2563eb',
        'brand-purple': '#7c3aed',
        'brand-pink': '#ec4899',
        
        // UI System Colors
        'primary-bg': '#ffffff',
        'secondary-bg': '#f8fafc',
        'tertiary-bg': '#f1f5f9',
        'text-primary': '#1e293b',
        'text-secondary': '#64748b',
        'text-muted': '#94a3b8',
        
        // Legacy Support (keeping for backward compatibility)
        primary: "#0d9488",
        secondary: "#f8fafc",
        background: "#ffffff",
        foreground: "#1e293b",
        
        // Status Colors
        error: "#ef4444",
        warning: "#f59e0b",
        success: "#10b981",
        info: "#6366f1",
        
        // Extended Brand Palette
        teal: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a"
        },
        
        blue: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a"
        },
        
        purple: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7c3aed",
          800: "#6b21a8",
          900: "#581c87"
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        brand: ['Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        DEFAULT: "12px", // Increased default border radius
        lg: "16px", // Increased from 12px
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
