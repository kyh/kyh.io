import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app";

import "./styles/globals.css";

const root = document.querySelector("#root");
if (!root) {
  throw new Error("Missing #root element");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
