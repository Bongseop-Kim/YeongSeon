import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OverlayScrollbars } from "overlayscrollbars";
import "overlayscrollbars/overlayscrollbars.css";
import "./index.css";
import App from "./App.tsx";

// OverlayScrollbars를 body에 적용
OverlayScrollbars(document.body, {
  scrollbars: {
    theme: "os-theme-light",
    autoHide: "move",
    autoHideDelay: 800,
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
