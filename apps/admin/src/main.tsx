import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@seed-design/css/base.css";
import "./admin-fonts.css";
import "./admin-responsive.css";
import "./admin-settings-form.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
