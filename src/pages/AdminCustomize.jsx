import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Link } from "react-router-dom";

import { API_URL, apiRequest, openStorefront } from "@/lib/api";

import { useSession } from "@/lib/auth";

import {
  getThemeSchema,
  getThemeSettings,
  patchThemeSettings,
  getThemeCustomizer,
  saveThemeCustomizer,
  previewTheme,
  getSyncedSections,
  postSyncTiming,
  subscribeThemeEvents,
  SYNC_CLIENT,
  listBlogPosts,
  listStorePages,
  createPageTemplate,
  deleteThemePath,
} from "@/lib/themeApi";

import { announceThemeChange, onThemeChange } from "@/lib/themeSync";

import { iconButton, iconProps, defaultsOf, DropLine, DragHandle } from "./AdminCustomizeShared";
import {
  FontsContext,
  StorePagesContext,
  BlogPostsContext,
  UploadsContext,
  GroupedFields,
  SectionBlocks,
  EyeIcon,
  GroupHeading,
  LayoutRows,
  CenteredMessage,
} from "./AdminCustomizeFields";

const PAGE_LABELS = {
  index: "Home page",
  product: "Product page",
  collection: "Collection page",
  blog: "Blog page",
  article: "Article page",
  page: "Page",
};

// Alternate page templates are "page.<name>" (templates/page.<name>.liquid), edited like Page
const PAGE_TEMPLATE_KEY = /^page\.[a-z0-9]+(-[a-z0-9]+)*$/;
const isPageKey = (key) => key in PAGE_LABELS || PAGE_TEMPLATE_KEY.test(key || "");
const basePage = (key) => String(key || "").split(".")[0];
const pageLabel = (key) =>
  PAGE_LABELS[key] ||
  (PAGE_TEMPLATE_KEY.test(key || "")
    ? `Page: ${key
        .slice(5)
        .replace(/-/g, " ")
        .replace(/^./, (c) => c.toUpperCase())}`
    : key);

// Each page's own main section: selected when a store link opens that page in the preview
const MAIN_SECTION = {
  product: "main-product",
  collection: "main-collection",
  blog: "main-blog",
  article: "main-article",
  page: "main-page",
};

const NEW_TEMPLATE = "__new_template__";

const newSectionId = (type) => `${type}-${Math.random().toString(36).slice(2, 6)}`;

const MAX_SECTIONS = 25;

// Synced sections (the header and the footer): their options live in the schema of
// sections/<name>.liquid, and a change here is written into that file (and the other way
// round). Which ones a theme has comes from the server; their values are kept in
// data.sections[name] as { type: name, settings, blocks }. They are on every page.
const isSynced = (d, id) => Boolean(id && d?.sections?.[id]);

const syncedNames = (d) => Object.keys(d?.sections || {});

// The section `id` of a page, or a synced section
function sectionIn(d, page, id) {
  return isSynced(d, id) ? d.sections[id] : d.templates[page]?.sections[id];
}

const syncedJson = (d, name) => JSON.stringify(d?.sections?.[name] ?? null);

// A page's sections as its synced template file lists them (id, type, hidden, in order)
function templateLines(template) {
  return JSON.stringify(
    (template?.order || []).map((id) => [
      id,
      template.sections[id]?.type,
      Boolean(template.sections[id]?.hidden),
    ])
  );
}

// What the server stores for a synced section: its settings and blocks
function syncedForSave(section) {
  return { settings: section.settings, blocks: section.blocks };
}

