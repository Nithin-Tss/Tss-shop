import { getSession } from "@/lib/auth";

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

export async function apiRequest(path, options = {}) {
  const { method = "GET", headers = {}, body } = options;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: getHeaders(headers),
    body: body
      ? typeof body === "string"
        ? body
        : JSON.stringify(body)
      : undefined,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message =
      errorData.detail ||
      errorData.message ||
      errorData.non_field_errors?.[0] ||
      res.statusText ||
      "Request failed";
    const error = new Error(message);
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
    response = await fetch(`${API_URL}${path}`, {
      method: "GET",
      headers: getHeaders(customHeaders),
    });
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

  const errorMessage =
    data?.detail || data?.message || "Failed to fetch data from server.";

  return {
    ok: false,
    error: String(errorMessage),
    data: null,
  };
}

export async function apiPost(path, body, customHeaders = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: getHeaders(customHeaders),
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
    response = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers: getHeaders(customHeaders),
    });
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
    error: data?.detail || "Failed to delete item.",
  };
}
