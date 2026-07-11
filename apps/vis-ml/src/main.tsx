import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app";
import "./styles/globals.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Visual ML could not find its root element.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
