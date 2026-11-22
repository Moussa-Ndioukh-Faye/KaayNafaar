import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// Application installable (PWA) : manifeste + service worker généré par Workbox.
// Règle de confidentialité : AUCUNE réponse de l'API n'est mise en cache
// (données personnelles, sessions) ; seule la coquille de l'application l'est.
const pwa = VitePWA({
  registerType: "autoUpdate",
  injectRegister: false, // enregistrement fait dans src/pwa.js
  includeAssets: ["favicon-kn.png", "apple-touch-icon.png", "robots.txt"],
  manifest: {
    id: "/",
    name: "Kaay Nafaar — Révise malin",
    short_name: "Kaay Nafaar",
    description: "Ton cahier de révision : fiches, quiz et flashcards à partir de tes cours.",
    lang: "fr",
    dir: "ltr",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "any",
    background_color: "#f6f1e6",
    theme_color: "#0a1f4a",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mes fiches", short_name: "Fiches", url: "/fiches", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Lancer un quiz", short_name: "Quiz", url: "/quiz", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Assistant IA", short_name: "Assistant", url: "/assistant", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,woff2,png,svg,ico,webp}"],
    // Polices : seul le jeu « latin » est préchargé (le reste se charge à la demande)
    globIgnores: ["**/google*.html", "**/og-image*", "**/*-latin-ext-*.woff2", "**/*-vietnamese-*.woff2", "**/*-cyrillic*.woff2", "**/*-greek*.woff2", "**/html2canvas*", "**/purify*", "**/index.es-*", "**/jspdf*", "**/pdfPro*", "**/KaTeX_*"],
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [/^\/api\//],
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
    runtimeCaching: [
      // L'API passe toujours par le réseau, jamais par le cache
      { urlPattern: ({ url }) => url.pathname.startsWith("/api/"), handler: "NetworkOnly" },
    ],
  },
  devOptions: { enabled: false },
});

export default defineConfig({
  plugins: [react(), pwa],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Tests de l'interface (Vitest + Testing Library)
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    css: false,
    include: ["src/**/*.test.{js,jsx}"],
  },
  server: {
    port: 3000,
    host: process.env.VITE_HOST || "localhost",
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY || "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
});
