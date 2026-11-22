import React from "react";
import ReactDOM from "react-dom/client";
// Polices auto-hébergées (pas d'appel à Google Fonts : performance + vie privée)
// Fraunces (titres, avec ses axes optiques) + Hanken Grotesk (texte)
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
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
