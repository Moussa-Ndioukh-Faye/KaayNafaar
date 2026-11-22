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
          DEFAULT: "#0a1f4a", // marine du logo, réservé à la marque
          clair: "#13306e",
        },
        // Anciens noms « cahier » remappés sur l'identité Teranga (Apple + drapeau)
        papier: { DEFAULT: "#f2f2f7", fonce: "#e5e5ea" },
        encre: { DEFAULT: "#1c1c1e", douce: "#3a3a3c" },
        surligneur: { DEFAULT: "#fdef42", pale: "#fff9c4" },
        marge: { DEFAULT: "#cf1820", pale: "#fde3e4" }, // rouge du drapeau, 5,2:1 sur blanc
        // Couleurs du drapeau sénégalais
        senegal: { vert: "#00853f", jaune: "#fdef42", rouge: "#e31b23" },
        succes: "hsl(var(--succes) / <alpha-value>)",
        etoile: "hsl(var(--etoile) / <alpha-value>)",
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
        // Gris neutres du système Apple
        slate: {
          50:  "#f9f9fb",
          100: "#f2f2f7",
          200: "#e5e5ea",
          300: "#d1d1d6",
          400: "#aeaeb2",
          500: "#636366",
          600: "#48484a",
          700: "#3a3a3c",
          800: "#2c2c2e",
          900: "#1c1c1e",
          950: "#0d0d0f",
        },
        gray: {
          50:  "#f9f9fb",
          100: "#f2f2f7",
          200: "#e5e5ea",
          300: "#d1d1d6",
          400: "#aeaeb2",
          500: "#636366",
          600: "#48484a",
          700: "#3a3a3c",
          800: "#2c2c2e",
          900: "#1c1c1e",
          950: "#0d0d0f",
        }
      },
      fontFamily: {
        // Police système d'Apple (SF Pro) ; Hanken Grotesk ailleurs pour un rendu cohérent
        sans: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', '"Hanken Grotesk Variable"', "system-ui", '"Segoe UI"', "Roboto", "sans-serif"],
        display: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Display"', '"Hanken Grotesk Variable"', "system-ui", '"Segoe UI"', "Roboto", "sans-serif"],
      },
      // Coins arrondis continus, échelle Apple
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "var(--radius)",
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
      },
      // Ombres diffuses et légères (élévation iOS)
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 0 0 0.5px rgb(0 0 0 / 0.04)",
        DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 0 0 0.5px rgb(0 0 0 / 0.04)",
        md: "0 4px 12px -2px rgb(0 0 0 / 0.08), 0 0 0 0.5px rgb(0 0 0 / 0.04)",
        lg: "0 10px 28px -6px rgb(0 0 0 / 0.12), 0 0 0 0.5px rgb(0 0 0 / 0.05)",
        xl: "0 18px 40px -10px rgb(0 0 0 / 0.16)",
        "2xl": "0 28px 60px -16px rgb(0 0 0 / 0.22)",
        papier: "0 10px 28px -6px rgb(0 0 0 / 0.12)",
        inner: "inset 0 1px 2px 0 rgb(0 0 0 / 0.05)",
        none: "none",
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
