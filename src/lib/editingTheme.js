// Which of the store's themes the customizer and code editor are working on.
// Nothing chosen = the published theme. A draft is chosen on the Online store page ("Customize" / "Code editor")
// and sent with every theme request as X-Theme-Id (see lib/api.js). It lives in this tab only.
import { getSession } from "@/lib/auth";

const KEY = "tss-editing-theme";

function storeId() {
  try {
    return getSession()?.storeId || localStorage.getItem("tss-store-id") || "";
  } catch {
    return "";
  }
}

export function getEditingThemeId() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
    return saved && saved.storeId === storeId() ? saved.themeId : "";
  } catch {
    return "";
  }
}

export function setEditingThemeId(themeId) {
  try {
    if (themeId) sessionStorage.setItem(KEY, JSON.stringify({ storeId: storeId(), themeId }));
    else sessionStorage.removeItem(KEY);
  } catch {}
}
