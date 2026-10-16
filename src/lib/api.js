import { getActiveStore, getSession, setStores, setTokens, signOut } from "@/lib/auth";

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
      (typeof localStorage !== "undefined" ? localStorage.getItem("tss-store-id") : null);
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

// Resolves true (new tokens), false (the server rejected the refresh token:
// the session is over) or "offline" (couldn't reach the server: keep the session).
// `expiredToken` is the access token that was rejected, or is about to expire.
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

    if (response.status >= 500) return "offline";
    if (!response.ok) return false;
    setTokens(await response.json());
    return true;
  })
    .catch(() => "offline")
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

// Seconds left on a JWT access token (Infinity if it can't be read)
function secondsLeft(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp - Date.now() / 1000;
  } catch {
    return Infinity;
  }
}

// The role and permissions in the session are read at sign-in; someone may
// have changed them since. Re-read them (at most every 15 seconds) after a 403
// and when the tab regains focus, so the sidebar and page guards catch up.
let lastAccessSync = 0;

export async function syncAccess({ force = false } = {}) {
  const session = getSession();
  if (!session?.token || typeof fetch === "undefined") return;
  if (!force && Date.now() - lastAccessSync < 15000) return;
  lastAccessSync = Date.now();

  try {
    const res = await send("/api/v1/stores/", { method: "GET" });
    if (!res.ok) return;
    const stores = await res.json();
    const current = getSession();
    // Only write when something changed, so pages don't re-render for nothing
    if (
      Array.isArray(stores) &&
      current &&
      JSON.stringify(stores) !== JSON.stringify(current.stores)
    ) {
      setStores(stores);
    }
  } catch {}
}

if (typeof window !== "undefined") {
  window.addEventListener("focus", () => syncAccess());
  // Also when the page opens: roles granted since the last sign-in show up without signing in again
  syncAccess({ force: true });
}

// fetch() with the auth headers, refreshing an expired access token once.
// Throws only when the server can't be reached.
async function send(path, { method, headers, body }) {
  const request = () => {
    const allHeaders = getHeaders(headers);
    // Files go as multipart: the browser sets that Content-Type (with its boundary) itself
    if (typeof FormData !== "undefined" && body instanceof FormData)
      delete allHeaders["Content-Type"];
    return fetch(`${API_URL}${path}`, { method, headers: allHeaders, body });
  };

  let usedToken = getSession()?.token;

  // Refresh a token that is about to expire before using it, so the user
  // never hits a 401 in the first place.
  if (usedToken && secondsLeft(usedToken) < 60) {
    await refreshSession(usedToken);
    usedToken = getSession()?.token;
  }

  let response = await request();

  if (response.status === 401 && usedToken) {
    const refreshed = await refreshSession(usedToken);
    if (refreshed === true) {
      response = await request();
    }
    // Sign out only when the session is really over, not when the server was unreachable
    if (response.status === 401 && refreshed !== "offline") {
      signOut();
    }
  }

  if (response.status === 403 && !path.startsWith("/api/v1/stores/")) syncAccess();

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
      body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
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

export function apiPost(path, body, customHeaders = {}) {
  return sendForm("POST", path, body, customHeaders);
}

export function apiPatch(path, body, customHeaders = {}) {
  return sendForm("PATCH", path, body, customHeaders);
}

// Send a form's data: { ok, data } or { ok: false, status, fieldErrors, formError }
async function sendForm(method, path, body, customHeaders) {
  let response;

  try {
    response = await send(path, {
      method,
      headers: customHeaders,
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      status: 0,
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

  const nonField =
    (Array.isArray(data) ? (typeof data[0] === "string" ? data[0] : null) : null) ||
    data?.non_field_errors?.[0] ||
    data?.detail;

  return {
    ok: false,
    status: response.status,
    fieldErrors,
    formError:
      nonField ||
      (Object.keys(fieldErrors).length ? "" : "Something went wrong. Please try again."),
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

/* ------------------------------------------------------------------ */
/* "View store": the active store's storefront, in a new tab.        */
/* The backend gives a link that shows its owner/staff a "Back to admin"*/
/* bar on top of the store. The admin page and its scroll position are  */
/* remembered here, and restored when the user comes back (the bar, or  */
/* the browser's Back button).                                          */
/* ------------------------------------------------------------------ */

const RETURN_KEY = "tss-admin-return";
const here = () => window.location.pathname + window.location.search;

// `path` is a storefront path: "/", "/collections/all", "/products/<id>"
export async function openStorefront(path = "/") {
  // Open the tab right away (inside the click) so popup blockers allow it; it is pointed at the store below
  const tab = window.open("", "_blank");

  const res = await apiPost("/api/v1/themes/storefront-link/", {
    path,
    return_url: window.location.href,
  });

  let url = res.ok ? res.data.url : null;
  if (!url) {
    // The link couldn't be made: still open the store (just without the bar)
    const store = getActiveStore(getSession());
    if (store?.storeSlug) url = `${API_URL}/s/${store.storeSlug}${path}`;
  }

  if (tab) {
    if (url) tab.location.href = url;
    else tab.close();
  } else if (url) {
    window.open(url, "_blank"); // blocked placeholder tab: try once more
  }
}

// Called by every admin page (see AdminHeader): back from the store, scroll to where the user was
export function restoreAdminScroll() {
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) || "null");
    if (!saved || saved.url !== here()) return;
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    return;
  }

  // The page loads its data first, so keep trying for a moment until it is tall enough
  let tries = 0;
  const attempt = () => {
    window.scrollTo(0, saved.scrollY);
    if (Math.abs(window.scrollY - saved.scrollY) > 2 && tries++ < 40) setTimeout(attempt, 50);
  };
  attempt();
}

// The browser kept the whole page (back/forward cache): it is already as the user left it
export function forgetAdminReturn() {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {}
}
