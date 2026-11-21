import React from "react";
import ReactDOM from "react-dom/client";
// Polices auto-hébergées (pas d'appel à Google Fonts : performance + vie privée)
import "@fontsource-variable/fraunces";
import "@fontsource-variable/hanken-grotesk";
import "./index.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
