import { API_URL, apiRequest, apiUpload } from "@/lib/api";
import { checkImageFile } from "@/lib/imageUpload";
import { getSession } from "@/lib/auth";

// Every call is for the signed-in user's current store (Authorization + X-Store-Id).
const BASE = "/api/v1/themes";

// -> { store, storefrontUrl, files: [{ path, content }] }
// themeId (optional) pins the call to the theme the editor loaded; the timestamp keeps any cache out of it
export function listThemeFiles(themeId) {
  return apiRequest(`${BASE}/files/?_=${Date.now()}`, themeHeaders(themeId));
}

const themeHeaders = (themeId) => (themeId ? { headers: { "X-Theme-Id": themeId } } : {});

export function saveThemeFile(path, content, themeId) {
  return apiRequest(`${BASE}/files/`, {
    method: "POST",
    body: { path, content },
    ...themeHeaders(themeId),
  });
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

// The cart is a shared snippet, not a saved template; the customizer only holds a temporary
// templates.cart entry while it is the preview page, so it is never sent to the API.
function withoutCartTemplate(data) {
  if (!data?.templates || !("cart" in data.templates)) return data;
  const { cart: _cart, ...templates } = data.templates;
  return { ...data, templates };
}

export function saveThemeCustomizer(data) {
  return apiRequest(`${BASE}/customizer/`, {
    method: "POST",
    body: withoutCartTemplate(data),
  });
}

// Home page HTML rendered from unsaved section data, for the customizer's live preview -> { html }
// With `section`, only that section's HTML (and the fonts stylesheet) -> { html, fonts }
// `page`: index, product, collection, blog or article; `product`: the product the product page shows;
// `article`: the handle of the post the article page shows
export function previewTheme(
  data,
  {
    scroll = 0,
    selected = "",
    section = "",
    page = "index",
    product = "",
    article = "",
    handle = "",
    collection = "",
    customer = "",
    customerToken = "",
  } = {}
) {
  const query = new URLSearchParams({ scroll: String(Math.round(scroll)), selected, page });
  if (section) query.set("section", section);
  if (product) query.set("product", product);
  if (article) query.set("article", article);
  if (handle) query.set("handle", handle);
  if (collection) query.set("collection", collection);
  if (customer) query.set("customer", customer);
  if (customer && customerToken) query.set("ct", customerToken);
  return apiRequest(`${BASE}/preview/?${query}`, {
    method: "POST",
    body: withoutCartTemplate(data),
  });
}

// One page of a theme (live or draft) as HTML, for its thumbnail and the plain "View" tab -> { html }
// `path` is a store path ("/", "/products/<id>", "/collections/<handle>", "/blog/<handle>", ...).
// Names the theme in the request, so it doesn't change the theme the editor is working on.
export async function renderThemePage(themeId, path = "/") {
  const headers = { "X-Theme-Id": themeId };
  const data = await apiRequest(`${BASE}/settings/`, { headers });
  // "/products/<id>?back=/collections/x": the segments come from the path alone, the query goes along
  const [pathname, search = ""] = path.split("#")[0].split(/\?(.*)/s);
  const [first, second, third] = pathname.split("/").filter(Boolean);
  const query = new URLSearchParams({ scroll: "0", selected: "", page: "index" });
  const given = new URLSearchParams(search);
  if (first === "account" && (second === "login" || second === "register")) {
    query.set("customer", second);
  } else if (first === "products" && second) {
    query.set("page", "product");
    query.set("product", second);
  } else if (first === "collections") {
    query.set("page", "collection");
    if (second && second !== "all") query.set("collection", second);
  } else if (first === "blog") {
    if (second && !third) {
      query.set("page", "article");
      query.set("article", second);
    } else {
      query.set("page", "blog");
    }
  } else if (first === "pages" && second) {
    query.set("page", "page");
    query.set("handle", second);
  } else if (first === "checkout") {
    query.set("page", "checkout");
  } else if (first === "cart") {
    query.set("page", "cart");
  }
  // The page's own query (?q=, ?sort=, ?page=, ?back=) is kept; it never overrides what the path chose
  given.forEach((value, key) => {
    if (key === "page") query.set("page_number", value);
    else if (!query.has(key)) query.set(key, value);
  });
  const page = query.get("page");
  if (page === "checkout" && !data.templates?.checkout) {
    data.templates = {
      ...data.templates,
      checkout: { order: ["main"], sections: { main: { type: "main-checkout", settings: {} } } },
    };
  }
  return apiRequest(`${BASE}/preview/?${query}`, {
    method: "POST",
    body: withoutCartTemplate(data),
    headers,
  });
}

export const renderThemeHome = (themeId) => renderThemePage(themeId, "/");

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

// The store's themes: one published, the rest drafts, and the ready-made designs to add
// -> { themes: [{ id, name, preset, published, updated_at }], presets: [{ slug, name, description, categories, swatches }], max }
export function getThemeLibrary() {
  return apiRequest(`${BASE}/library/`);
}

// Add a theme: source is a preset slug, "blank" (your own, from the starter) or a theme id (a copy).
// The store's first theme is published; later ones are drafts. -> { id, name, preset, published }
export function addTheme(source, name) {
  return apiRequest(`${BASE}/library/`, { method: "POST", body: { source, name } });
}

export function renameTheme(id, name) {
  return apiRequest(`${BASE}/library/${id}/`, { method: "PATCH", body: { name } });
}

export function deleteTheme(id) {
  return apiRequest(`${BASE}/library/${id}/`, { method: "DELETE" });
}

// Make a draft the live theme; the one that was live becomes a draft
export function publishTheme(id) {
  return apiRequest(`${BASE}/library/${id}/publish/`, { method: "POST", body: {} });
}

// Page templates -> { templates: [{ key: "page" | "page.contact", label, path, liquid_path }] }
export function listPageTemplates() {
  return apiRequest(`${BASE}/page-templates/`);
}

// A new template (a copy of Page): templates/page.<name>.liquid and .json -> { key, templates }
export function createPageTemplate(name) {
  return apiRequest(`${BASE}/page-templates/`, { method: "POST", body: { name } });
}

// Pages -> [{ id, title, handle, body, status: "visible" | "hidden", template, seo_title, seo_description, published_at, url }]
export function listStorePages() {
  return apiRequest(`${BASE}/pages/`);
}

export function saveStorePage(id, data) {
  return id
    ? apiRequest(`${BASE}/pages/${id}/`, { method: "PATCH", body: data })
    : apiRequest(`${BASE}/pages/`, { method: "POST", body: data });
}

export function deleteStorePage(id) {
  return apiRequest(`${BASE}/pages/${id}/`, { method: "DELETE" });
}

// Menus -> [{ id, name, handle, items: [...], items_summary, items_count }]
export function listMenus() {
  return apiRequest(`${BASE}/menus/`);
}

export function getMenu(id) {
  return apiRequest(`${BASE}/menus/${id}/`);
}

export function saveMenu(id, data) {
  return id
    ? apiRequest(`${BASE}/menus/${id}/`, { method: "PUT", body: data })
    : apiRequest(`${BASE}/menus/`, { method: "POST", body: data });
}

export function deleteMenu(id) {
  return apiRequest(`${BASE}/menus/${id}/`, { method: "DELETE" });
}

// URL Redirects -> [{ id, path, target, created_at, updated_at }]
export function listUrlRedirects() {
  return apiRequest(`${BASE}/redirects/`);
}

export function saveUrlRedirect(id, data) {
  return id
    ? apiRequest(`${BASE}/redirects/${id}/`, { method: "PATCH", body: data })
    : apiRequest(`${BASE}/redirects/`, { method: "POST", body: data });
}

export function deleteUrlRedirect(id) {
  return apiRequest(`${BASE}/redirects/${id}/`, { method: "DELETE" });
}

// Save only what changed: { settings?, templates?: { index: { order?, sections?: { id: section | null } } } }
export function patchThemeSettings(changes) {
  return apiRequest(`${BASE}/settings/`, { method: "PATCH", body: changes });
}

// Banner / slide / image block picture -> { ok, data: { url } } or { ok: false, error }
// Reports progress (0..1) while uploading; falls back to the normal upload if the session needs a refresh.
export async function uploadThemeImage(file, onProgress) {
  const problem = await checkImageFile(file);
  if (problem) return { ok: false, error: problem };

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
export function getSyncedSections(themeId) {
  return apiRequest(`${BASE}/sections/?_=${Date.now()}`, themeHeaders(themeId));
}

// Save a synced section's file from the code editor: -> { path, size, sync? }
export function saveSyncedFile(path, content, baseVersion, themeId) {
  return apiRequest(`${BASE}/files/`, {
    ...themeHeaders(themeId),
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
      // Signed out (or the sign-in expired): nothing to stream, and every retry would only add a 401
      if (!getSession()?.token) {
        stopped = true;
        return;
      }
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
          if (!getSession()?.token) {
            stopped = true;
            return;
          }
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

/* ------------------------------------------------------------------ */
/* Media library: the pictures a store uploaded (banners, slides, image blocks) */

// ?q= searches name and alt text -> [{ id, name, url, mime_type, file_size, alt_text, uploaded_by_name, created_at }]
export function listMediaAssets(query = "") {
  const q = query.trim();
  return apiRequest(`/api/v1/media/${q ? `?q=${encodeURIComponent(q)}` : ""}`);
}

// -> { ok, data: asset } or { ok: false, error }
export function uploadMediaAsset(file) {
  return apiUpload("/api/v1/media/", "image", file);
}

// changes: { name?, alt_text? }
export function updateMediaAsset(id, changes) {
  return apiRequest(`/api/v1/media/${id}/`, { method: "PATCH", body: changes });
}

// Refused (400) while a picture is still used in the online store
export function deleteMediaAsset(id) {
  return apiRequest(`/api/v1/media/${id}/`, { method: "DELETE" });
}

// What a full render of the preview depends on: the page and only the sample that page shows.
// A sample for another page (posts, pages or products arriving late) is not part of it.
export function previewKeyOf({
  page,
  product = "",
  article = "",
  collection = "",
  handle = "",
  customer = "",
}) {
  const base = String(page || "").split(".")[0];
  return [
    page,
    page === "product" ? product || "" : "",
    page === "article" ? article || "" : "",
    page === "collection" ? collection || "" : "",
    base === "page" ? handle || "" : "",
    customer || "",
  ].join("|");
}
