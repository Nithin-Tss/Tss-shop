import { getRefreshToken, getSession, setTokens, signOut } from "@/lib/auth";

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
/* ------------------------------------------------------------------ */

// One refresh at a time, even if several requests expire together
let refreshing = null;

function refreshSession() {
  const refresh = getRefreshToken();

  if (!refresh) return Promise.resolve(false);

  refreshing ??= fetch(`${API_URL}/api/v1/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  })
    .then(async (response) => {
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
  const request = () =>
    fetch(`${API_URL}${path}`, { method, headers: getHeaders(headers), body });

  let response = await request();

  if (response.status === 401 && getSession()?.token) {
    if (await refreshSession()) {
      response = await request();
    }
    if (response.status === 401) {
      signOut();
    }
  }

  return response;
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
