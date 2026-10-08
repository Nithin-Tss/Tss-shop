const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BASE = `${API_URL}/api/v1/themes`;

// TODO: replace with the store from the logged-in user once login issues tokens.
function storeHeaders() {
  try {
    const storeId = localStorage.getItem("tss-store-id");
    return storeId ? { "X-Store-Id": storeId } : {};
  } catch {
    return {};
  }
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...storeHeaders(),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Unable to reach the server. Is the backend running?");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const first = Object.values(data)[0];
    const message =
      data.detail || (Array.isArray(first) ? first[0] : first) || "Request failed.";
    throw new Error(String(message));
  }

  return data;
}

export function listThemeFiles() {
  return request("/files/");
}

export function saveThemeFile(path, content) {
  return request("/files/", {
    method: "POST",
    body: JSON.stringify({ path, content }),
  });
}

export function deleteThemePath(path) {
  return request(`/files/?path=${encodeURIComponent(path)}`, { method: "DELETE" });
}

export function renameThemePath(source, target) {
  return request("/files/rename/", {
    method: "POST",
    body: JSON.stringify({ source, target }),
  });
}

export function themeRenderUrl(storeId) {
  let id = storeId;

  if (!id) {
    try {
      id = localStorage.getItem("tss-store-id");
    } catch {}
  }

  return `${BASE}/render/${id ? `?store=${encodeURIComponent(id)}` : ""}`;
}
