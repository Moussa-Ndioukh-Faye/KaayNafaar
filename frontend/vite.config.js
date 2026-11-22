import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
