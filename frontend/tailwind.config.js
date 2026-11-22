/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Palette issue du logo KN : bleu roi + bleu marine, accent jaune « crayon »
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50:  "#eef3ff",
          100: "#dce6ff",
          200: "#b9ccff",
          300: "#8aabff",
          400: "#5482ff",
          500: "#1f5bf5",
          600: "#0047db",
          700: "#0038b0",
          800: "#062e86",
          900: "#0a1f4a",
        },
        marine: {
          DEFAULT: "#0a1f4a",
          clair: "#13306e",
        },
        // Identité « Le Cahier » : papier, encre, stylo bleu, surligneur, marge rouge Seyès
        white: "#fffdf8",
        papier: { DEFAULT: "#f6f1e6", fonce: "#ece4d2" },
        encre: { DEFAULT: "#0a1f4a", douce: "#2b3756" },
        surligneur: { DEFAULT: "#ffd84d", pale: "#fff1b0" },
        marge: { DEFAULT: "#b02f26", pale: "#f6d9d5" }, // 5,2:1 sur le papier
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          50:  "#fff8e6",
          100: "#ffedbf",
          200: "#ffdd85",
          300: "#ffc94a",
          400: "#f8b41c",
          500: "#e09a00",
          600: "#b87a00",
          700: "#8f5c00",
          800: "#6b4500",
          900: "#4a3000",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Gris légèrement bleutés, accordés au marine du logo
        slate: {
          50:  "#f8f4ea",
          100: "#f0eadb",
          200: "#e3dac4",
          300: "#cdc1a5",
          400: "#958b76",
          500: "#625b4c",
          600: "#4a4539",
          700: "#353a48",
          800: "#1c2336",
          900: "#121a2c",
          950: "#0b1120",
        },
        gray: {
          50:  "#f8f4ea",
          100: "#f0eadb",
          200: "#e3dac4",
          300: "#cdc1a5",
          400: "#958b76",
          500: "#625b4c",
          600: "#4a4539",
          700: "#353a48",
          800: "#1c2336",
          900: "#121a2c",
          950: "#0b1120",
        }
      },
      fontFamily: {
        sans: ['"Hanken Grotesk Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Fraunces Variable"', "Georgia", "ui-serif", "serif"],
      },
      // Coins nets de papier : fini les grands arrondis « bulle »
      borderRadius: {
        sm: "3px",
        md: "5px",
        lg: "var(--radius)",
        xl: "8px",
        "2xl": "10px",
        "3xl": "12px",
      },
      // Ombres « feuille posée » : décalées et nettes, sans flou de halo
      boxShadow: {
        sm: "0 1px 0 0 rgb(10 31 74 / 0.08)",
        DEFAULT: "0 1px 0 0 rgb(10 31 74 / 0.08), 0 1px 3px 0 rgb(10 31 74 / 0.06)",
        md: "2px 2px 0 0 rgb(10 31 74 / 0.10)",
        lg: "3px 3px 0 0 rgb(10 31 74 / 0.12)",
        xl: "4px 4px 0 0 rgb(10 31 74 / 0.14)",
        "2xl": "6px 6px 0 0 rgb(10 31 74 / 0.16)",
        papier: "3px 3px 0 0 #0a1f4a",
        inner: "inset 0 1px 2px 0 rgb(10 31 74 / 0.06)",
        none: "none",
      },
      // Fraunces et Hanken restent élégants : pas de « black » massif
      fontWeight: {
        extrabold: "700",
        black: "750",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shake: {
          "10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
          "20%, 80%": { transform: "translate3d(2px, 0, 0)" },
          "30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
          "40%, 60%": { transform: "translate3d(4px, 0, 0)" },
        },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shake: "shake 0.5s cubic-bezier(.36,.07,.19,.97) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
