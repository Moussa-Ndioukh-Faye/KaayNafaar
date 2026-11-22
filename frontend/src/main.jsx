import React from "react";
import ReactDOM from "react-dom/client";
// Polices auto-hébergées (pas d'appel à Google Fonts : performance + vie privée)
// SF Pro sur les appareils Apple ; Hanken Grotesk ailleurs (Android, Windows, Linux)
import "@fontsource-variable/hanken-grotesk";
import "./index.css";
import App from "./App";
import { demarrerPWA } from "./pwa";

// Application installable : service worker + invitation d'installation
demarrerPWA();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
