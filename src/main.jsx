import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// After a new deploy, a page opened earlier asks for script files that no longer exist.
// Reload once to get the new ones (not again within a minute, so a real outage can't loop).
window.addEventListener("vite:preloadError", (event) => {
  const key = "tss-reloaded-for-new-version";
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(key)) || 0;
    if (Date.now() - last < 60000) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    return; // no storage: don't risk a reload loop
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
