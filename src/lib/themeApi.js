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
// `page`: index, product, collection, blog or article; `product`: the product the product page shows;
// `article`: the handle of the post the article page shows
export function previewTheme(
  data,
  { scroll = 0, selected = "", section = "", page = "index", product = "", article = "" } = {}
) {
  const query = new URLSearchParams({ scroll: String(Math.round(scroll)), selected, page });
  if (section) query.set("section", section);
  if (product) query.set("product", product);
  if (article) query.set("article", article);
  return apiRequest(`${BASE}/preview/?${query}`, { method: "POST", body: data });
}

// Blog posts -> [{ id, title, handle, excerpt, body, cover_image, author, category, tags, status, published_at, url }]
export function listBlogPosts() {
  return apiRequest(`${BASE}/posts/`);
}

export function saveBlogPost(id, data) {
  return id
    ? apiRequest(`${BASE}/posts/${id}/`, { method: "PATCH", body: data })
    : apiRequest(`${BASE}/posts/`, { method: "POST", body: data });
}

export function deleteBlogPost(id) {
  return apiRequest(`${BASE}/posts/${id}/`, { method: "DELETE" });
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
    xhr.onerror = () =>
      resolve({ ok: false, error: "Unable to reach the server. Please try again." });
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
      else
        resolve({
          ok: false,
          error: data?.image || data?.detail || "Upload failed. Please try again.",
        });
    };

    const form = new FormData();
    form.append("image", file);
    xhr.send(form);
  });
}

/* ------------------------------------------------------------------ */
/* Synced sections: sections/footer.liquid <-> the customizer's Footer   */
/* ------------------------------------------------------------------ */

// Identifies this open editor, so it can skip the live events it caused itself
export const SYNC_CLIENT = Math.random().toString(36).slice(2, 12);

// -> { footer: { path, label, spec, values, version } }
export function getSyncedSections() {
  return apiRequest(`${BASE}/sections/`);
}

// Save a synced section's file from the code editor: -> { path, size, sync? }
export function saveSyncedFile(path, content, baseVersion) {
  return apiRequest(`${BASE}/files/`, {
    method: "POST",
    body: {
      path,
      content,
      base_version: baseVersion ?? null,
      client: SYNC_CLIENT,
      started_at: Date.now(),
    },
  });
}

// -> { version, history: [{ index, saved_at, source, size, preview }] }  (latest first, at most 20)
export function getSectionHistory(name) {
  return apiRequest(`${BASE}/sections/${name}/history/`);
}

export function restoreSectionVersion(name, index) {
  return apiRequest(`${BASE}/sections/${name}/history/`, {
    method: "POST",
    body: { index, client: SYNC_CLIENT },
  });
}

// "Change made -> preview updated" times, for the average / slowest report
export function postSyncTiming(kind, ms) {
  console.info(`[footer sync] ${kind}: ${Math.round(ms)} ms`);
  return apiRequest(`${BASE}/sync-timings/`, { method: "POST", body: { kind, ms } }).catch(
    () => null
  );
}

export function getSyncTimings() {
  return apiRequest(`${BASE}/sync-timings/`);
}

// Live events (Server-Sent Events over fetch, which can send the sign-in headers).
// Calls onEvent(payload) for each "section" event from ANOTHER editor; reconnects
// by itself. Returns the function that stops it.
export function subscribeThemeEvents(onEvent) {
  let stopped = false;
  let controller = null;
  let after = "";
  let failures = 0;

  async function connect() {
    while (!stopped) {
      controller = new AbortController();
      try {
        const session = getSession();
        const storeId = session?.storeId || localStorage.getItem("tss-store-id");
        const headers = { Accept: "text/event-stream" };
        if (session?.token) headers.Authorization = `Bearer ${session.token}`;
        if (storeId) headers["X-Store-Id"] = storeId;

        const response = await fetch(`${API_URL}${BASE}/events/${after ? `?after=${after}` : ""}`, {
          headers,
          signal: controller.signal,
        });
        if (response.status === 401) {
          // Let the normal request path refresh the sign-in, then reconnect
          await getSyncedSections().catch(() => null);
          throw new Error("signed out");
        }
        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
        failures = 0;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let cut;
          while ((cut = buffer.indexOf("\n\n")) >= 0) {
            const chunk = buffer.slice(0, cut);
            buffer = buffer.slice(cut + 2);
            let event = "message";
            let data = "";
            for (const line of chunk.split("\n")) {
              if (line.startsWith("id:")) after = line.slice(3).trim();
              else if (line.startsWith("event:")) event = line.slice(6).trim();
              else if (line.startsWith("data:")) data += line.slice(5).trim();
            }
            if (event === "hello" && !after) {
              try {
                after = String(JSON.parse(data).seq);
              } catch {
                /* keep going */
              }
            }
            if (event !== "section" || !data) continue;
            try {
              const payload = JSON.parse(data);
              if (payload.client !== SYNC_CLIENT) onEvent(payload);
            } catch {
              /* a broken event: skip it */
            }
          }
        }
      } catch {
        if (stopped) return;
        failures += 1;
      }
      if (!stopped) await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** failures, 15000)));
    }
  }

  connect();
  return () => {
    stopped = true;
    controller?.abort();
  };
}
