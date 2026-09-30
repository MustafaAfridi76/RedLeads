import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

if (localStorage.getItem("redleads-theme") !== "light")
  document.documentElement.classList.add("dark");
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
