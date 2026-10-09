import { apiRequest } from "@/lib/api";

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