const SECTION_ICONS = {
  hero: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
  slideshow: (
    <>
      <rect x="5" y="6" width="14" height="12" rx="2" />
      <path d="M2 8v8M22 8v8" />
    </>
  ),
  "product-grid": (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  "product-carousel": (
    <>
      <rect x="6" y="5" width="12" height="14" rx="2" />
      <path d="M2 7v10M22 7v10" />
    </>
  ),
  "rich-text": <path d="M4 6h16M4 10h16M4 14h10M4 18h7" />,
  custom: (
    <>
      <rect x="3" y="3" width="18" height="7" rx="1.5" />
      <rect x="3" y="14" width="8" height="7" rx="1.5" />
      <rect x="15" y="14" width="6" height="7" rx="1.5" />
    </>
  ),
  "main-product": (
    <>
      <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z" />
      <circle cx="7.5" cy="7.5" r="1" />
    </>
  ),
  "main-collection": (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
};

export default function AdminCustomizePage() {
  const session = useSession();

  const store = session?.stores?.find((s) => s.storeId === session.storeId);

  // "Edit code" opens a new tab, which shares this tab's HTTP cache: fetch the editor
  // route and the Monaco bundle while the browser is idle so that tab starts warm.
  useEffect(() => {
    const warm = () => {
      import("@/pages/EditorDemo");
      import("@/lib/monacoSetup");
    };
    const id = window.setTimeout(warm, 1500);
    return () => window.clearTimeout(id);
  }, []);

  const [schema, setSchema] = useState(null);

  const [data, setData] = useState(null);

  const [customizer, setCustomizer] = useState({});

  const [collections, setCollections] = useState([]);

  // ?page=product&product=<id>&article=<handle>&section=<id>: what was open, so a refresh shows it again
  const [startParams] = useState(() => new URLSearchParams(window.location.search));

  const [sampleProductId, setSampleProductId] = useState(() => startParams.get("product"));

  // Published blog posts, and the one the Article page preview shows (its handle)
  const [blogPosts, setBlogPosts] = useState([]);

  const [sampleArticle, setSampleArticle] = useState(() => startParams.get("article") || "");

  // The collection (handle or id) the Collection page preview shows; empty = all products
  const [sampleCollection, setSampleCollection] = useState(
    () => startParams.get("collection") || ""
  );

  // Visible store pages (About us, ...), and the one the Page preview shows (its handle)
  const [storePages, setStorePages] = useState([]);

  const [samplePage, setSamplePage] = useState(() => startParams.get("handle") || "");

  const [products, setProducts] = useState([]);

  const [page, setPage] = useState(() =>
    isPageKey(startParams.get("page")) ? startParams.get("page") : "index"
  );

  const [selected, setSelected] = useState(() => startParams.get("section"));

  // Pages left by following a store link in the preview ({page, selected, product, article}), for "Back"
  const [backStack, setBackStack] = useState([]);

  // Right-click menu over the preview: where it opens, and the theme file it edits
  const [contextMenu, setContextMenu] = useState(null);

  const [status, setStatus] = useState("loading");

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  // Autosave: "saved", "pending", "saving", "error" (will retry) or "invalid" (server refused the data)
  const [saveState, setSaveState] = useState("saved");

  const [saveError, setSaveError] = useState("");

  const dirty = saveState !== "saved";

  const saveStateRef = useRef("saved");

  // Which group of the Theme settings panel opens first (Header, Footer, ...)
  const [themeGroup, setThemeGroup] = useState("colors");

  const [previewKey, setPreviewKey] = useState(0);

  const [previewHtml, setPreviewHtml] = useState("");

  const [previewError, setPreviewError] = useState("");

  // Add-section box
  const [adding, setAdding] = useState(false);

  const [newName, setNewName] = useState("");

  // Inline rename in the sections panel
  const [renaming, setRenaming] = useState(null);

  const [renameValue, setRenameValue] = useState("");

  // Which section's "..." menu is open
  const [rowMenu, setRowMenu] = useState(null);

  useEffect(() => {
    if (!rowMenu) return undefined;

    const onPointer = (e) => {
      if (!e.target.closest("[data-row-menu]") && !e.target.closest('[aria-haspopup="menu"]'))
        setRowMenu(null);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setRowMenu(null);
      }
    };

    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey, true);

    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [rowMenu]);

  // Pointer drag (mouse and touch): what is moving, and where it would land
  const [drag, setDrag] = useState(null);

  const [dropTarget, setDropTarget] = useState(null);

  const iframeRef = useRef(null);

  // One side panel with two views: the sections list, and the editor of the selected item
  const [panelOpen, setPanelOpen] = useState(true);

  // Preview size: "desktop" (full width) or "mobile" (phone width)
  const [device, setDevice] = useState("desktop");

  // Edit mode (Home preview): Off = the preview behaves like the real store; On = clicks select sections.
  // Kept while the customizer stays open.
  const [editMode, setEditMode] = useState(false);

  const editModeRef = useRef(false);

  // A selection that came from a click in the preview (no need to scroll the preview to it)
  const fromPreviewRef = useRef(false);

  // The block to open once a section picked in the preview is selected
  const pendingBlockRef = useRef(null);

  const editScrollRef = useRef(null);

  const lastShownRef = useRef(null);

  // The block (index in the selected section) whose settings are open, if any
  const [selectedBlock, setSelectedBlock] = useState(null);

  const lastBlockRef = useRef(null);

  const blockScrollRef = useRef(null);

  const scrollRef = useRef(0);

  const dataRef = useRef(null);

  const customizerRef = useRef({});

  const selectedRef = useRef(null);

  const selectedBlockRef = useRef(null);

  const pageRef = useRef("index");

  const sampleProductRef = useRef(null);

  const sampleArticleRef = useRef("");

  const sampleCollectionRef = useRef("");

  const samplePageRef = useRef("");

  // Keep the "latest value" refs in step after each commit (event handlers and timers read them)
  useLayoutEffect(() => {
    saveStateRef.current = saveState;
    editModeRef.current = editMode;
    dataRef.current = data;
    customizerRef.current = customizer;
    selectedRef.current = selected;
    selectedBlockRef.current = selectedBlock;
    pageRef.current = page;
    sampleProductRef.current = sampleProductId;
    sampleArticleRef.current = sampleArticle;
    sampleCollectionRef.current = sampleCollection;
    samplePageRef.current = samplePage;
  });

  // Pages written in Pages; the preview keeps its page while that page is still visible
  const loadStorePages = useCallback(
    () =>
      listStorePages()
        .then((all) => {
          const visible = all.filter((p) => p.status === "visible");
          setStorePages(visible);
          setSamplePage((current) =>
            visible.some((p) => p.handle === current) ? current : visible[0]?.handle || ""
          );
        })
        .catch(() => setStorePages([])),
    []
  );

  useEffect(() => {
    loadStorePages();
  }, [loadStorePages]);

  // Posts written in Blog posts; the article preview keeps its post while that post is still published
  const loadBlogPosts = useCallback(
    () =>
      listBlogPosts()
        .then((all) => {
          const published = all.filter((p) => p.status === "published");
          setBlogPosts(published);
          setSampleArticle((current) =>
            published.some((p) => p.handle === current) ? current : published[0]?.handle || ""
          );
        })
        .catch(() => setBlogPosts([])),
    []
  );

  useEffect(() => {
    loadBlogPosts();
  }, [loadBlogPosts]);

  // What the server last saved, to send only the changes
  const lastSavedRef = useRef(null);

  const saveRef = useRef({ timer: 0, saving: false, again: false, retryDelay: 2000, uploads: 0 });

  // Undo / redo: snapshots of the (immutable) theme data
  const historyRef = useRef({ past: [], future: [], lastKey: null, lastTime: 0 });

  const [, setHistoryTick] = useState(0);

  // Live preview: what the open preview shows, so only changed sections are re-rendered and patched in
  const syncRef = useRef({
    ready: false,
    queue: [],
    rendered: null,
    inflight: {},
    again: {},
    frame: 0,
    fullTimer: 0,
    gen: 0,
    images: {},
  });

  const engineRef = useRef({});

  // Synced sections: per section, the file version this editor last saw (to detect someone
  // else's change) and when its last change was made; preview updates waiting for the
  // preview's "patched" reply (timing); and whether the next save should go out quickly
  // templates: synced page templates by name, e.g. { index: "index" } (templates/index.liquid lists the Home page's sections)
  const syncedRef = useRef({
    sections: {},
    templates: {},
    quickSave: false,
    token: 0,
    waiting: {},
  });

  const templateNameOf = (pageName) =>
    Object.keys(syncedRef.current.templates).find(
      (name) => syncedRef.current.templates[name] === pageName
    );

  function syncedState(name) {
    const all = syncedRef.current.sections;
    all[name] = all[name] || { version: null, changedAt: 0, kind: "", savedChangeAt: 0 };
    return all[name];
  }

  useEffect(() => {
    Promise.all([
      getThemeSchema(),
      getThemeSettings(),
      getThemeCustomizer(),
      getSyncedSections().catch(() => ({})),
    ])
      .then(([schemaData, settingsData, customizerData, synced]) => {
        // A synced section's options come from its file's schema; its values from its saved JSON.
        // Only the sections this theme has a file for are edited (and saved) here.
        const sections = {};
        schemaData = { ...schemaData, sections: { ...schemaData.sections } };
        for (const [name, info] of Object.entries(synced || {})) {
          if (info.kind === "template") {
            syncedRef.current.templates[name] = info.page;
            syncedState(name).version = info.version;
            continue;
          }
          schemaData.sections[name] = info.spec;
          sections[name] = { type: name, ...info.values };
          syncedState(name).version = info.version;
        }
        settingsData = { ...settingsData };
        if (Object.keys(sections).length) settingsData.sections = sections;
        else delete settingsData.sections;
        lastSavedRef.current = { data: settingsData, customizer: customizerData };
        setSchema(schemaData);
        setData(settingsData);
        setCustomizer(customizerData);
        // A section from the address that this page no longer has: show the sections list
        setSelected((current) =>
          current === "theme" || settingsData.templates[pageRef.current]?.sections[current]
            ? current
            : null
        );
        setStatus("ready");
      })
      .catch((e) => {
        setError(e.message);
        setStatus("error");
      });
  }, []);

  // Products and collections only fill the pickers, so they load after the editor opens
  // instead of holding it up (the product list is the largest response).
  useEffect(() => {
    apiRequest("/api/v1/catalog/collections/")
      .then(setCollections)
      .catch(() => setCollections([]));
    apiRequest("/api/v1/catalog/products/")
      .then((productData) => {
        setProducts(productData);
        // The product from the address (a refresh) while it still exists, else the first active one
        setSampleProductId((current) =>
          current && productData.some((p) => p.id === current)
            ? current
            : productData.find((p) => p.status === "active")?.id || null
        );
      })
      .catch(() => setProducts([]));
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return undefined;

    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // The "Saved" message fades after a few seconds
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const previewUrl = useMemo(() => {
    if (!store?.storeSlug) return "";

    const base = `${API_URL}/s/${store.storeSlug}`;

    if (page === "product") {
      return sampleProductId ? `${base}/products/${sampleProductId}` : "";
    }

    if (page === "collection") {
      return `${base}/collections/${sampleCollection || "all"}`;
    }

    if (page === "blog") return `${base}/blog`;

    if (page === "article") return sampleArticle ? `${base}/blog/${sampleArticle}` : "";

    if (basePage(page) === "page") return samplePage ? `${base}/pages/${samplePage}` : "";

    return `${base}/`;
  }, [store, page, sampleProductId, sampleArticle, sampleCollection, samplePage]);

  // ---------------- Live preview (the page being edited) ----------------
  // The preview is rendered once; afterwards only the sections that changed are rendered
  // and swapped into the open page by message. Hide/delete/reorder happen inside the page.

  // Which page the preview renders (and, for the product page, which product)
  function previewTarget() {
    return {
      page: pageRef.current,
      product: pageRef.current === "product" ? sampleProductRef.current || "" : "",
      article: pageRef.current === "article" ? sampleArticleRef.current : "",
      collection: pageRef.current === "collection" ? sampleCollectionRef.current : "",
      handle: basePage(pageRef.current) === "page" ? samplePageRef.current : "",
    };
  }

  function visibleOrder(d) {
    const t = d.templates[pageRef.current];
    return t.order.filter((id) => !t.sections[id]?.hidden);
  }

  function snapshotOf(d) {
    const order = visibleOrder(d);
    const t = d.templates[pageRef.current];
    return {
      settings: JSON.stringify(d.settings),
      synced: Object.fromEntries(syncedNames(d).map((name) => [name, syncedJson(d, name)])),
      order,
      sections: Object.fromEntries(order.map((id) => [id, JSON.stringify(t.sections[id])])),
    };
  }

  function postToPreview(message) {
    const sync = syncRef.current;
    const win = iframeRef.current?.contentWindow;
    if (!sync.ready || !win) {
      sync.queue.push(message);
      return;
    }
    win.postMessage({ source: "tss-editor", ...message }, "*");
  }

  function renderFull() {
    const sync = syncRef.current;
    clearTimeout(sync.fullTimer);
    const d = dataRef.current;
    if (!d) return;
    // Another page was picked: nothing on screen can be patched until it is rendered
    if (sync.page !== pageRef.current) {
      sync.page = pageRef.current;
      sync.rendered = null;
    }
    const gen = ++sync.gen;
    previewTheme(d, {
      scroll: scrollRef.current,
      selected: selectedRef.current || "",
      ...previewTarget(),
    })
      .then((res) => {
        if (gen !== sync.gen) return;
        sync.rendered = snapshotOf(d);
        sync.ready = false;
        sync.queue = [];
        sync.inflight = {};
        sync.again = {};
        setPreviewHtml(res.html);
        setPreviewError("");
      })
      .catch((e) => setPreviewError(e.message));
  }

  // A synced section (header, footer): only it is rendered (one quick request) and swapped in
  function requestSynced(name) {
    const sync = syncRef.current;
    if (sync.inflight[name]) {
      sync.again[name] = true;
      return;
    }
    const d = dataRef.current;
    const requested = syncedJson(d, name);
    const gen = sync.gen;
    const state = syncedState(name);
    const meta = syncedRef.current;
    // Timed from the change to the preview's "patched" reply
    let token = "";
    if (state.changedAt) {
      token = String(++meta.token);
      meta.waiting[token] = {
        at: state.changedAt,
        kind: state.kind || `${name}: sidebar -> preview`,
        clock: state.clock,
      };
      state.changedAt = 0;
      state.kind = "";
    }
    sync.inflight[name] = true;

    previewTheme(d, { section: name, ...previewTarget() })
      .then((res) => {
        if (gen !== sync.gen || !sync.rendered) return;
        postToPreview({ type: "patch", id: name, html: res.html, index: Infinity, token });
        sync.rendered.synced = { ...sync.rendered.synced, [name]: requested };
        setPreviewError("");
      })
      .catch((e) => setPreviewError(e.message))
      .finally(() => {
        if (gen !== sync.gen) return;
        sync.inflight[name] = false;
        sync.again[name] = false;
        engineRef.current.scheduleSync();
      });
  }

  function requestSection(id) {
    if (isSynced(dataRef.current, id)) {
      requestSynced(id);
      return;
    }
    const sync = syncRef.current;
    if (sync.inflight[id]) {
      sync.again[id] = true;
      return;
    }
    const d = dataRef.current;
    const requested = JSON.stringify(d.templates[pageRef.current].sections[id]);
    const gen = sync.gen;
    sync.inflight[id] = true;

    previewTheme(d, { section: id, ...previewTarget() })
      .then((res) => {
        if (gen !== sync.gen || !sync.rendered) return;
        const order = visibleOrder(dataRef.current);
        const index = order.indexOf(id);
        if (index < 0) return;
        postToPreview({ type: "fonts", html: res.fonts });
        postToPreview({ type: "patch", id, html: res.html, index });
        sync.rendered.sections[id] = requested;
        if (!sync.rendered.order.includes(id)) {
          sync.rendered.order = order.filter((x) => x === id || sync.rendered.order.includes(x));
        }
        setPreviewError("");
      })
      .catch((e) => setPreviewError(e.message))
      .finally(() => {
        if (gen !== sync.gen) return;
        sync.inflight[id] = false;
        sync.again[id] = false;
        engineRef.current.scheduleSync();
      });
  }

  function syncPreview() {
    const sync = syncRef.current;
    sync.frame = 0;
    const d = dataRef.current;
    const before = sync.rendered;
    if (!d || !before || sync.page !== pageRef.current) return;

    // Edit mode off, a link opened another store page in the preview: show Home with the change
    if (sync.away) {
      sync.away = false;
      setPreviewKey((k) => k + 1);
      return;
    }

    const now = snapshotOf(d);

    // Theme-wide settings (fonts, colours) change the whole page: re-render it, briefly debounced
    if (now.settings !== before.settings) {
      clearTimeout(sync.fullTimer);
      sync.fullTimer = setTimeout(() => engineRef.current.renderFull(), 250);
      return;
    }

    // A synced section (header, footer) changed: just it is re-rendered and swapped in
    for (const name of Object.keys(now.synced)) {
      if (now.synced[name] !== before.synced?.[name]) requestSection(name);
    }

    // The default layout shows when there are no sections: switching to or from it needs a full render
    if (!now.order.length || !before.order.length) {
      if (now.order.length !== before.order.length) renderFull();
      return;
    }

    // A reorder or removal on a synced template's page is timed until the preview shows it
    const templateName = templateNameOf(pageRef.current);
    const takeToken = () => {
      const state = templateName && syncedState(templateName);
      if (!state?.changedAt) return "";
      // A mark left by a change that moved nothing (e.g. showing a hidden section) is not timed later
      if (state.clock === "perf" && performance.now() - state.changedAt > 5000) {
        state.changedAt = 0;
        return "";
      }
      const meta = syncedRef.current;
      const token = String(++meta.token);
      meta.waiting[token] = { at: state.changedAt, kind: state.kind, clock: state.clock };
      state.changedAt = 0;
      return token;
    };

    before.order
      .filter((id) => !now.order.includes(id))
      .forEach((id) => {
        postToPreview({ type: "remove", id, token: takeToken() });
        delete before.sections[id];
      });
    before.order = before.order.filter((id) => now.order.includes(id));

    now.order.forEach((id) => {
      if (before.sections[id] !== now.sections[id]) requestSection(id);
    });

    const existing = now.order.filter((id) => before.order.includes(id));
    if (existing.join("|") !== before.order.join("|")) {
      postToPreview({ type: "order", ids: existing, token: takeToken() });
      before.order = existing;
    }
  }

  // At most one preview update per animation frame
  function scheduleSync() {
    const sync = syncRef.current;
    if (!sync.frame) sync.frame = requestAnimationFrame(syncPreview);
  }

  // A picked image shows in the preview straight away, before its upload finishes
  function registerPendingImage(url, dataUrl) {
    syncRef.current.images[url] = dataUrl;
    postToPreview({ type: "pending-image", url, dataUrl });
  }

  // ---------------- Autosave ----------------

  function diffForSave(before, after) {
    const changes = {};
    if (JSON.stringify(before.settings) !== JSON.stringify(after.settings))
      changes.settings = after.settings;
    // Synced sections are saved on their own path, which also writes them into sections/<name>.liquid
    for (const name of syncedNames(after)) {
      if (syncedJson(before, name) === syncedJson(after, name)) continue;
      const state = syncedState(name);
      changes.sections = { ...changes.sections, [name]: syncedForSave(after.sections[name]) };
      changes.section_versions = { ...changes.section_versions, [name]: state.version };
      changes.client = SYNC_CLIENT;
      changes.started_at = Math.min(
        changes.started_at || Infinity,
        state.savedChangeAt || Date.now()
      );
    }
    for (const name of Object.keys(after.templates)) {
      const a = before.templates[name] || { order: [], sections: {} };
      const b = after.templates[name];
      const sections = {};
      for (const id of Object.keys(b.sections)) {
        if (JSON.stringify(a.sections[id]) !== JSON.stringify(b.sections[id]))
          sections[id] = b.sections[id];
      }
      for (const id of Object.keys(a.sections)) {
        if (!(id in b.sections)) sections[id] = null;
      }
      if (a.order.join("|") !== b.order.join("|") || Object.keys(sections).length) {
        changes.templates = changes.templates || {};
        changes.templates[name] = {
          order: b.order,
          ...(Object.keys(sections).length ? { sections } : {}),
        };
        // A synced template (templates/index.liquid): its file follows, unless Edit code changed it meanwhile
        const templateName = templateNameOf(name);
        if (templateName && templateLines(a) !== templateLines(b)) {
          const state = syncedState(templateName);
          changes.section_versions = { ...changes.section_versions, [templateName]: state.version };
          changes.client = SYNC_CLIENT;
          changes.started_at = Math.min(
            changes.started_at || Infinity,
            state.savedChangeAt || Date.now()
          );
        }
      }
    }
    return Object.keys(changes).length ? changes : null;
  }

  async function flushSave() {
    const state = saveRef.current;
    clearTimeout(state.timer);
    if (!lastSavedRef.current || !dataRef.current) return;
    if (state.saving) {
      state.again = true;
      return;
    }
    // Wait for image uploads, so a temporary local image is never saved
    if (state.uploads > 0) {
      state.timer = setTimeout(() => engineRef.current.flushSave(), 600);
      return;
    }

    const snapshot = dataRef.current;
    const customizerNow = customizerRef.current;
    const changes = diffForSave(lastSavedRef.current.data, snapshot);
    const customizerChanged =
      JSON.stringify(customizerNow) !== JSON.stringify(lastSavedRef.current.customizer);

    if (!changes && !customizerChanged) {
      setSaveState("saved");
      return;
    }

    state.saving = true;
    setSaveState("saving");

    try {
      const [saved] = await Promise.all([
        changes ? patchThemeSettings(changes) : null,
        customizerChanged ? saveThemeCustomizer(customizerNow) : null,
      ]);
      for (const [name, result] of Object.entries({
        ...(saved?.sections || {}),
        ...(saved?.templates || {}),
      })) {
        const state = syncedState(name);
        state.version = result.version;
        state.savedChangeAt = 0;
        // Someone changed the section's code meanwhile: this change won, and they are told where theirs is
        if (result.conflict) setNotice(result.conflict);
      }
      lastSavedRef.current = { data: snapshot, customizer: customizerNow };
      // Tell an open code editor tab: it shows these settings as JSON
      announceThemeChange("settings");
      state.retryDelay = 2000;
      setSaveError("");
      if (dataRef.current !== snapshot || customizerRef.current !== customizerNow || state.again) {
        state.again = false;
        state.timer = setTimeout(() => engineRef.current.flushSave(), 300);
      } else {
        setSaveState("saved");
      }
    } catch (e) {
      setSaveError(e.message);
      if (e.status === 400) {
        // The data itself was refused; retrying won't help. Edits stay; Undo is offered.
        setSaveState("invalid");
      } else {
        setSaveState("error");
        state.timer = setTimeout(() => engineRef.current.flushSave(), state.retryDelay);
        state.retryDelay = Math.min(state.retryDelay * 2, 30000);
      }
    } finally {
      state.saving = false;
    }
  }

  function scheduleSave(delay = 900) {
    const state = saveRef.current;
    clearTimeout(state.timer);
    setSaveState((current) => (current === "saving" ? current : "pending"));
    state.timer = setTimeout(() => engineRef.current.flushSave(), delay);
  }

  // The code editor (another tab) saved something: Liquid code re-renders the preview;
  // settings JSON is loaded here, unless there are unsaved edits that it would overwrite.
  // A blog post was saved or deleted (Blog posts page): reload the posts, then the preview.
  async function externalChange(kind) {
    // A synced section's file was saved in Edit code (another tab): only that section is updated
    if (kind.startsWith("section:")) {
      const name = kind.slice("section:".length);
      try {
        const info = (await getSyncedSections())?.[name];
        if (info && info.version !== syncedState(name).version) {
          sectionEvent({ section: name, source: "code", ...info, kind: info.kind });
        }
      } catch {
        // the live event (or the next reload) brings it
      }
      return;
    }
    if (kind === "posts") {
      await loadBlogPosts();
      setPreviewKey((k) => k + 1);
      return;
    }
    // A page was saved or deleted (Pages screen)
    if (kind === "pages") {
      await loadStorePages();
      await syncPageTemplates().catch(() => {});
      setPreviewKey((k) => k + 1);
      return;
    }
    if (kind !== "settings") {
      setPreviewKey((k) => k + 1);
      return;
    }
    if (saveStateRef.current !== "saved" || saveRef.current.saving) {
      setNotice(
        "The code editor changed the settings. Your edits here are still saving; reload to see its changes."
      );
      return;
    }
    try {
      const fresh = { ...(await getThemeSettings()) };
      if (saveStateRef.current !== "saved") return;
      // Synced sections keep their own shape (and are updated by their own events)
      const synced = dataRef.current?.sections;
      if (synced) fresh.sections = synced;
      else delete fresh.sections;
      lastSavedRef.current = { data: fresh, customizer: customizerRef.current };
      historyRef.current = { past: [], future: [], lastKey: null, lastTime: 0 };
      dataRef.current = fresh;
      setData(fresh);
      setHistoryTick((t) => t + 1);
      // A page template deleted in the code editor: back to Page
      if (!fresh.templates[pageRef.current]) setPage("page");
      const open = selectedRef.current;
      if (open && open !== "theme" && !fresh.templates[pageRef.current]?.sections[open]) {
        setSelected(null);
        setSelectedBlock(null);
      }
      setPreviewKey((k) => k + 1);
      setNotice("Updated from the code editor.");
    } catch {
      // the next save or reload reports a problem
    }
  }

  // Synced sections that appeared after the customizer opened (e.g. a theme got sections/header.liquid):
  // they are added to the panel, the saved state and the undo history - nothing is saved back.
  function addSyncedSections(found) {
    const current = dataRef.current;
    const saved = lastSavedRef.current;
    const added = Object.entries(found || {}).filter(
      ([name, info]) => info?.spec && info?.values && !isSynced(current, name)
    );
    if (!current || !saved || !added.length) return [];
    const values = {};
    for (const [name, info] of added) {
      values[name] = { type: name, ...info.values };
      syncedState(name).version = info.version;
    }
    const withThem = (d) => ({ ...d, sections: { ...(d.sections || {}), ...values } });
    setSchema((sc) =>
      sc
        ? {
            ...sc,
            sections: {
              ...sc.sections,
              ...Object.fromEntries(added.map(([name, info]) => [name, info.spec])),
            },
          }
        : sc
    );
    // Undo/redo snapshots get them too, so going back never drops the section from the sidebar
    const history = historyRef.current;
    history.past = history.past.map(withThem);
    history.future = history.future.map(withThem);
    lastSavedRef.current = { ...saved, data: withThem(saved.data) };
    const next = withThem(current);
    dataRef.current = next;
    setData(next);
    return added.map(([name]) => name);
  }

  // The preview asked for a section this customizer doesn't know: if the server has it as a
  // synced section, add it and select it
  async function selectUnknownSection(id, block) {
    try {
      addSyncedSections(await getSyncedSections());
    } catch {
      return; // offline: the click does nothing, as before
    }
    if (!isSynced(dataRef.current, id) || !editModeRef.current) return;
    fromPreviewRef.current = true;
    pendingBlockRef.current =
      Number.isInteger(block) && dataRef.current.sections[id].blocks?.[block] ? block : null;
    setSelected(id);
  }

  // A synced section changed elsewhere (Edit code, a restore, or this editor in another tab):
  // its options and values are replaced here and its preview re-rendered - nothing is saved back.
  // Edit code saved a synced template (or it was restored): the page's sections follow its lines,
  // and the preview moves, adds or removes sections in place
  function templateEvent(event) {
    const name = event.section;
    const pageName = event.page;
    const current = dataRef.current;
    const saved = lastSavedRef.current;
    if (!event.template || !pageName || !current?.templates?.[pageName] || !saved) return;
    syncedRef.current.templates[name] = pageName;
    const state = syncedState(name);
    if (state.version !== null && event.version <= state.version && event.source !== "restore")
      return;
    state.version = event.version;
    const label = pageLabel(pageName);

    if (
      JSON.stringify(current.templates[pageName]) !== JSON.stringify(saved.data.templates[pageName])
    ) {
      setNotice(
        `The ${label.toLowerCase()}'s sections were changed in Edit code. Your change here is being saved on top; ` +
          "the code editor's version is in its History."
      );
      return;
    }
    if (JSON.stringify(event.template) === JSON.stringify(current.templates[pageName])) return;
    const withIt = (d) => ({ ...d, templates: { ...d.templates, [pageName]: event.template } });
    lastSavedRef.current = { ...saved, data: withIt(saved.data) };
    if (
      event.source !== "customizer" &&
      event.started_at &&
      Date.now() - event.started_at < 60000
    ) {
      state.changedAt = Number(event.started_at);
      state.kind = `${name}: code save -> preview`;
      state.clock = "epoch";
    }
    const next = withIt(current);
    dataRef.current = next;
    setData(next);
    const open = selectedRef.current;
    if (
      pageRef.current === pageName &&
      open &&
      open !== "theme" &&
      !isSynced(next, open) &&
      !event.template.sections[open]
    ) {
      setSelected(null);
      setSelectedBlock(null);
    }
    if (event.source === "code") setNotice(`${label} sections updated from Edit code.`);
    else if (event.source === "restore")
      setNotice(`An earlier ${label.toLowerCase()} version was restored.`);
  }

  function sectionEvent(event) {
    if (event.kind === "template") {
      templateEvent(event);
      return;
    }
    const name = event.section;
    const current = dataRef.current;
    const saved = lastSavedRef.current;
    if (!event.values || !saved) return;
    if (!isSynced(current, name)) {
      addSyncedSections({ [name]: event });
      return;
    }
    const state = syncedState(name);
    if (state.version !== null && event.version <= state.version && event.source !== "restore")
      return;
    state.version = event.version;
    const label = event.spec?.name || name;

    if (event.spec) {
      setSchema((s) => (s ? { ...s, sections: { ...s.sections, [name]: event.spec } } : s));
    }

    const incoming = { type: name, ...event.values };
    const unsaved = syncedJson(current, name) !== syncedJson(saved.data, name);
    if (unsaved) {
      // Both changed it: the edit here is saved on top (latest wins); theirs stays in the file's History
      setNotice(
        event.source === "customizer"
          ? `The ${label.toLowerCase()} was changed in another tab. Your change here is being saved on top of it.`
          : `The ${label.toLowerCase()}'s code was changed in Edit code. Your change here is being saved on top; the code editor's version is in its History.`
      );
      return;
    }

    if (JSON.stringify(incoming) === syncedJson(current, name)) return;
    const next = { ...current, sections: { ...current.sections, [name]: incoming } };
    lastSavedRef.current = {
      ...saved,
      data: { ...saved.data, sections: { ...(saved.data.sections || {}), [name]: incoming } },
    };
    // Timed until the preview shows it (from the moment Save was pressed in Edit code)
    if (
      event.source !== "customizer" &&
      event.started_at &&
      Date.now() - event.started_at < 60000
    ) {
      state.changedAt = Number(event.started_at);
      state.kind = `${name}: code save -> preview`;
      state.clock = "epoch";
    }
    dataRef.current = next;
    setData(next);
    if (
      selectedRef.current === name &&
      selectedBlockRef.current !== null &&
      !incoming.blocks?.[selectedBlockRef.current]
    ) {
      setSelectedBlock(null);
    }
    if (event.source === "code") setNotice(`${label} updated from Edit code.`);
    else if (event.source === "restore")
      setNotice(`An earlier ${label.toLowerCase()} version was restored.`);
  }

  useLayoutEffect(() => {
    engineRef.current = {
      renderFull,
      scheduleSync,
      flushSave,
      registerPendingImage,
      postToPreview,
      externalChange,
      sectionEvent,
      selectUnknownSection,
      addSyncedSections,
    };
  });

  useEffect(() => onThemeChange((kind) => engineRef.current.externalChange(kind)), []);

  // Live events from the server: a change to a synced section made in Edit code or another editor
  const hasSynced =
    syncedNames(data).length > 0 || Object.keys(syncedRef.current.templates).length > 0;

  // Coming back to this tab: pick up synced sections added meanwhile (their rows open their panels)
  useEffect(() => {
    if (status !== "ready") return undefined;
    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      getSyncedSections()
        .then((found) => engineRef.current.addSyncedSections(found))
        .catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status]);
  useEffect(() => {
    if (status !== "ready" || !hasSynced) return undefined;
    return subscribeThemeEvents((event) => engineRef.current.sectionEvent(event));
  }, [status, hasSynced]);

  // ---------------- Changes and history ----------------

  // A synced section's change shows in the preview at once and is saved after a short pause (200 ms)
  const markSyncedChanges = useCallback((before, after) => {
    const synced = syncedRef.current;
    const mark = (name) => {
      const state = (synced.sections[name] ||= {
        version: null,
        changedAt: 0,
        kind: "",
        savedChangeAt: 0,
      });
      state.changedAt = performance.now();
      state.kind = `${name}: sidebar -> preview`;
      state.clock = "perf";
      state.savedChangeAt = Date.now();
      synced.quickSave = true;
    };
    for (const [name, pageName] of Object.entries(synced.templates)) {
      if (
        templateLines(before?.templates?.[pageName]) !== templateLines(after?.templates?.[pageName])
      )
        mark(name);
    }
    for (const name of syncedNames(after)) {
      if (syncedJson(before, name) !== syncedJson(after, name)) mark(name);
    }
  }, []);

  // Every change goes through here: local state first, then the preview and autosave follow.
  // Quick repeated changes to the same option (typing, dragging a slider) become one undo step.
  const update = useCallback(
    (mutator, coalesceKey) => {
      const current = dataRef.current;
      if (!current) return;
      const history = historyRef.current;
      const now = Date.now();
      if (!(coalesceKey && history.lastKey === coalesceKey && now - history.lastTime < 800)) {
        history.past.push(current);
        if (history.past.length > 100) history.past.shift();
      }
      history.future = [];
      history.lastKey = coalesceKey || null;
      history.lastTime = now;
      const next = structuredClone(current);
      mutator(next);
      markSyncedChanges(current, next);
      dataRef.current = next;
      setData(next);
      setHistoryTick((t) => t + 1);
    },
    [markSyncedChanges]
  );

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (!history.past.length) return;
    history.future.push(dataRef.current);
    const previous = history.past.pop();
    history.lastKey = null;
    markSyncedChanges(dataRef.current, previous);
    dataRef.current = previous;
    setData(previous);
    setHistoryTick((t) => t + 1);
  }, [markSyncedChanges]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    if (!history.future.length) return;
    history.past.push(dataRef.current);
    const next = history.future.pop();
    history.lastKey = null;
    markSyncedChanges(dataRef.current, next);
    dataRef.current = next;
    setData(next);
    setHistoryTick((t) => t + 1);
  }, [markSyncedChanges]);

  // A finished upload replaces its temporary image everywhere (current data and undo history)
  function replaceImage(from, to) {
    const swap = (d) => {
      const text = JSON.stringify(d);
      return text.includes(from)
        ? JSON.parse(
            text.split(JSON.stringify(from).slice(1, -1)).join(JSON.stringify(to).slice(1, -1))
          )
        : d;
    };
    const history = historyRef.current;
    history.past = history.past.map(swap);
    history.future = history.future.map(swap);
    const next = swap(dataRef.current);
    if (next !== dataRef.current) {
      dataRef.current = next;
      setData(next);
    }
  }

  const uploads = useMemo(
    () => ({
      registerPendingImage: (url, dataUrl) => engineRef.current.registerPendingImage(url, dataUrl),
      begin: () => {
        saveRef.current.uploads += 1;
      },
      end: () => {
        saveRef.current.uploads = Math.max(0, saveRef.current.uploads - 1);
      },
      replace: (from, to) => engineRef.current.replaceImage(from, to),
    }),
    []
  );

  useLayoutEffect(() => {
    engineRef.current.replaceImage = replaceImage;
  });

  // Full render when the preview first opens, the page (or the product or article it shows) changes or Refresh is pressed
  useEffect(() => {
    if (status === "ready") engineRef.current.renderFull();
  }, [status, page, previewKey, sampleArticle, sampleProductId, sampleCollection, samplePage]);

  // The address remembers the page, its product or post, and the open section (a refresh shows them again)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const put = (key, value) => (value ? params.set(key, value) : params.delete(key));
    put("page", page === "index" ? "" : page);
    put("product", page === "product" ? sampleProductId : "");
    put("article", page === "article" ? sampleArticle : "");
    put("collection", page === "collection" ? sampleCollection : "");
    put("handle", basePage(page) === "page" ? samplePage : "");
    put("section", selected);
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`
    );
  }, [page, sampleProductId, sampleArticle, sampleCollection, samplePage, selected]);

  // A store link followed in the preview ("/products/<id>", "/collections/all", "/blog/<handle>", "/"):
  // open that page's own template here. In Edit mode its main section (e.g. Product information) is
  // selected; with Edit mode Off nothing is selected. The page it came from is kept for "Back".
  function openStorePage(path) {
    const [first, second, third] = path.split("/").filter(Boolean);
    let next = "index";
    if (first === "products" && second) next = "product";
    else if (first === "collections") next = "collection";
    else if (first === "blog") next = second && !third ? "article" : "blog";
    else if (first === "pages" && second) next = "page";
    if (!dataRef.current?.templates[next]) return;

    setBackStack((stack) => [
      ...stack.slice(-19),
      {
        page: pageRef.current,
        selected: selectedRef.current,
        product: sampleProductRef.current,
        article: sampleArticleRef.current,
        collection: sampleCollectionRef.current,
        handle: samplePageRef.current,
      },
    ]);
    if (next === "collection") setSampleCollection(second && second !== "all" ? second : "");
    if (next === "product") setSampleProductId(second);
    if (next === "article") setSampleArticle(second);
    if (next === "page") setSamplePage(second);

    const template = dataRef.current.templates[next];
    const main =
      template.order.find((id) => template.sections[id]?.type === MAIN_SECTION[basePage(next)]) ||
      null;
    setPage(next);
    setAdding(false);
    // Only select the main section when Edit mode is already on; with it Off nothing gets selected
    setSelected(editModeRef.current ? main : null);
  }

  // "Back": the page (and section) open before the last store link was followed
  function goBack() {
    const previous = backStack[backStack.length - 1];
    if (!previous) return;
    setBackStack((stack) => stack.slice(0, -1));
    if (previous.product) setSampleProductId(previous.product);
    if (previous.article) setSampleArticle(previous.article);
    if (previous.page === "collection") setSampleCollection(previous.collection || "");
    if (previous.handle) setSamplePage(previous.handle);
    setPage(previous.page);
    setAdding(false);
    setSelected(
      previous.selected && dataRef.current?.templates[previous.page]?.sections[previous.selected]
        ? previous.selected
        : null
    );
  }

  useLayoutEffect(() => {
    engineRef.current.openStorePage = openStorePage;
  });

  // Each change: patch the preview (next frame) and schedule a background save
  useEffect(() => {
    if (status !== "ready") return;
    engineRef.current.scheduleSync();
    const quick = syncedRef.current.quickSave;
    syncedRef.current.quickSave = false;
    scheduleSave(quick ? 200 : 900);
  }, [data, customizer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selecting a section or block only moves the outline in the preview (shown in Edit mode);
  // picked in the sections list, the preview also scrolls to it
  useEffect(() => {
    const scroll = !fromPreviewRef.current;
    fromPreviewRef.current = false;
    engineRef.current.postToPreview({
      type: "select",
      id: selected || "",
      block: selectedBlock,
      scroll,
    });
  }, [selected, selectedBlock]);

  // Edit mode on/off: just a message, the preview is not reloaded
  useEffect(() => {
    const sync = syncRef.current;
    if (editMode && sync.away) {
      // The preview shows another store page (a link was followed): back to Home to edit it
      sync.away = false;
      setPreviewKey((k) => k + 1);
      return;
    }
    engineRef.current.postToPreview({ type: "mode", edit: editMode });
  }, [editMode]);

  // Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Ctrl+Y), except while typing in a field
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const el = e.target;
      if (el.closest?.("input,textarea,select,[contenteditable=true],[contenteditable='']")) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Move section `id` before or after `targetId` on the current page
  const moveSectionTo = useCallback(
    (pageName, id, targetId, after) => {
      update((d) => {
        const t = d.templates[pageName];

        if (!t.sections[id] || !t.sections[targetId] || id === targetId) return;

        const order = t.order.filter((s) => s !== id);

        order.splice(order.indexOf(targetId) + (after ? 1 : 0), 0, id);

        t.order = order;
      });
    },
    [update]
  );

  // Messages from the preview: drag a section there, click to select it, keep the scroll position
  useEffect(() => {
    function onMessage(event) {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

      const message = event.data;

      if (!message || message.source !== "tss-preview") return;

      if (message.type !== "context" && message.type !== "scroll") setContextMenu(null);

      if (message.type === "ready") {
        // The preview loaded: send what was waiting, re-send local images, then catch up with edits
        const sync = syncRef.current;
        sync.ready = true;
        const waiting = sync.queue;
        sync.queue = [];
        sync.away = false;
        Object.entries(sync.images).forEach(([url, dataUrl]) =>
          waiting.unshift({ type: "pending-image", url, dataUrl })
        );
        waiting.push({ type: "mode", edit: editModeRef.current });
        waiting.push({
          type: "select",
          id: selectedRef.current || "",
          block: selectedBlockRef.current,
        });
        waiting.forEach((m) => event.source.postMessage({ source: "tss-editor", ...m }, "*"));
        engineRef.current.scheduleSync();
      } else if (message.type === "patched") {
        // A section swap the customizer timed: "change made -> preview updated"
        const waiting = syncedRef.current.waiting[message.token];
        if (waiting) {
          delete syncedRef.current.waiting[message.token];
          const ms =
            waiting.clock === "epoch" ? Date.now() - waiting.at : performance.now() - waiting.at;
          if (ms >= 0) postSyncTiming(waiting.kind, ms);
        }
      } else if (message.type === "need-reload") {
        engineRef.current.renderFull();
      } else if (message.type === "scroll") {
        scrollRef.current = Math.max(0, Number(message.y) || 0);
      } else if (message.type === "navigate" && typeof message.path === "string") {
        // A product, collection, blog or post link was clicked: open that page's template here
        engineRef.current.openStorePage(message.path);
      } else if (message.type === "leaving") {
        // Edit mode off and a link was followed: the editor page is gone until the preview reloads
        syncRef.current.ready = false;
        syncRef.current.away = true;
      } else if (
        message.type === "context" &&
        typeof message.id === "string" &&
        editModeRef.current
      ) {
        // Edit mode: right-click selects the section or block and offers "Edit code"
        const section = dataRef.current && sectionIn(dataRef.current, pageRef.current, message.id);
        if (!section) {
          if (message.id) engineRef.current.selectUnknownSection(message.id, message.block);
          return;
        }
        const block =
          Number.isInteger(message.block) && section.blocks?.[message.block] ? message.block : null;
        fromPreviewRef.current = true;
        if (message.id === selectedRef.current) {
          setSelectedBlock(block);
        } else {
          pendingBlockRef.current = block;
          setSelected(message.id);
        }
        const frame = iframeRef.current.getBoundingClientRect();
        setContextMenu({
          x: frame.left + (Number(message.x) || 0),
          y: frame.top + (Number(message.y) || 0),
          // A custom section has no file of its own: it lives in the page template
          file:
            section.type === "custom"
              ? "templates/index.liquid"
              : `sections/${section.type}.liquid`,
        });
        return;
      } else if (
        message.type === "select" &&
        typeof message.id === "string" &&
        editModeRef.current
      ) {
        // Edit mode: a click in the preview selects a section or one of its blocks; empty space unselects
        const section = dataRef.current && sectionIn(dataRef.current, pageRef.current, message.id);
        const block =
          Number.isInteger(message.block) && section?.blocks?.[message.block]
            ? message.block
            : null;
        fromPreviewRef.current = true;
        if (!message.id) {
          setSelected(null);
        } else if (section && message.id === selectedRef.current) {
          setSelectedBlock(block);
        } else if (section) {
          pendingBlockRef.current = block;
          setSelected(message.id);
        } else {
          // Not in this customizer yet (e.g. a synced section added after it opened)
          engineRef.current.selectUnknownSection(message.id, message.block);
        }
      } else if (message.type === "escape" && editModeRef.current) {
        setSelectedBlock(null);
        setSelected(null);
      } else if (
        message.type === "move-section" &&
        typeof message.id === "string" &&
        typeof message.target === "string"
      ) {
        moveSectionTo(pageRef.current, message.id, message.target, Boolean(message.after));
      }
    }

    window.addEventListener("message", onMessage);

    return () => window.removeEventListener("message", onMessage);
  }, [moveSectionTo]);

  // The menu closes on a click or Escape anywhere in the customizer (clicks in the preview are messages)
  useEffect(() => {
    if (!contextMenu) return undefined;
    const close = () => setContextMenu(null);
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  // A new section starts at the top with no block open (or the block clicked in the preview)
  useEffect(() => {
    setSelectedBlock(pendingBlockRef.current);
    pendingBlockRef.current = null;

    if (!selected) return;

    if (editScrollRef.current) editScrollRef.current.scrollTop = 0;

    setPanelOpen(true);
  }, [selected]);

  useEffect(() => {
    if (selectedBlock !== null && blockScrollRef.current) blockScrollRef.current.scrollTop = 0;
  }, [selectedBlock]);

  // Escape steps back: block -> section -> sections list
  useEffect(() => {
    if (!selected) return undefined;

    const onKey = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (selectedBlock !== null) setSelectedBlock(null);
      else setSelected(null);
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [selected, selectedBlock]);

  const template = data?.templates[page];

  // Alternate page templates the store has: every "page.<name>" in its templates
  const pageTemplateKeys = Object.keys(data?.templates || {})
    .filter((key) => PAGE_TEMPLATE_KEY.test(key))
    .sort();

  // Page templates added or deleted elsewhere (a new one, or the code editor) join / leave the open
  // data, its undo history and the saved copy, without touching edits made here
  async function syncPageTemplates() {
    const fresh = await getThemeSettings();
    const current = dataRef.current;
    if (!current) return;
    const wanted = Object.keys(fresh.templates).filter((key) => PAGE_TEMPLATE_KEY.test(key));
    const have = Object.keys(current.templates).filter((key) => PAGE_TEMPLATE_KEY.test(key));
    const added = wanted.filter((key) => !current.templates[key]);
    const gone = have.filter((key) => !fresh.templates[key]);
    if (!added.length && !gone.length) return;
    const apply = (d) => {
      const templates = { ...d.templates };
      added.forEach((key) => (templates[key] = fresh.templates[key]));
      gone.forEach((key) => delete templates[key]);
      return { ...d, templates };
    };
    const history = historyRef.current;
    history.past = history.past.map(apply);
    history.future = history.future.map(apply);
    lastSavedRef.current = { ...lastSavedRef.current, data: apply(lastSavedRef.current.data) };
    const next = apply(current);
    dataRef.current = next;
    setData(next);
    if (gone.includes(pageRef.current)) {
      setPage("page");
      setSelected(null);
    }
  }

  // "+ Add page template...": a copy of Page, as templates/page.<name>.liquid and .json in the code editor
  async function addPageTemplate() {
    const name = window.prompt("Name of the new page template (e.g. size guide)");
    if (!name || !name.trim()) return;
    try {
      const { key } = await createPageTemplate(name.trim());
      await syncPageTemplates();
      setPage(key);
      setSelected(null);
      setAdding(false);
      setBackStack([]);
      announceThemeChange("settings");
    } catch (e) {
      setError(e.message || "Could not create the template.");
    }
  }

  async function deletePageTemplate(key) {
    if (!window.confirm(`Delete the ${pageLabel(key)} template? Its pages go back to Page.`))
      return;
    try {
      await deleteThemePath(`templates/${key}.liquid`);
      await syncPageTemplates();
      await loadStorePages();
      setPreviewKey((k) => k + 1);
      announceThemeChange("settings");
    } catch (e) {
      setError(e.message || "Could not delete the template.");
    }
  }

  function moveSection(id, delta) {
    update((d) => {
      const order = d.templates[page].order;

      const i = order.indexOf(id);

      const j = i + delta;

      if (j < 0 || j >= order.length) return;

      [order[i], order[j]] = [order[j], order[i]];
    });
  }

  function insertSection(section) {
    if (template.order.length >= MAX_SECTIONS) {
      setError(`A page can have up to ${MAX_SECTIONS} sections.`);
      return null;
    }

    const id = newSectionId(section.type);

    update((d) => {
      d.templates[page].sections[id] = section;
      d.templates[page].order.push(id);
    });

    setSelected(id);

    return id;
  }

  // A blank, named section the owner fills with blocks (the default)
  function addCustomSection() {
    const name = newName.trim();

    if (!name) return;

    const spec = schema.sections.custom;

    insertSection({
      type: "custom",
      hidden: false,
      settings: { ...defaultsOf(spec.settings), heading: name },
      blocks: [],
    });

    setNewName("");
    setAdding(false);
  }

  // Quick start from one of the ready-made section types
  function addTemplateSection(type) {
    const spec = schema.sections[type];

    const settings = defaultsOf(spec.settings);

    if (newName.trim() && "heading" in settings) settings.heading = newName.trim();

    insertSection({
      type,
      hidden: false,
      settings,
      ...(spec.blocks ? { blocks: [] } : {}),
    });

    setNewName("");
    setAdding(false);
  }

  function duplicateSection(id) {
    if (template.order.length >= MAX_SECTIONS) {
      setError(`A page can have up to ${MAX_SECTIONS} sections.`);
      return;
    }

    const copyId = newSectionId(template.sections[id].type);

    update((d) => {
      const t = d.templates[page];

      const copy = structuredClone(t.sections[id]);

      if (copy.type === "custom" && copy.settings.heading) copy.settings.heading += " (copy)";

      t.sections[copyId] = copy;

      t.order.splice(t.order.indexOf(id) + 1, 0, copyId);
    });

    setSelected(copyId);
  }

  function startRename(id) {
    setRenaming(id);
    setRenameValue(template.sections[id].settings.heading || "");
  }

  function finishRename() {
    const id = renaming;

    setRenaming(null);

    if (!id || renameValue.trim() === (template.sections[id]?.settings.heading || "")) return;

    update((d) => {
      d.templates[page].sections[id].settings.heading = renameValue.trim();
    });
  }

  function updateBlocks(sectionId, mutate, coalesceKey) {
    update((d) => {
      const s = sectionIn(d, page, sectionId);
      s.blocks = s.blocks || [];
      mutate(s.blocks);
    }, coalesceKey);
  }

  function duplicateBlock(sectionId, index) {
    const target = sectionIn(data, page, sectionId);

    const max = schema.sections[target.type].max_blocks;

    if ((target.blocks || []).length >= max) return;

    updateBlocks(sectionId, (list) => list.splice(index + 1, 0, structuredClone(list[index])));
  }

  function toggleBlockHidden(sectionId, index) {
    updateBlocks(sectionId, (list) => {
      list[index].hidden = !list[index].hidden;
    });
  }

  function removeBlock(sectionId, index) {
    if (!window.confirm("Delete this block?")) return;

    updateBlocks(sectionId, (list) => list.splice(index, 1));

    setSelectedBlock(null);
  }

  // Every option back to its default; content blocks (and a custom section's name) are kept
  function resetSection(id) {
    if (
      !window.confirm(
        "Reset all options of this section to their defaults? Its content blocks are kept."
      )
    )
      return;

    update((d) => {
      const s = sectionIn(d, page, id);

      const defaults = defaultsOf(schema.sections[s.type].settings);

      if (s.type === "custom") defaults.heading = s.settings.heading;

      s.settings = defaults;
    });
  }

  function toggleHidden(id) {
    update((d) => {
      const s = d.templates[page].sections[id];

      s.hidden = !s.hidden;
    });
  }

  function removeSection(id) {
    if (!window.confirm("Delete this section? You can't undo this once you save.")) return;

    update((d) => {
      const t = d.templates[page];

      t.order = t.order.filter((s) => s !== id);

      delete t.sections[id];
    });

    if (selected === id) setSelected(null);
  }

  // Apply a finished drag
  function applyDrop(payload, target) {
    if (!target) return;

    update((d) => {
      const t = d.templates[page];

      if (payload.kind === "section") {
        if (target.kind !== "section" || target.id === payload.id) return;

        const order = t.order.filter((s) => s !== payload.id);

        order.splice(order.indexOf(target.id) + (target.after ? 1 : 0), 0, payload.id);

        t.order = order;

        return;
      }

      // A block: reorder inside its section, or move it into another section
      const from = sectionIn(d, page, payload.sectionId);

      const block = from?.blocks?.[payload.index];

      if (!block) return;

      const destinationId =
        target.kind === "block" ? target.sectionId : target.kind === "into" ? target.id : null;

      const destination = destinationId && sectionIn(d, page, destinationId);

      // A synced section's blocks stay in it (its block types are its own)
      if (destination !== from && (isSynced(d, payload.sectionId) || isSynced(d, destinationId)))
        return;

      // Only sections that accept this block type
      if (!destination || !schema.sections[destination.type].blocks?.[block.type]) return;

      const max = schema.sections[destination.type].max_blocks;

      if (destination !== from && (destination.blocks || []).length >= max) return;

      from.blocks.splice(payload.index, 1);

      destination.blocks = destination.blocks || [];

      if (target.kind === "block") {
        let to = target.index + (target.after ? 1 : 0);

        if (destination === from && payload.index < to) to -= 1;

        destination.blocks.splice(to, 0, block);
      } else {
        destination.blocks.push(block);
      }
    });
  }

  // Start a pointer drag (works for mouse, pen and touch)
  function startDrag(event, payload) {
    if (event.button !== undefined && event.button !== 0) return;

    event.preventDefault();

    let target = null;

    setDrag(payload);

    const move = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);

      const blockEl = el?.closest("[data-drop-block]");

      const sectionEl = el?.closest("[data-drop-section]");

      target = null;

      if (payload.kind === "block" && blockEl) {
        const [sectionId, index] = blockEl.dataset.dropBlock.split("|");

        const box = blockEl.getBoundingClientRect();

        target = {
          kind: "block",
          sectionId,
          index: Number(index),
          after: e.clientY > box.top + box.height / 2,
        };
      } else if (sectionEl) {
        const id = sectionEl.dataset.dropSection;

        const box = sectionEl.getBoundingClientRect();

        target =
          payload.kind === "section"
            ? { kind: "section", id, after: e.clientY > box.top + box.height / 2 }
            : id === payload.sectionId
              ? null
              : { kind: "into", id };
      }

      setDropTarget(target);
    };

    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);

      applyDrop(payload, target);

      setDrag(null);
      setDropTarget(null);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  if (!store) {
    return (
      <CenteredMessage>
        You need a store first.{" "}
        <Link className="underline" to="/auth/onboarding">
          Set one up
        </Link>
        .
      </CenteredMessage>
    );
  }

  if (status !== "ready") {
    return <CenteredMessage>{status === "loading" ? "Loading theme..." : error}</CenteredMessage>;
  }

  const templateTypes = Object.entries(schema.sections).filter(
    ([type, spec]) => spec.pages.includes(basePage(page)) && !spec.required && type !== "custom"
  );

  const section = selected && selected !== "theme" ? sectionIn(data, page, selected) : null;

  // Keep showing the last edited item while the panel slides back to the list
  const editing = selected === "theme" || Boolean(section);

  if (editing) lastShownRef.current = selected;

  const shown = editing ? selected : lastShownRef.current;

  const shownSection = shown && shown !== "theme" ? sectionIn(data, page, shown) : null;

  const shownSpec = shownSection ? schema.sections[shownSection.type] : null;

  const editTitle =
    shown === "theme"
      ? "Theme settings"
      : shownSection
        ? shownSection.settings.heading || shownSpec.name
        : "";

  // The open block (kept while the panel slides back to the section)
  const blockOpen =
    editing &&
    shownSection &&
    selectedBlock !== null &&
    Boolean(shownSection.blocks?.[selectedBlock]);

  if (blockOpen) lastBlockRef.current = selectedBlock;

  const shownBlockIndex = blockOpen ? selectedBlock : lastBlockRef.current;

  const shownBlock =
    shownSection && shownBlockIndex !== null ? shownSection.blocks?.[shownBlockIndex] : null;

  const shownBlockSpec = shownBlock ? shownSpec.blocks[shownBlock.type] : null;

  const panelView = !editing ? 0 : blockOpen ? 2 : 1;

  const editSubtitle =
    shown === "theme"
      ? "Colours, fonts, buttons, header and footer"
      : shownSpec
        ? shownSpec.name
        : "";

  // While a block is dragged, other sections that accept it are shown as drop targets
  const blockTargets =
    drag?.kind === "block" && shownSection
      ? template.order.filter((id) => {
          const target = template.sections[id];
          const moving = template.sections[drag.sectionId]?.blocks?.[drag.index];
          return (
            id !== drag.sectionId && moving && schema.sections[target.type].blocks?.[moving.type]
          );
        })
      : [];

  return (
    <FontsContext.Provider value={schema.fonts || []}>
      <StorePagesContext.Provider value={storePages}>
        <BlogPostsContext.Provider value={blogPosts}>
          <UploadsContext.Provider value={uploads}>
            <div
              className={`flex h-screen flex-col bg-[#F5F3FF] text-[#0B1020] ${drag ? "cursor-grabbing select-none" : ""}`}
            >
              {/* Top bar */}
              <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#DDD6FE] bg-white px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Link
                    to="/admin/online-store"
                    onClick={(e) => {
                      if (
                        dirty &&
                        !window.confirm("Leave without saving? Your changes will be lost.")
                      )
                        e.preventDefault();
                    }}
                    className="text-sm text-[#4C4F7A] hover:text-[#0B1020]"
                  >
                    ← Online store
                  </Link>

                  <span className="truncate font-semibold">Customize · {store.storeName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPanelOpen((v) => !v)}
                    className="h-9 rounded-lg border border-[#DDD6FE] px-3 text-sm hover:border-[#0B1020] lg:hidden"
                    aria-expanded={panelOpen}
                  >
                    {panelOpen ? "Hide panel" : "Sections"}
                  </button>

                  {backStack.length > 0 && (
                    <button
                      type="button"
                      onClick={goBack}
                      className="h-9 rounded-lg border border-[#DDD6FE] px-3 text-sm hover:border-[#0B1020]"
                      title="Back to the page you came from"
                    >
                      &larr; {pageLabel(backStack[backStack.length - 1].page) || "Back"}
                    </button>
                  )}

                  <select
                    value={page}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === NEW_TEMPLATE) {
                        addPageTemplate();
                        return;
                      }
                      // A page template previews a page that uses it, when there is one
                      const own = storePages.find((p) => (p.template || "page") === value);
                      if (own) setSamplePage(own.handle);
                      setPage(value);
                      setSelected(null);
                      setAdding(false);
                      setBackStack([]);
                    }}
                    className="h-9 rounded-lg border border-[#DDD6FE] bg-white px-2 text-sm"
                    aria-label="Page to edit"
                  >
                    {schema.pages.map((p) => (
                      <option key={p} value={p}>
                        {pageLabel(p)}
                      </option>
                    ))}
                    <optgroup label="Page templates">
                      {pageTemplateKeys.map((key) => (
                        <option key={key} value={key}>
                          {pageLabel(key)}
                        </option>
                      ))}
                      <option value={NEW_TEMPLATE}>+ Add page template...</option>
                    </optgroup>
                  </select>

                  {PAGE_TEMPLATE_KEY.test(page) && (
                    <button
                      type="button"
                      onClick={() => deletePageTemplate(page)}
                      className="h-9 rounded-lg border border-[#D8DFE8] px-3 text-sm text-[#4C4F7A] hover:border-[#0B1020] hover:text-[#0B1020]"
                      title="Delete this template; its pages go back to Page"
                    >
                      Delete template
                    </button>
                  )}

                  {/* The Article page previews one post at a time: pick which */}
                  {page === "article" && blogPosts.length > 0 && (
                    <select
                      value={sampleArticle}
                      onChange={(e) => setSampleArticle(e.target.value)}
                      className="h-9 max-w-[200px] rounded-lg border border-[#DDD6FE] bg-white px-2 text-sm"
                      aria-label="Post to preview"
                    >
                      {blogPosts.map((p) => (
                        <option key={p.id} value={p.handle}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* The Page page previews one store page at a time: pick which */}
                  {basePage(page) === "page" && storePages.length > 0 && (
                    <select
                      value={samplePage}
                      onChange={(e) => setSamplePage(e.target.value)}
                      className="h-9 max-w-[200px] rounded-lg border border-[#DDD6FE] bg-white px-2 text-sm"
                      aria-label="Page to preview"
                    >
                      {storePages.map((p) => (
                        <option key={p.id} value={p.handle}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  )}

                  <a
                    href="/editor-demo"
                    target="_blank"
                    rel="noopener"
                    title="Open the theme code in a new tab; the two stay in step"
                    className="h-9 rounded-lg border border-[#DDD6FE] px-3 text-sm leading-9 hover:border-[#0B1020]"
                  >
                    Edit code
                  </a>

                  {previewUrl && (
                    <a
                      href={previewUrl}
                      onClick={(e) => {
                        // Same tab, with the "Back to admin" bar; the store path of the page being edited
                        e.preventDefault();
                        openStorefront(
                          new URL(previewUrl).pathname.replace(/^\/s\/[^/]+/, "") || "/"
                        );
                      }}
                      className="h-9 rounded-lg border border-[#DDD6FE] px-3 text-sm leading-9 hover:border-[#0B1020]"
                    >
                      View store
                    </a>
                  )}

                  <div className="flex items-center rounded-lg border border-[#DDD6FE]">
                    <button
                      type="button"
                      onClick={undo}
                      disabled={!historyRef.current.past.length}
                      className="flex h-9 w-9 items-center justify-center text-[#4C4F7A] hover:text-[#0B1020] disabled:opacity-30"
                      aria-label="Undo"
                      title="Undo (Ctrl+Z)"
                    >
                      <svg {...iconProps} className="h-4 w-4">
                        <path d="M9 14 4 9l5-5" />
                        <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
                      </svg>
                    </button>
                    <span className="h-5 w-px bg-[#DDD6FE]" />
                    <button
                      type="button"
                      onClick={redo}
                      disabled={!historyRef.current.future.length}
                      className="flex h-9 w-9 items-center justify-center text-[#4C4F7A] hover:text-[#0B1020] disabled:opacity-30"
                      aria-label="Redo"
                      title="Redo (Ctrl+Shift+Z)"
                    >
                      <svg {...iconProps} className="h-4 w-4">
                        <path d="m15 14 5-5-5-5" />
                        <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
                      </svg>
                    </button>
                  </div>

                  <span
                    role="status"
                    aria-live="polite"
                    className="hidden min-w-0 items-center gap-1.5 text-xs sm:flex"
                  >
                    {saveState === "saved" && (
                      <span className="flex items-center gap-1 text-[#4C4F7A]">
                        <svg
                          {...iconProps}
                          strokeWidth="2.2"
                          className="h-3.5 w-3.5 text-emerald-600"
                        >
                          <path d="m5 12.5 4.5 4.5L19 7.5" />
                        </svg>
                        All changes saved
                      </span>
                    )}
                    {(saveState === "pending" || saveState === "saving") && (
                      <span className="flex items-center gap-1.5 text-[#4C4F7A]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#8B8FB8]" />
                        Saving...
                      </span>
                    )}
                    {saveState === "error" && (
                      <span className="flex items-center gap-1.5 text-red-600" title={saveError}>
                        Couldn't save, retrying
                        <button
                          type="button"
                          className="font-medium underline"
                          onClick={() => engineRef.current.flushSave()}
                        >
                          Retry now
                        </button>
                      </span>
                    )}
                    {saveState === "invalid" && (
                      <span
                        className="flex max-w-[260px] items-center gap-1.5 text-red-600"
                        title={saveError}
                      >
                        <span className="truncate">Couldn't save: {saveError}</span>
                        <button
                          type="button"
                          className="shrink-0 font-medium underline"
                          onClick={undo}
                        >
                          Undo
                        </button>
                      </span>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => engineRef.current.flushSave()}
                    disabled={!dirty || saveState === "saving"}
                    className="h-9 rounded-lg bg-[#0B1020] px-4 text-sm font-semibold text-white hover:bg-[#1C2347] disabled:opacity-40"
                    title="Changes save automatically; this saves right away"
                  >
                    Save
                  </button>
                </div>
              </header>

              {error && (
                <p
                  role="alert"
                  className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
                >
                  {error}
                  <button type="button" className="text-xs underline" onClick={() => setError("")}>
                    Dismiss
                  </button>
                </p>
              )}

              {notice && (
                <p
                  role="status"
                  className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800"
                >
                  {notice}
                </p>
              )}

              <div className="relative flex min-h-0 flex-1">
                {/* Side panel: list view and edit view slide inside the same panel */}
                <aside
                  className={`absolute inset-y-0 left-0 z-30 w-[340px] max-w-[90vw] shrink-0 overflow-hidden border-r border-[#DDD6FE] bg-white shadow-xl transition-transform duration-200 ease-out motion-reduce:transition-none lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:shadow-none ${
                    panelOpen ? "translate-x-0" : "-translate-x-full"
                  }`}
                >
                  <div
                    className={`flex h-full w-[300%] transition-transform duration-200 ease-out motion-reduce:transition-none ${
                      panelView === 2
                        ? "-translate-x-2/3"
                        : panelView === 1
                          ? "-translate-x-1/3"
                          : "translate-x-0"
                    }`}
                  >
                    {/* List view (keeps its scroll position while editing) */}
                    <div
                      className="flex h-full w-1/3 flex-col overflow-y-auto"
                      inert={panelView !== 0}
                      aria-hidden={panelView !== 0}
                    >
                      <h2 className="px-4 pb-3 pt-4 text-sm font-semibold text-[#0B1020]">
                        {pageLabel(page)}
                      </h2>

                      <GroupHeading>Header</GroupHeading>

                      <LayoutRows
                        part="top"
                        selected={selected}
                        themeGroup={themeGroup}
                        synced={data.sections}
                        onOpen={(group) => {
                          // A synced section (the header) has its own panel: its options come from its file
                          if (isSynced(data, group)) {
                            setSelected(group);
                            return;
                          }
                          setThemeGroup(group);
                          setSelected("theme");
                        }}
                      />

                      <GroupHeading>Template</GroupHeading>

                      <ul className="px-2">
                        {template.order.map((id, i) => {
                          const s = template.sections[id];

                          const spec = schema.sections[s.type];

                          const name = s.settings.heading || spec.name;

                          const canRename = "heading" in spec.settings;

                          const lineHere = dropTarget?.kind === "section" && dropTarget.id === id;

                          const blockInto = dropTarget?.kind === "into" && dropTarget.id === id;

                          const isSelected = selected === id;

                          const showType =
                            s.type !== "custom" &&
                            name.trim().toLowerCase() !== spec.name.toLowerCase();

                          const menuOpen = rowMenu === id;

                          // Actions appear on hover/focus (always on touch screens); stay visible while the menu is open
                          const reveal = menuOpen
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";

                          return (
                            <li
                              key={id}
                              data-drop-section={id}
                              className={`relative ${drag?.kind === "section" && drag.id === id ? "opacity-40" : ""}`}
                            >
                              {lineHere && <DropLine after={dropTarget.after} />}

                              <div
                                className={`group flex h-9 items-center gap-2 rounded-md pl-1.5 pr-1 text-sm ${
                                  blockInto
                                    ? "bg-[#EDE9FE] ring-1 ring-[#0B1020]/30"
                                    : isSelected
                                      ? "bg-[#EDE9FE]"
                                      : "hover:bg-[#F5F6F8]"
                                }`}
                              >
                                {/* The type icon turns into the drag handle on hover */}
                                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                                  <svg
                                    {...iconProps}
                                    className={`h-4 w-4 group-hover:invisible group-focus-within:invisible [@media(hover:none)]:invisible ${
                                      s.hidden ? "text-[#C2C9D6]" : "text-[#8B8FB8]"
                                    }`}
                                  >
                                    {SECTION_ICONS[s.type] || SECTION_ICONS.custom}
                                  </svg>
                                  <span className="invisible absolute inset-0 flex items-center justify-center group-hover:visible group-focus-within:visible [@media(hover:none)]:visible">
                                    <DragHandle
                                      label={`Move ${name}`}
                                      onPointerDown={(e) => startDrag(e, { kind: "section", id })}
                                      onKeyDown={(e) => {
                                        if (e.key === "ArrowUp" && i > 0) {
                                          e.preventDefault();
                                          moveSection(id, -1);
                                        }
                                        if (
                                          e.key === "ArrowDown" &&
                                          i < template.order.length - 1
                                        ) {
                                          e.preventDefault();
                                          moveSection(id, 1);
                                        }
                                      }}
                                    />
                                  </span>
                                </span>

                                {renaming === id ? (
                                  <input
                                    autoFocus
                                    value={renameValue}
                                    maxLength={200}
                                    aria-label="Section name"
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={finishRename}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") finishRename();
                                      if (e.key === "Escape") {
                                        e.preventDefault();
                                        setRenaming(null);
                                      }
                                    }}
                                    className="h-7 min-w-0 flex-1 rounded border border-[#0B1020] bg-white px-2 text-sm outline-none"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    className="flex min-w-0 flex-1 items-baseline gap-1.5 text-left"
                                    onClick={() => setSelected(id)}
                                    onDoubleClick={() => canRename && startRename(id)}
                                    title={showType ? `${name} (${spec.name})` : name}
                                  >
                                    <span
                                      className={`truncate ${s.hidden ? "text-[#A3ADBF]" : "text-[#0B1020]"} ${isSelected ? "font-medium" : ""}`}
                                    >
                                      {name}
                                    </span>
                                    {showType && (
                                      <span className="shrink-0 truncate text-xs text-[#A3ADBF]">
                                        {spec.name}
                                      </span>
                                    )}
                                  </button>
                                )}

                                {renaming !== id && !spec.required && (
                                  <div className="flex shrink-0 items-center">
                                    {/* Hidden sections keep the crossed-out eye visible */}
                                    <button
                                      type="button"
                                      onClick={() => toggleHidden(id)}
                                      className={`${iconButton} ${s.hidden ? "opacity-100" : reveal}`}
                                      aria-label={s.hidden ? `Show ${name}` : `Hide ${name}`}
                                      aria-pressed={!s.hidden}
                                      title={s.hidden ? "Hidden. Click to show" : "Hide"}
                                    >
                                      <EyeIcon hidden={s.hidden} />
                                    </button>

                                    <div className={`relative ${reveal}`}>
                                      <button
                                        type="button"
                                        onClick={() => setRowMenu(menuOpen ? null : id)}
                                        className={iconButton}
                                        aria-label={`More actions for ${name}`}
                                        aria-haspopup="menu"
                                        aria-expanded={menuOpen}
                                      >
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="currentColor"
                                          className="h-4 w-4"
                                          aria-hidden="true"
                                        >
                                          <circle cx="5" cy="12" r="1.6" />
                                          <circle cx="12" cy="12" r="1.6" />
                                          <circle cx="19" cy="12" r="1.6" />
                                        </svg>
                                      </button>

                                      {menuOpen && (
                                        <div
                                          role="menu"
                                          data-row-menu
                                          className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-[#E4DEFB] bg-white py-1 text-sm shadow-lg"
                                        >
                                          {canRename && (
                                            <button
                                              type="button"
                                              role="menuitem"
                                              onClick={() => {
                                                setRowMenu(null);
                                                startRename(id);
                                              }}
                                              className="block w-full px-3 py-1.5 text-left hover:bg-[#F5F6F8]"
                                            >
                                              Rename
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                              setRowMenu(null);
                                              duplicateSection(id);
                                            }}
                                            className="block w-full px-3 py-1.5 text-left hover:bg-[#F5F6F8]"
                                          >
                                            Duplicate
                                          </button>
                                          <div className="my-1 h-px bg-[#EEF0F4]" />
                                          <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                              setRowMenu(null);
                                              removeSection(id);
                                            }}
                                            className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>

                      {template.order.length === 0 && (
                        <p className="px-4 py-2 text-xs text-[#4C4F7A]">
                          No sections yet. Your store shows a simple default layout until you add
                          one.
                        </p>
                      )}

                      {/* Add section */}
                      <div className="px-2 pb-3 pt-1">
                        {adding ? (
                          <div className="rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-3">
                            <label
                              className="block text-xs font-medium text-[#3B3F8F]"
                              htmlFor="new-section-name"
                            >
                              Section name
                            </label>

                            <div className="mt-1.5 flex items-center gap-1.5">
                              <input
                                id="new-section-name"
                                autoFocus
                                value={newName}
                                maxLength={200}
                                placeholder="e.g. Our story"
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addCustomSection();
                                  }
                                  if (e.key === "Escape") {
                                    setAdding(false);
                                    setNewName("");
                                  }
                                }}
                                className="h-9 min-w-0 flex-1 rounded-lg border border-[#DDD6FE] bg-white px-2.5 text-sm outline-none focus:border-[#0B1020]"
                              />

                              <button
                                type="button"
                                onClick={addCustomSection}
                                disabled={!newName.trim()}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B1020] text-white hover:bg-[#1C2347] disabled:opacity-30"
                                aria-label="Add section"
                                title="Add section"
                              >
                                <svg {...iconProps} strokeWidth="2.2" className="h-4 w-4">
                                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setAdding(false);
                                  setNewName("");
                                }}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#DDD6FE] bg-white text-[#4C4F7A] hover:border-[#0B1020] hover:text-[#0B1020]"
                                aria-label="Cancel"
                                title="Cancel"
                              >
                                <svg {...iconProps} strokeWidth="2" className="h-4 w-4">
                                  <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                              </button>
                            </div>

                            {templateTypes.length > 0 && (
                              <>
                                <p className="mt-3 text-[11px] text-[#4C4F7A]">
                                  Or start from a template:
                                </p>

                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {templateTypes.map(([type, spec]) => (
                                    <button
                                      key={type}
                                      type="button"
                                      onClick={() => addTemplateSection(type)}
                                      className="rounded-full border border-[#DDD6FE] bg-white px-2.5 py-1 text-xs text-[#3B3F8F] hover:border-[#0B1020] hover:text-[#0B1020]"
                                    >
                                      {spec.name}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAdding(true)}
                            className="flex h-9 w-full items-center gap-2 rounded-md px-1.5 text-sm font-medium text-[#3B3F8F] hover:bg-[#F5F6F8] hover:text-[#0B1020]"
                          >
                            <span
                              className="flex h-5 w-5 items-center justify-center"
                              aria-hidden="true"
                            >
                              <svg {...iconProps} strokeWidth="2" className="h-4 w-4">
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                            </span>
                            Add section
                          </button>
                        )}
                      </div>

                      <GroupHeading>Footer</GroupHeading>

                      <LayoutRows
                        part="bottom"
                        selected={selected}
                        themeGroup={themeGroup}
                        synced={data.sections}
                        onOpen={(group) => {
                          // A synced section (the footer) has its own panel: its options come from its file
                          if (isSynced(data, group)) {
                            setSelected(group);
                            return;
                          }
                          setThemeGroup(group);
                          setSelected("theme");
                        }}
                      />

                      <div className="mt-auto border-t border-[#DDD6FE] p-2">
                        <button
                          type="button"
                          onClick={() => {
                            setThemeGroup("colors");
                            setSelected("theme");
                          }}
                          className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
                            selected === "theme" ? "bg-[#EDE9FE]" : "hover:bg-[#F5F3FF]"
                          }`}
                        >
                          Theme settings (colors, fonts, buttons)
                        </button>
                      </div>
                    </div>

                    {/* Edit view */}
                    <div
                      className="flex h-full w-1/3 flex-col"
                      inert={panelView !== 1}
                      aria-hidden={panelView !== 1}
                    >
                      <div className="flex shrink-0 items-center gap-2 border-b border-[#DDD6FE] px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setSelected(null)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#4C4F7A] hover:bg-[#F3F0FF] hover:text-[#0B1020]"
                          aria-label="Back to sections"
                          title="Back (Esc)"
                        >
                          <svg {...iconProps} strokeWidth="2" className="h-4 w-4">
                            <path d="M19 12H5M11 6l-6 6 6 6" />
                          </svg>
                        </button>

                        <div className="min-w-0">
                          <h2 className="truncate font-semibold leading-tight">{editTitle}</h2>
                          <p className="truncate text-xs text-[#8B8FB8]">{editSubtitle}</p>
                        </div>
                      </div>

                      <div ref={editScrollRef} className={`min-h-0 flex-1 overflow-y-auto px-4`}>
                        {shown === "theme" ? (
                          <GroupedFields
                            key={`theme-${themeGroup}`}
                            fields={schema.settings}
                            values={data.settings}
                            groups={(
                              schema.theme_groups || [{ id: "store", label: "Store" }]
                            ).filter(
                              // Synced sections (header, footer) are edited in their own panels (in the sections list)
                              (group) => !isSynced(data, group.id)
                            )}
                            initialOpen={themeGroup}
                            collections={collections}
                            onChange={(key, value) =>
                              update((d) => {
                                d.settings[key] = value;
                              }, `t:${key}`)
                            }
                          />
                        ) : shownSection ? (
                          <GroupedFields
                            key={shown}
                            fields={shownSpec.settings}
                            values={shownSection.settings}
                            groups={schema.groups || [{ id: "content", label: "Content" }]}
                            collections={collections}
                            products={products}
                            onChange={(key, value) =>
                              update((d) => {
                                sectionIn(d, page, shown).settings[key] = value;
                              }, `s:${shown}:${key}`)
                            }
                            extra={
                              <>
                                {shownSpec.blocks && (
                                  <SectionBlocks
                                    key={`blocks-${shown}`}
                                    sectionId={shown}
                                    spec={shownSpec}
                                    blocks={shownSection.blocks || []}
                                    drag={drag}
                                    dropTarget={dropTarget}
                                    startDrag={startDrag}
                                    onChange={(mutate) => updateBlocks(shown, mutate)}
                                    onOpen={(index) => setSelectedBlock(index)}
                                    onDuplicate={(index) => duplicateBlock(shown, index)}
                                    onToggle={(index) => toggleBlockHidden(shown, index)}
                                    onRemove={(index) => removeBlock(shown, index)}
                                  />
                                )}

                                {blockTargets.length > 0 && (
                                  <div className="mt-4 rounded-lg border border-dashed border-[#C9D1DD] bg-[#F5F3FF] p-2">
                                    <p className="px-1 pb-1.5 text-[11px] font-medium text-[#4C4F7A]">
                                      Drop on a section to move the block there
                                    </p>

                                    <ul className="grid gap-1">
                                      {blockTargets.map((id) => (
                                        <li
                                          key={id}
                                          data-drop-section={id}
                                          className={`truncate rounded-md border bg-white px-2.5 py-2 text-sm ${
                                            dropTarget?.kind === "into" && dropTarget.id === id
                                              ? "border-[#0B1020] ring-2 ring-[#0B1020]/20"
                                              : "border-[#DDD6FE]"
                                          }`}
                                        >
                                          {template.sections[id].settings.heading ||
                                            schema.sections[template.sections[id].type].name}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            }
                          />
                        ) : null}
                      </div>

                      {shownSection && (
                        <div className="flex shrink-0 items-center gap-1 border-t border-[#DDD6FE] bg-white px-3 py-2">
                          <button
                            type="button"
                            onClick={() => resetSection(shown)}
                            className="rounded-md px-2 py-1.5 text-xs font-medium text-[#4C4F7A] hover:bg-[#F3F0FF] hover:text-[#0B1020]"
                          >
                            Reset to default
                          </button>

                          <span className="flex-1" />

                          {!shownSpec.required && (
                            <>
                              <button
                                type="button"
                                onClick={() => duplicateSection(shown)}
                                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#4C4F7A] hover:bg-[#F3F0FF] hover:text-[#0B1020]"
                              >
                                <svg {...iconProps} className="h-3.5 w-3.5">
                                  <rect x="8" y="8" width="13" height="13" rx="2" />
                                  <path d="M4 16V5a2 2 0 0 1 2-2h11" />
                                </svg>
                                Duplicate
                              </button>

                              <button
                                type="button"
                                onClick={() => removeSection(shown)}
                                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                <svg {...iconProps} className="h-3.5 w-3.5">
                                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                                </svg>
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Block view */}
                    <div
                      className="flex h-full w-1/3 flex-col"
                      inert={panelView !== 2}
                      aria-hidden={panelView !== 2}
                    >
                      <div className="flex shrink-0 items-center gap-2 border-b border-[#DDD6FE] px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedBlock(null)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#4C4F7A] hover:bg-[#F3F0FF] hover:text-[#0B1020]"
                          aria-label="Back to section"
                          title="Back (Esc)"
                        >
                          <svg {...iconProps} strokeWidth="2" className="h-4 w-4">
                            <path d="M19 12H5M11 6l-6 6 6 6" />
                          </svg>
                        </button>

                        <div className="min-w-0">
                          <h2 className="truncate font-semibold leading-tight">
                            {shownBlockSpec?.name || "Block"}
                          </h2>
                          <p className="truncate text-xs text-[#8B8FB8]">
                            in {shownSection ? shownSection.settings.heading || shownSpec.name : ""}
                            {shownBlock?.hidden ? " · Hidden" : ""}
                          </p>
                        </div>
                      </div>

                      <div ref={blockScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4">
                        {shownBlock && shownBlockSpec && (
                          <GroupedFields
                            key={`${shown}-${shownBlockIndex}-${shownBlock.type}`}
                            fields={shownBlockSpec.settings}
                            values={shownBlock.settings}
                            groups={schema.groups || [{ id: "content", label: "Content" }]}
                            collections={collections}
                            products={products}
                            onChange={(key, value) =>
                              updateBlocks(
                                shown,
                                (list) => {
                                  list[shownBlockIndex].settings[key] = value;
                                },
                                `b:${shown}:${shownBlockIndex}:${key}`
                              )
                            }
                          />
                        )}
                      </div>

                      {shownBlock && (
                        <div className="flex shrink-0 items-center gap-1 border-t border-[#DDD6FE] bg-white px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleBlockHidden(shown, shownBlockIndex)}
                            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#4C4F7A] hover:bg-[#F3F0FF] hover:text-[#0B1020]"
                          >
                            <EyeIcon hidden={!shownBlock.hidden} />
                            {shownBlock.hidden ? "Show" : "Hide"}
                          </button>

                          <span className="flex-1" />

                          <button
                            type="button"
                            onClick={() => duplicateBlock(shown, shownBlockIndex)}
                            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#4C4F7A] hover:bg-[#F3F0FF] hover:text-[#0B1020]"
                          >
                            <svg {...iconProps} className="h-3.5 w-3.5">
                              <rect x="8" y="8" width="13" height="13" rx="2" />
                              <path d="M4 16V5a2 2 0 0 1 2-2h11" />
                            </svg>
                            Duplicate
                          </button>

                          {/* A section's required blocks (e.g. Product information) can be hidden, not deleted */}
                          {!shownSpec.required_blocks?.includes(shownBlock.type) && (
                            <button
                              type="button"
                              onClick={() => removeBlock(shown, shownBlockIndex)}
                              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              <svg {...iconProps} className="h-3.5 w-3.5">
                                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                              </svg>
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </aside>

                {/* Preview */}
                <main className="flex min-w-0 flex-1 flex-col p-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-[#4C4F7A]">
                    <span>
                      {previewError
                        ? `Preview not updated: ${previewError}`
                        : `${(page === "blog" || page === "article") && !blogPosts.length ? "Sample posts until you publish one. " : ""}${basePage(page) === "page" && !storePages.length ? "A sample page until you add one in Pages. " : ""}${
                            dirty
                              ? editMode
                                ? "Live preview. Changes save automatically. Click or drag sections here to edit them."
                                : "Live preview. Changes save automatically. Turn on Edit mode to pick sections here."
                              : editMode
                                ? "Live preview. Click or drag sections here to edit them."
                                : "Live preview. Turn on Edit mode to pick sections here."
                          }`}
                    </span>

                    <div className="flex items-center gap-3">
                      {/* Edit mode: On = clicking the preview selects sections; Off = the preview works like the store */}
                      <button
                        type="button"
                        aria-pressed={editMode}
                        onClick={() => setEditMode((on) => !on)}
                        title="Click sections in the preview to edit them"
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[#0B1020]/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                          editMode
                            ? "border-[#0B1020] bg-[#0B1020] text-white"
                            : "border-[#DDD6FE] bg-white text-[#4C4F7A] hover:border-[#0B1020] hover:text-[#0B1020]"
                        }`}
                      >
                        <svg {...iconProps} className="h-3.5 w-3.5">
                          <path d="M4 3l7 17 2.5-7.5L21 10z" />
                        </svg>
                        Edit mode
                        <span className="font-semibold">{editMode ? "On" : "Off"}</span>
                      </button>

                      <div
                        className="flex rounded-lg border border-[#DDD6FE] bg-white p-0.5"
                        role="radiogroup"
                        aria-label="Preview size"
                      >
                        {[
                          ["desktop", "Desktop", "M3 4h18v12H3zM8 20h8M12 16v4"],
                          ["mobile", "Mobile", "M7 2h10v20H7zM11 18h2"],
                        ].map(([id, name, path]) => (
                          <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={device === id}
                            onClick={() => setDevice(id)}
                            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                              device === id
                                ? "bg-[#0B1020] text-white"
                                : "text-[#4C4F7A] hover:text-[#0B1020]"
                            }`}
                          >
                            <svg {...iconProps} className="h-3.5 w-3.5">
                              <path d={path} />
                            </svg>
                            {name}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="hover:text-[#0B1020]"
                        onClick={() => setPreviewKey((k) => k + 1)}
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  {/* Every page: rendered from the unsaved layout, patched section by section as it changes */}
                  {previewHtml ? (
                    <iframe
                      key={previewKey}
                      ref={iframeRef}
                      title="Store preview"
                      srcDoc={previewHtml}
                      // Theme code is written by store owners: keep it off this origin
                      sandbox="allow-scripts allow-forms allow-popups"
                      className={`mx-auto min-h-0 flex-1 rounded-xl border border-[#DDD6FE] bg-white transition-[width] duration-200 ${
                        device === "mobile" ? "w-[390px] max-w-full" : "w-full"
                      } ${drag ? "pointer-events-none" : ""}`}
                    />
                  ) : (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#DDD6FE] text-sm text-[#4C4F7A]">
                      Loading preview...
                    </div>
                  )}
                </main>
              </div>
              {contextMenu && (
                <div
                  role="menu"
                  style={{
                    left: Math.min(contextMenu.x, window.innerWidth - 168),
                    top: Math.min(contextMenu.y, window.innerHeight - 56),
                  }}
                  className="fixed z-50 w-40 rounded-lg border border-[#DDD6FE] bg-white p-1 shadow-lg"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      window.open(
                        `/editor-demo?file=${encodeURIComponent(contextMenu.file)}`,
                        "_blank",
                        "noopener"
                      );
                      setContextMenu(null);
                    }}
                    className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-[#F5F3FF]"
                  >
                    Edit code
                  </button>
                </div>
              )}
            </div>
          </UploadsContext.Provider>
        </BlogPostsContext.Provider>
      </StorePagesContext.Provider>
    </FontsContext.Provider>
  );
}
