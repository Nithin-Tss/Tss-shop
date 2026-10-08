import { getStoreId, getToken, signOut } from "@/lib/auth";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function authHeaders() {
  const headers = {};
  const token = getToken();
  const storeId = getStoreId();

  if (token) headers.Authorization = `Bearer ${token}`;
  if (storeId) headers["X-Store-Id"] = storeId;

  return headers;
}

// Turns any DRF error body into one readable message
function errorMessage(data) {
  if (Array.isArray(data)) return String(data[0] ?? "Request failed.");
  if (data?.detail) return String(data.detail);
  if (data?.non_field_errors) return String(data.non_field_errors[0]);

  const first = data && Object.values(data)[0];
  if (Array.isArray(first)) return String(first[0]);
  if (first) return typeof first === "string" ? first : JSON.stringify(first);

  return "Request failed.";
}

/*
 * Authenticated JSON request. Resolves with the response data, or throws
 * an Error whose message is ready to show. A 401 signs the user out.
 */
export async function apiRequest(path, { method = "GET", body, headers } = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Unable to reach the server. Is the backend running?");
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && getToken()) {
    signOut();
  }

  if (!response.ok) {
    const error = new Error(errorMessage(data));
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Form-friendly POST: never throws, returns field errors for the form
export async function apiPost(path, body) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
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

  // DRF returns { field: ["msg", ...] } (or { detail: "msg" })
  const fieldErrors = {};
  Object.entries(data).forEach(([key, value]) => {
    if (key !== "detail" && key !== "non_field_errors") {
      fieldErrors[key] = Array.isArray(value) ? value[0] : String(value);
    }
  });

  const nonField = data.non_field_errors?.[0] || data.detail;

  return {
    ok: false,
    fieldErrors,
    formError:
      nonField ||
      (Object.keys(fieldErrors).length ? "" : "Something went wrong. Please try again."),
  };
}
