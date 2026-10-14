import { API_URL, apiRequest, apiUpload } from "@/lib/api";
import { getSession } from "@/lib/auth";

// Every call is for the signed-in user's current store (Authorization + X-Store-Id).
const BASE = "/api/v1/themes";

// -> { store, storefrontUrl, files: [{ path, content }] }
export function listThemeFiles() {
  return apiRequest(`${BASE}/files/`);
}

export function saveThemeFile(path, content) {
  return apiRequest(`${BASE}/files/`, { method: "POST", body: { path, content } });
}

export function deleteThemePath(path) {
  return apiRequest(`${BASE}/files/?path=${encodeURIComponent(path)}`, { method: "DELETE" });
}

export function renameThemePath(source, target) {
  return apiRequest(`${BASE}/files/rename/`, { method: "POST", body: { source, target } });
}

// Section layout + settings of every page, with defaults filled in
export function getThemeSettings() {
  return apiRequest(`${BASE}/settings/`);
}

export function saveThemeSettings(data) {
  return apiRequest(`${BASE}/settings/`, { method: "PUT", body: data });
}

// Section types and their setting fields, for the customizer
export function getThemeSchema() {
  return apiRequest(`${BASE}/schema/`);
}
// Theme customizer: colors, fonts and button radius
export function getThemeCustomizer() {
  return apiRequest(`${BASE}/customizer/`);
}

export function saveThemeCustomizer(data) {
  return apiRequest(`${BASE}/customizer/`, {
    method: "POST",
    body: data,
  });
}

// Home page HTML rendered from unsaved section data, for the customizer's live preview -> { html }
// With `section`, only that section's HTML (and the fonts stylesheet) -> { html, fonts }
// `page`: index, product, collection, blog or article; `product`: the product the product page shows
export function previewTheme(data, { scroll = 0, selected = "", section = "", page = "index", product = "" } = {}) {
  const query = new URLSearchParams({ scroll: String(Math.round(scroll)), selected, page });
  if (section) query.set("section", section);
  if (product) query.set("product", product);
  return apiRequest(`${BASE}/preview/?${query}`, { method: "POST", body: data });
}

// Save only what changed: { settings?, templates?: { index: { order?, sections?: { id: section | null } } } }
export function patchThemeSettings(changes) {
  return apiRequest(`${BASE}/settings/`, { method: "PATCH", body: changes });
}

// Banner / slide / image block picture -> { ok, data: { url } } or { ok: false, error }
// Reports progress (0..1) while uploading; falls back to the normal upload if the session needs a refresh.
export function uploadThemeImage(file, onProgress) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const session = getSession();
    const storeId = session?.storeId || localStorage.getItem("tss-store-id");

    xhr.open("POST", `${API_URL}${BASE}/images/`);
    if (session?.token) xhr.setRequestHeader("Authorization", `Bearer ${session.token}`);
    if (storeId) xhr.setRequestHeader("X-Store-Id", storeId);

    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onerror = () => resolve({ ok: false, error: "Unable to reach the server. Please try again." });
    xhr.onload = () => {
      if (xhr.status === 401) {
        apiUpload(`${BASE}/images/`, "image", file).then(resolve);
        return;
      }
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve({ ok: true, data });
      else resolve({ ok: false, error: data?.image || data?.detail || "Upload failed. Please try again." });
    };

    const form = new FormData();
    form.append("image", file);
    xhr.send(form);
  });
}
