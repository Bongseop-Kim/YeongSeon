import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OverlayScrollbars } from "overlayscrollbars";
import "overlayscrollbars/overlayscrollbars.css";
import "./index.css";
import App from "./App.tsx";
import { analytics } from "@/shared/lib/analytics";

if (import.meta.env.PROD && import.meta.env.VITE_GA_ID) {
  analytics.init(import.meta.env.VITE_GA_ID);
}

// OverlayScrollbars를 body에 적용
OverlayScrollbars(document.body, {
  scrollbars: {
    theme: "os-theme-light",
    autoHide: "move",
    autoHideDelay: 800,
  },
});

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
