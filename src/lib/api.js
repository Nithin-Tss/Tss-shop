const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function apiPost(path, body) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
