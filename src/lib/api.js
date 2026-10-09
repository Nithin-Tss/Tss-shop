import { getSession, setTokens, signOut } from "@/lib/auth";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getHeaders(extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  try {
    const session = getSession();
    if (session?.token) {
      headers["Authorization"] = `Bearer ${session.token}`;
    }
    const storeId =
      session?.storeId ||
      (typeof localStorage !== "undefined"
        ? localStorage.getItem("tss-store-id")
        : null);
    if (storeId) {
      headers["X-Store-Id"] = storeId;
    }
  } catch {}

  return headers;
}

// Turns any DRF error body into one readable message
function errorMessage(data, fallback) {
  if (Array.isArray(data)) return String(data[0] ?? fallback);
  if (data?.detail) return String(data.detail);
  if (data?.message) return String(data.message);
  if (data?.non_field_errors) return String(data.non_field_errors[0]);

  // Field errors: { email: ["A customer with this email already exists."] }
  const first = data && typeof data === "object" ? Object.values(data)[0] : null;
  if (Array.isArray(first)) return String(first[0]);
  if (typeof first === "string") return first;

  return fallback;
}

/* ------------------------------------------------------------------ */
/* JWT refresh                                                          */
/* The access token lives 15 minutes. When a request gets 401, swap the */
/* refresh token for a new pair once and repeat the request. If that    */
/* fails too, the session is over: sign out.                            */
/*                                                                      */
/* A refresh token works only once, and all tabs share it (localStorage),*/
/* so only one tab may refresh at a time (a lock shared by every tab).  */
/* A tab that waited checks first whether another tab already got new  */
/* tokens, and then just uses those.                                    */
/* ------------------------------------------------------------------ */

const REFRESH_LOCK = "tss-auth-refresh";

// Run `task` while holding a lock shared by all tabs of this site.
function withTabLock(task) {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(REFRESH_LOCK, task);
  }
  return task(); // very old browsers: no cross-tab lock
}

// One refresh at a time in this tab, even if several requests expire together
let refreshing = null;

// `expiredToken` is the access token the server just rejected.
function refreshSession(expiredToken) {
  refreshing ??= withTabLock(async () => {
    const session = getSession();

    if (!session?.refresh) return false;

    // Another tab refreshed while this one waited: use its new tokens.
    if (session.token && session.token !== expiredToken) return true;

    const response = await fetch(`${API_URL}/api/v1/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: session.refresh }),
    });

    if (!response.ok) return false;
    setTokens(await response.json());
    return true;
  })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

// fetch() with the auth headers, refreshing an expired access token once.
// Throws only when the server can't be reached.
async function send(path, { method, headers, body }) {
  const request = () => {
    const allHeaders = getHeaders(headers);
    // Files go as multipart: the browser sets that Content-Type (with its boundary) itself
    if (typeof FormData !== "undefined" && body instanceof FormData) delete allHeaders["Content-Type"];
    return fetch(`${API_URL}${path}`, { method, headers: allHeaders, body });
  };

  const usedToken = getSession()?.token;
  let response = await request();

  if (response.status === 401 && usedToken) {
    if (await refreshSession(usedToken)) {
      response = await request();
    }
    if (response.status === 401) {
      signOut();
    }
  }

  return response;
}

// The Logout button: sign out here at once, and tell the backend to end this
// sign-in so its tokens stop working there too (even if they were copied).
// `keepalive` lets the request finish while the page navigates away.
export function logout() {
  const refresh = getSession()?.refresh;

  signOut();

  if (!refresh) return;

  fetch(`${API_URL}/api/v1/auth/logout/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
    keepalive: true,
  }).catch(() => {}); // offline: the sign-in still expires on its own
}

/* ------------------------------------------------------------------ */

export async function apiRequest(path, options = {}) {
  const { method = "GET", headers = {}, body } = options;

  let res;
  try {
    res = await send(path, {
      method,
      headers,
      body: body
        ? typeof body === "string"
          ? body
          : JSON.stringify(body)
        : undefined,
    });
  } catch {
    throw new Error("Unable to reach the server. Is the backend running?");
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(errorMessage(errorData, res.statusText || "Request failed"));
    error.status = res.status;
    error.data = errorData;
    throw error;
  }

  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

export async function apiGet(path, customHeaders = {}) {
  let response;

  try {
    response = await send(path, { method: "GET", headers: customHeaders });
  } catch {
    return {
      ok: false,
      error: "Unable to reach the server. Please try again.",
      data: null,
    };
  }

  const data = await response.json().catch(() => null);

  if (response.ok) {
    return { ok: true, data };
  }

  return {
    ok: false,
    error: errorMessage(data, "Failed to fetch data from server."),
    data: null,
  };
}

export async function apiPost(path, body, customHeaders = {}) {
  let response;

  try {
    response = await send(path, {
      method: "POST",
      headers: customHeaders,
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      fieldErrors: {},
      formError: "Unable to reach the server. Please try again.",
    };
  }

  const data = await response.json().catch(() => ({}));

  if (response.ok) {
    return { ok: true, data };
  }

  const fieldErrors = {};
  if (data && typeof data === "object") {
    Object.entries(data).forEach(([key, value]) => {
      if (key !== "detail" && key !== "non_field_errors") {
        fieldErrors[key] = Array.isArray(value) ? value[0] : String(value);
      }
    });
  }

  const nonField = data?.non_field_errors?.[0] || data?.detail;

  return {
    ok: false,
    fieldErrors,
    formError:
      nonField ||
      (Object.keys(fieldErrors).length
        ? ""
        : "Something went wrong. Please try again."),
  };
}

// Upload one file as multipart form data: { ok, data } or { ok: false, error }
export async function apiUpload(path, field, file) {
  const form = new FormData();
  form.append(field, file);

  let response;
  try {
    response = await send(path, { method: "POST", headers: {}, body: form });
  } catch {
    return { ok: false, error: "Unable to reach the server. Please try again." };
  }

  const data = await response.json().catch(() => null);
  if (response.ok) return { ok: true, data };

  return { ok: false, error: errorMessage(data, "Upload failed. Please try again.") };
}

export async function apiDelete(path, customHeaders = {}) {
  let response;

  try {
    response = await send(path, { method: "DELETE", headers: customHeaders });
  } catch {
    return {
      ok: false,
      error: "Unable to reach the server. Please try again.",
    };
  }

  if (response.status === 204 || response.ok) {
    return { ok: true };
  }

  const data = await response.json().catch(() => ({}));
  return {
    ok: false,
    error: errorMessage(data, "Failed to delete item."),
  };
}
