import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { API_URL, apiRequest, openStorefront } from "@/lib/api";

import { useSession } from "@/lib/auth";

import {
  getThemeSchema,
  getThemeSettings,
  patchThemeSettings,
  getThemeCustomizer,
  saveThemeCustomizer,
  previewTheme,
  uploadThemeImage,
  getSyncedSections,
  postSyncTiming,
  subscribeThemeEvents,
  SYNC_CLIENT,
} from "@/lib/themeApi";

import { announceThemeChange, onThemeChange } from "@/lib/themeSync";

const PAGE_LABELS = {
  index: "Home page",
  product: "Product page",
  collection: "Collection page",
  blog: "Blog page",
  article: "Article page",
};

const inputClass =
  "h-10 w-full rounded-lg border border-[#D8DFE8] bg-white px-3 text-sm outline-none focus:border-[#161C2C]";

const smallButton =
  "rounded-md border border-[#D8DFE8] bg-white px-2 py-1 text-xs text-[#30466F] hover:border-[#161C2C] disabled:opacity-30";

const iconButton =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#53627E] hover:bg-white hover:text-[#161C2C]";

const newSectionId = (type) => `${type}-${Math.random().toString(36).slice(2, 6)}`;

const MAX_SECTIONS = 25;

// The footer is a synced section: its options live in sections/footer.liquid's schema, and
// a change here is written into that file (and the other way round). Its values are kept in
// data.sections.footer as { type: "footer", settings, blocks }.
const FOOTER = "footer";

// The section `id` of a page, or the synced footer
function sectionIn(d, page, id) {
  return id === FOOTER ? d.sections?.footer : d.templates[page]?.sections[id];
}

const footerJson = (d) => JSON.stringify(d?.sections?.footer ?? null);

// What the server stores for the footer: its settings and blocks
function footerForSave(footer) {
  return { settings: footer.settings, blocks: footer.blocks };
}

const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

// Images for banners and slides: JPG, PNG or WEBP up to 5MB (checked again by the server)
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function defaultsOf(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, spec]) => [key, structuredClone(spec.default)])
  );
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

// The thin line that shows where a dragged item will land
function DropLine({ after }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1 right-1 z-10 h-[3px] rounded-full bg-[#141b2d] shadow-[0_0_0_3px_rgba(20,27,45,0.12)]"
      style={{ top: after ? "calc(100% - 1px)" : "-2px" }}
    />
  );
}

function DragHandle({ label, onPointerDown, onKeyDown }) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className="flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-[#A3ADBF] hover:text-[#161C2C] active:cursor-grabbing"
      aria-label={label}
      title="Drag to reorder (or use the arrow keys)"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <circle cx="9" cy="6" r="1.6" />
        <circle cx="15" cy="6" r="1.6" />
        <circle cx="9" cy="12" r="1.6" />
        <circle cx="15" cy="12" r="1.6" />
        <circle cx="9" cy="18" r="1.6" />
        <circle cx="15" cy="18" r="1.6" />
      </svg>
    </button>
  );
}

export default function AdminCustomizePage() {
  const session = useSession();

  const store = session?.stores?.find(
    (s) => s.storeId === session.storeId
  );

  const [schema, setSchema] = useState(null);

  const [data, setData] = useState(null);

  const [customizer, setCustomizer] = useState({});

  const [collections, setCollections] = useState([]);

  const [sampleProductId, setSampleProductId] = useState(null);

  const [products, setProducts] = useState([]);

  const [page, setPage] = useState("index");

  const [selected, setSelected] = useState(null);

  // Right-click menu over the preview: where it opens, and the theme file it edits
  const [contextMenu, setContextMenu] = useState(null);

  const navigate = useNavigate();

  const [status, setStatus] = useState("loading");

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  // Autosave: "saved", "pending", "saving", "error" (will retry) or "invalid" (server refused the data)
  const [saveState, setSaveState] = useState("saved");

  const [saveError, setSaveError] = useState("");

  const dirty = saveState !== "saved";

  const saveStateRef = useRef("saved");

  saveStateRef.current = saveState;

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
      if (!e.target.closest("[data-row-menu]") && !e.target.closest('[aria-haspopup="menu"]')) setRowMenu(null);
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

  editModeRef.current = editMode;

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

  dataRef.current = data;

  const customizerRef = useRef({});

  customizerRef.current = customizer;

  const selectedRef = useRef(null);

  selectedRef.current = selected;

  const selectedBlockRef = useRef(null);

  selectedBlockRef.current = selectedBlock;

  const pageRef = useRef("index");

  pageRef.current = page;

  const sampleProductRef = useRef(null);

  sampleProductRef.current = sampleProductId;

  // What the server last saved, to send only the changes
  const lastSavedRef = useRef(null);

  const saveRef = useRef({ timer: 0, saving: false, again: false, retryDelay: 2000, uploads: 0 });

  // Undo / redo: snapshots of the (immutable) theme data
  const historyRef = useRef({ past: [], future: [], lastKey: null, lastTime: 0 });

  const [, setHistoryTick] = useState(0);

  // Live preview: what the open preview shows, so only changed sections are re-rendered and patched in
  const syncRef = useRef({ ready: false, queue: [], rendered: null, inflight: {}, again: {}, frame: 0, fullTimer: 0, gen: 0, images: {} });

  const engineRef = useRef({});

  // The synced footer: the file version this editor last saw (to detect someone else's change),
  // when the last change was made, and preview updates waiting for the preview's "patched" reply
  const footerRef = useRef({ version: null, changedAt: 0, kind: "", quickSave: false, token: 0, waiting: {} });

  useEffect(() => {
    Promise.all([
      getThemeSchema(),
      getThemeSettings(),
      getThemeCustomizer(),
      apiRequest("/api/v1/catalog/collections/"),
      apiRequest("/api/v1/catalog/products/"),
      getSyncedSections().catch(() => ({})),
    ])
      .then(([schemaData, settingsData, customizerData, collectionData, productData, synced]) => {
        // The footer's options come from its file's schema; its values from its saved JSON
        if (synced?.footer) {
          schemaData = { ...schemaData, sections: { ...schemaData.sections, [FOOTER]: synced.footer.spec } };
          settingsData = {
            ...settingsData,
            sections: { ...(settingsData.sections || {}), [FOOTER]: { type: FOOTER, ...synced.footer.values } },
          };
          footerRef.current.version = synced.footer.version;
        } else if (settingsData.sections) {
          // No synced footer file in this theme: nothing to edit or save for it
          settingsData = { ...settingsData };
          delete settingsData.sections;
        }
        lastSavedRef.current = { data: settingsData, customizer: customizerData };
        setSchema(schemaData);
        setData(settingsData);
        setCustomizer(customizerData);
        setCollections(collectionData);
        setProducts(productData);
        setSampleProductId(productData.find((p) => p.status === "active")?.id || null);
        setStatus("ready");
      })
      .catch((e) => {
        setError(e.message);
        setStatus("error");
      });
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
      return `${base}/collections/all`;
    }

    // The blog has no store page of its own until posts can be written
    if (page === "blog" || page === "article") return "";

    return `${base}/`;
  }, [store, page, sampleProductId]);

  // ---------------- Live preview (the page being edited) ----------------
  // The preview is rendered once; afterwards only the sections that changed are rendered
  // and swapped into the open page by message. Hide/delete/reorder happen inside the page.

  // Which page the preview renders (and, for the product page, which product)
  function previewTarget() {
    return { page: pageRef.current, product: pageRef.current === "product" ? sampleProductRef.current || "" : "" };
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
      footer: footerJson(d),
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
    previewTheme(d, { scroll: scrollRef.current, selected: selectedRef.current || "", ...previewTarget() })
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

  // The synced footer: only it is rendered (one quick request) and swapped in
  function requestFooter() {
    const sync = syncRef.current;
    if (sync.inflight[FOOTER]) {
      sync.again[FOOTER] = true;
      return;
    }
    const d = dataRef.current;
    const requested = footerJson(d);
    const gen = sync.gen;
    const footer = footerRef.current;
    // Timed from the change to the preview's "patched" reply
    let token = "";
    if (footer.changedAt) {
      token = String(++footer.token);
      footer.waiting[token] = { at: footer.changedAt, kind: footer.kind || "footer: sidebar -> preview" };
      footer.changedAt = 0;
      footer.kind = "";
    }
    sync.inflight[FOOTER] = true;

    previewTheme(d, { section: FOOTER, ...previewTarget() })
      .then((res) => {
        if (gen !== sync.gen || !sync.rendered) return;
        postToPreview({ type: "patch", id: FOOTER, html: res.html, index: Infinity, token });
        sync.rendered.footer = requested;
        setPreviewError("");
      })
      .catch((e) => setPreviewError(e.message))
      .finally(() => {
        if (gen !== sync.gen) return;
        sync.inflight[FOOTER] = false;
        sync.again[FOOTER] = false;
        engineRef.current.scheduleSync();
      });
  }

  function requestSection(id) {
    if (id === FOOTER) {
      requestFooter();
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

    // The footer changed: just it is re-rendered and swapped in
    if (now.footer !== before.footer) requestSection(FOOTER);

    // The default layout shows when there are no sections: switching to or from it needs a full render
    if (!now.order.length || !before.order.length) {
      if (now.order.length !== before.order.length) renderFull();
      return;
    }

    before.order.filter((id) => !now.order.includes(id)).forEach((id) => {
      postToPreview({ type: "remove", id });
      delete before.sections[id];
    });
    before.order = before.order.filter((id) => now.order.includes(id));

    now.order.forEach((id) => {
      if (before.sections[id] !== now.sections[id]) requestSection(id);
    });

    const existing = now.order.filter((id) => before.order.includes(id));
    if (existing.join("|") !== before.order.join("|")) {
      postToPreview({ type: "order", ids: existing });
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
    if (JSON.stringify(before.settings) !== JSON.stringify(after.settings)) changes.settings = after.settings;
    // The synced footer is saved on its own path, which also writes it into sections/footer.liquid
    if (after.sections?.footer && footerJson(before) !== footerJson(after)) {
      changes.sections = { [FOOTER]: footerForSave(after.sections.footer) };
      changes.section_versions = { [FOOTER]: footerRef.current.version };
      changes.client = SYNC_CLIENT;
      changes.started_at = footerRef.current.savedChangeAt || Date.now();
    }
    for (const name of Object.keys(after.templates)) {
      const a = before.templates[name] || { order: [], sections: {} };
      const b = after.templates[name];
      const sections = {};
      for (const id of Object.keys(b.sections)) {
        if (JSON.stringify(a.sections[id]) !== JSON.stringify(b.sections[id])) sections[id] = b.sections[id];
      }
      for (const id of Object.keys(a.sections)) {
        if (!(id in b.sections)) sections[id] = null;
      }
      if (a.order.join("|") !== b.order.join("|") || Object.keys(sections).length) {
        changes.templates = changes.templates || {};
        changes.templates[name] = { order: b.order, ...(Object.keys(sections).length ? { sections } : {}) };
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
    const customizerChanged = JSON.stringify(customizerNow) !== JSON.stringify(lastSavedRef.current.customizer);

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
      const footerSaved = saved?.sections?.[FOOTER];
      if (footerSaved) {
        footerRef.current.version = footerSaved.version;
        footerRef.current.savedChangeAt = 0;
        // Someone changed the footer's code meanwhile: this change won, and they are told where theirs is
        if (footerSaved.conflict) setNotice(footerSaved.conflict);
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
  async function externalChange(kind) {
    // The footer's file was saved in Edit code (another tab): only the footer is updated
    if (kind === "section:footer") {
      try {
        const synced = await getSyncedSections();
        if (synced?.footer && synced.footer.version !== footerRef.current.version) {
          sectionEvent({ section: FOOTER, source: "code", ...synced.footer });
        }
      } catch {
        // the live event (or the next reload) brings it
      }
      return;
    }
    if (kind !== "settings") {
      setPreviewKey((k) => k + 1);
      return;
    }
    if (saveStateRef.current !== "saved" || saveRef.current.saving) {
      setNotice("The code editor changed the settings. Your edits here are still saving; reload to see its changes.");
      return;
    }
    try {
      const fresh = { ...(await getThemeSettings()) };
      if (saveStateRef.current !== "saved") return;
      // The synced footer keeps its own shape (and is updated by its own events)
      const footer = dataRef.current?.sections?.footer;
      if (footer) fresh.sections = { ...(fresh.sections || {}), [FOOTER]: footer };
      else delete fresh.sections;
      lastSavedRef.current = { data: fresh, customizer: customizerRef.current };
      historyRef.current = { past: [], future: [], lastKey: null, lastTime: 0 };
      dataRef.current = fresh;
      setData(fresh);
      setHistoryTick((t) => t + 1);
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

  // A synced section changed elsewhere (Edit code, a restore, or this editor in another tab):
  // its options and values are replaced here and its preview re-rendered - nothing is saved back.
  function sectionEvent(event) {
    if (event.section !== FOOTER || !event.values) return;
    const footer = footerRef.current;
    if (footer.version !== null && event.version <= footer.version && event.source !== "restore") return;
    footer.version = event.version;

    if (event.spec) {
      setSchema((current) => (current ? { ...current, sections: { ...current.sections, [FOOTER]: event.spec } } : current));
    }

    const current = dataRef.current;
    const saved = lastSavedRef.current;
    if (!current || !saved) return;
    const incoming = { type: FOOTER, ...event.values };
    const unsaved = footerJson(current) !== footerJson(saved.data);
    if (unsaved) {
      // Both changed it: the edit here is saved on top (latest wins); theirs stays in the file's History
      setNotice(
        event.source === "customizer"
          ? "The footer was changed in another tab. Your change here is being saved on top of it."
          : "The footer's code was changed in Edit code. Your change here is being saved on top; the code editor's version is in its History."
      );
      return;
    }

    if (JSON.stringify(incoming) === footerJson(current)) return;
    const next = { ...current, sections: { ...(current.sections || {}), [FOOTER]: incoming } };
    lastSavedRef.current = { ...saved, data: { ...saved.data, sections: { ...(saved.data.sections || {}), [FOOTER]: incoming } } };
    // Timed until the preview shows it (from the moment Save was pressed in Edit code)
    if (event.source !== "customizer" && event.started_at && Date.now() - event.started_at < 60000) {
      footer.changedAt = Number(event.started_at);
      footer.kind = "footer: code save -> preview";
      footer.clock = "epoch";
    }
    dataRef.current = next;
    setData(next);
    if (selectedRef.current === FOOTER && selectedBlockRef.current !== null && !incoming.blocks?.[selectedBlockRef.current]) {
      setSelectedBlock(null);
    }
    if (event.source === "code") setNotice("Footer updated from Edit code.");
    else if (event.source === "restore") setNotice("An earlier footer version was restored.");
  }

  engineRef.current = { renderFull, scheduleSync, flushSave, registerPendingImage, postToPreview, externalChange, sectionEvent };

  useEffect(() => onThemeChange((kind) => engineRef.current.externalChange(kind)), []);

  // Live events from the server: a change to the footer made in Edit code or another editor
  useEffect(() => {
    if (status !== "ready" || footerRef.current.version === null) return undefined;
    return subscribeThemeEvents((event) => engineRef.current.sectionEvent(event));
  }, [status]);

  // ---------------- Changes and history ----------------

  // Every change goes through here: local state first, then the preview and autosave follow.
  // Quick repeated changes to the same option (typing, dragging a slider) become one undo step.
  const update = useCallback((mutator, coalesceKey) => {
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
    markFooterChange(current, next);
    dataRef.current = next;
    setData(next);
    setHistoryTick((t) => t + 1);
  }, []);

  // A footer change shows in the preview at once and is saved after a short pause (200 ms)
  function markFooterChange(before, after) {
    if (footerJson(before) === footerJson(after)) return;
    const footer = footerRef.current;
    footer.changedAt = performance.now();
    footer.kind = "footer: sidebar -> preview";
    footer.clock = "perf";
    footer.quickSave = true;
    footer.savedChangeAt = Date.now();
  }

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (!history.past.length) return;
    history.future.push(dataRef.current);
    const previous = history.past.pop();
    history.lastKey = null;
    markFooterChange(dataRef.current, previous);
    dataRef.current = previous;
    setData(previous);
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    const history = historyRef.current;
    if (!history.future.length) return;
    history.past.push(dataRef.current);
    const next = history.future.pop();
    history.lastKey = null;
    markFooterChange(dataRef.current, next);
    dataRef.current = next;
    setData(next);
    setHistoryTick((t) => t + 1);
  }, []);

  // A finished upload replaces its temporary image everywhere (current data and undo history)
  function replaceImage(from, to) {
    const swap = (d) => {
      const text = JSON.stringify(d);
      return text.includes(from) ? JSON.parse(text.split(JSON.stringify(from).slice(1, -1)).join(JSON.stringify(to).slice(1, -1))) : d;
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

  engineRef.current.replaceImage = replaceImage;

  // Full render when the preview first opens, the page changes or Refresh is pressed
  useEffect(() => {
    if (status === "ready") engineRef.current.renderFull();
  }, [status, page, previewKey]);

  // Each change: patch the preview (next frame) and schedule a background save
  useEffect(() => {
    if (status !== "ready") return;
    engineRef.current.scheduleSync();
    const quick = footerRef.current.quickSave;
    footerRef.current.quickSave = false;
    scheduleSave(quick ? 200 : 900);
  }, [data, customizer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selecting a section or block only moves the outline in the preview (shown in Edit mode);
  // picked in the sections list, the preview also scrolls to it
  useEffect(() => {
    const scroll = !fromPreviewRef.current;
    fromPreviewRef.current = false;
    engineRef.current.postToPreview({ type: "select", id: selected || "", block: selectedBlock, scroll });
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
  const moveSectionTo = useCallback((pageName, id, targetId, after) => {
    update((d) => {
      const t = d.templates[pageName];

      if (!t.sections[id] || !t.sections[targetId] || id === targetId) return;

      const order = t.order.filter((s) => s !== id);

      order.splice(order.indexOf(targetId) + (after ? 1 : 0), 0, id);

      t.order = order;
    });
  }, []);

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
        Object.entries(sync.images).forEach(([url, dataUrl]) => waiting.unshift({ type: "pending-image", url, dataUrl }));
        waiting.push({ type: "mode", edit: editModeRef.current });
        waiting.push({ type: "select", id: selectedRef.current || "", block: selectedBlockRef.current });
        waiting.forEach((m) => event.source.postMessage({ source: "tss-editor", ...m }, "*"));
        engineRef.current.scheduleSync();
      } else if (message.type === "patched") {
        // A section swap the customizer timed: "change made -> preview updated"
        const waiting = footerRef.current.waiting[message.token];
        if (waiting) {
          delete footerRef.current.waiting[message.token];
          const ms = waiting.kind === "footer: code save -> preview" ? Date.now() - waiting.at : performance.now() - waiting.at;
          if (ms >= 0) postSyncTiming(waiting.kind, ms);
        }
      } else if (message.type === "need-reload") {
        engineRef.current.renderFull();
      } else if (message.type === "scroll") {
        scrollRef.current = Math.max(0, Number(message.y) || 0);
      } else if (message.type === "leaving") {
        // Edit mode off and a link was followed: the editor page is gone until the preview reloads
        syncRef.current.ready = false;
        syncRef.current.away = true;
      } else if (message.type === "context" && typeof message.id === "string" && editModeRef.current) {
        // Edit mode: right-click selects the section or block and offers "Edit code"
        const section = dataRef.current && sectionIn(dataRef.current, pageRef.current, message.id);
        if (!section) return;
        const block = Number.isInteger(message.block) && section.blocks?.[message.block] ? message.block : null;
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
          file: section.type === "custom" ? "templates/index.liquid" : `sections/${section.type}.liquid`,
        });
        return;
      } else if (message.type === "select" && typeof message.id === "string" && editModeRef.current) {
        // Edit mode: a click in the preview selects a section or one of its blocks; empty space unselects
        const section = dataRef.current && sectionIn(dataRef.current, pageRef.current, message.id);
        const block = Number.isInteger(message.block) && section?.blocks?.[message.block] ? message.block : null;
        fromPreviewRef.current = true;
        if (!message.id) {
          setSelected(null);
        } else if (section && message.id === selectedRef.current) {
          setSelectedBlock(block);
        } else if (section) {
          pendingBlockRef.current = block;
          setSelected(message.id);
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
    if (!window.confirm("Reset all options of this section to their defaults? Its content blocks are kept.")) return;

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

      const destinationId = target.kind === "block" ? target.sectionId : target.kind === "into" ? target.id : null;

      const destination = destinationId && sectionIn(d, page, destinationId);

      // The footer's blocks stay in the footer (its block types are its own)
      if (destination !== from && (payload.sectionId === FOOTER || destinationId === FOOTER)) return;

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

        target = { kind: "block", sectionId, index: Number(index), after: e.clientY > box.top + box.height / 2 };
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
    return (
      <CenteredMessage>
        {status === "loading" ? "Loading theme..." : error}
      </CenteredMessage>
    );
  }

  const templateTypes = Object.entries(schema.sections).filter(
    ([type, spec]) => spec.pages.includes(page) && !spec.required && type !== "custom"
  );

  const section =
    selected && selected !== "theme" ? sectionIn(data, page, selected) : null;

  const sectionSpec = section ? schema.sections[section.type] : null;

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
    editing && shownSection && selectedBlock !== null && Boolean(shownSection.blocks?.[selectedBlock]);

  if (blockOpen) lastBlockRef.current = selectedBlock;

  const shownBlockIndex = blockOpen ? selectedBlock : lastBlockRef.current;

  const shownBlock = shownSection && shownBlockIndex !== null ? shownSection.blocks?.[shownBlockIndex] : null;

  const shownBlockSpec = shownBlock ? shownSpec.blocks[shownBlock.type] : null;

  const panelView = !editing ? 0 : blockOpen ? 2 : 1;

  const editSubtitle =
    shown === "theme" ? "Colours, fonts, buttons, header and footer" : shownSpec ? shownSpec.name : "";

  // While a block is dragged, other sections that accept it are shown as drop targets
  const blockTargets =
    drag?.kind === "block" && shownSection
      ? template.order.filter((id) => {
          const target = template.sections[id];
          const moving = template.sections[drag.sectionId]?.blocks?.[drag.index];
          return id !== drag.sectionId && moving && schema.sections[target.type].blocks?.[moving.type];
        })
      : [];

  return (
    <FontsContext.Provider value={schema.fonts || []}>
    <UploadsContext.Provider value={uploads}>
    <div className={`flex h-screen flex-col bg-[#F7F8FA] text-[#161C2C] ${drag ? "cursor-grabbing select-none" : ""}`}>
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#D8DFE8] bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/admin/online-store"
            onClick={(e) => {
              if (dirty && !window.confirm("Leave without saving? Your changes will be lost.")) e.preventDefault();
            }}
            className="text-sm text-[#53627E] hover:text-[#161C2C]"
          >
            ← Online store
          </Link>

          <span className="truncate font-semibold">
            Customize · {store.storeName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            className="h-9 rounded-lg border border-[#D8DFE8] px-3 text-sm hover:border-[#161C2C] lg:hidden"
            aria-expanded={panelOpen}
          >
            {panelOpen ? "Hide panel" : "Sections"}
          </button>

          <select
            value={page}
            onChange={(e) => {
              setPage(e.target.value);
              setSelected(null);
              setAdding(false);
            }}
            className="h-9 rounded-lg border border-[#D8DFE8] bg-white px-2 text-sm"
            aria-label="Page to edit"
          >
            {schema.pages.map((p) => (
              <option key={p} value={p}>
                {PAGE_LABELS[p] || p}
              </option>
            ))}
          </select>

          <a
            href="/editor-demo"
            target="_blank"
            rel="noopener"
            title="Open the theme code in a new tab; the two stay in step"
            className="h-9 rounded-lg border border-[#D8DFE8] px-3 text-sm leading-9 hover:border-[#161C2C]"
          >
            Edit code
          </a>

          {previewUrl && (
            <a
              href={previewUrl}
              onClick={(e) => {
                // Same tab, with the "Back to admin" bar; the store path of the page being edited
                e.preventDefault();
                openStorefront(new URL(previewUrl).pathname.replace(/^\/s\/[^/]+/, "") || "/");
              }}
              className="h-9 rounded-lg border border-[#D8DFE8] px-3 text-sm leading-9 hover:border-[#161C2C]"
            >
              View store
            </a>
          )}

          <div className="flex items-center rounded-lg border border-[#D8DFE8]">
            <button
              type="button"
              onClick={undo}
              disabled={!historyRef.current.past.length}
              className="flex h-9 w-9 items-center justify-center text-[#53627E] hover:text-[#161C2C] disabled:opacity-30"
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
            >
              <svg {...iconProps} className="h-4 w-4">
                <path d="M9 14 4 9l5-5" />
                <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
              </svg>
            </button>
            <span className="h-5 w-px bg-[#D8DFE8]" />
            <button
              type="button"
              onClick={redo}
              disabled={!historyRef.current.future.length}
              className="flex h-9 w-9 items-center justify-center text-[#53627E] hover:text-[#161C2C] disabled:opacity-30"
              aria-label="Redo"
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg {...iconProps} className="h-4 w-4">
                <path d="m15 14 5-5-5-5" />
                <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
              </svg>
            </button>
          </div>

          <span role="status" aria-live="polite" className="hidden min-w-0 items-center gap-1.5 text-xs sm:flex">
            {saveState === "saved" && (
              <span className="flex items-center gap-1 text-[#53627E]">
                <svg {...iconProps} strokeWidth="2.2" className="h-3.5 w-3.5 text-emerald-600">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
                All changes saved
              </span>
            )}
            {(saveState === "pending" || saveState === "saving") && (
              <span className="flex items-center gap-1.5 text-[#53627E]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#8A94A8]" />
                Saving...
              </span>
            )}
            {saveState === "error" && (
              <span className="flex items-center gap-1.5 text-red-600" title={saveError}>
                Couldn't save, retrying
                <button type="button" className="font-medium underline" onClick={() => engineRef.current.flushSave()}>
                  Retry now
                </button>
              </span>
            )}
            {saveState === "invalid" && (
              <span className="flex max-w-[260px] items-center gap-1.5 text-red-600" title={saveError}>
                <span className="truncate">Couldn't save: {saveError}</span>
                <button type="button" className="shrink-0 font-medium underline" onClick={undo}>
                  Undo
                </button>
              </span>
            )}
          </span>

          <button
            type="button"
            onClick={() => engineRef.current.flushSave()}
            disabled={!dirty || saveState === "saving"}
            className="h-9 rounded-lg bg-[#161C2C] px-4 text-sm font-semibold text-white hover:bg-[#252E45] disabled:opacity-40"
            title="Changes save automatically; this saves right away"
          >
            Save
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button type="button" className="text-xs underline" onClick={() => setError("")}>
            Dismiss
          </button>
        </p>
      )}

      {notice && (
        <p role="status" className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <div className="relative flex min-h-0 flex-1">
        {/* Side panel: list view and edit view slide inside the same panel */}
        <aside
          className={`absolute inset-y-0 left-0 z-30 w-[340px] max-w-[90vw] shrink-0 overflow-hidden border-r border-[#D8DFE8] bg-white shadow-xl transition-transform duration-200 ease-out motion-reduce:transition-none lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:shadow-none ${
            panelOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div
            className={`flex h-full w-[300%] transition-transform duration-200 ease-out motion-reduce:transition-none ${
              panelView === 2 ? "-translate-x-2/3" : panelView === 1 ? "-translate-x-1/3" : "translate-x-0"
            }`}
          >
        {/* List view (keeps its scroll position while editing) */}
        <div className="flex h-full w-1/3 flex-col overflow-y-auto" inert={panelView !== 0} aria-hidden={panelView !== 0}>
          <p className="px-4 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A94A8]">
            {PAGE_LABELS[page]}
          </p>

          <LayoutRows
            part="top"
            selected={selected}
            themeGroup={themeGroup}
            onOpen={(group) => {
              setThemeGroup(group);
              setSelected("theme");
            }}
          />

          <ul className="px-2">
            {template.order.map((id, i) => {
              const s = template.sections[id];

              const spec = schema.sections[s.type];

              const name = s.settings.heading || spec.name;

              const canRename = "heading" in spec.settings;

              const lineHere = dropTarget?.kind === "section" && dropTarget.id === id;

              const blockInto = dropTarget?.kind === "into" && dropTarget.id === id;

              const isSelected = selected === id;

              const showType = s.type !== "custom" && name.trim().toLowerCase() !== spec.name.toLowerCase();

              const menuOpen = rowMenu === id;

              // Actions appear on hover/focus (always on touch screens); stay visible while the menu is open
              const reveal = menuOpen
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";

              return (
                <li key={id} data-drop-section={id} className={`relative ${drag?.kind === "section" && drag.id === id ? "opacity-40" : ""}`}>
                  {lineHere && <DropLine after={dropTarget.after} />}

                  <div
                    className={`group flex h-9 items-center gap-2 rounded-md pl-1.5 pr-1 text-sm ${
                      blockInto
                        ? "bg-[#EEF1F6] ring-1 ring-[#141b2d]/30"
                        : isSelected
                        ? "bg-[#EEF1F6]"
                        : "hover:bg-[#F5F6F8]"
                    }`}
                  >
                    {/* The type icon turns into the drag handle on hover */}
                    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                      <svg
                        {...iconProps}
                        className={`h-4 w-4 group-hover:invisible group-focus-within:invisible [@media(hover:none)]:invisible ${
                          s.hidden ? "text-[#C2C9D6]" : "text-[#8A94A8]"
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
                            if (e.key === "ArrowDown" && i < template.order.length - 1) {
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
                        className="h-7 min-w-0 flex-1 rounded border border-[#161C2C] bg-white px-2 text-sm outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-baseline gap-1.5 text-left"
                        onClick={() => setSelected(id)}
                        onDoubleClick={() => canRename && startRename(id)}
                        title={showType ? `${name} (${spec.name})` : name}
                      >
                        <span className={`truncate ${s.hidden ? "text-[#A3ADBF]" : "text-[#161C2C]"} ${isSelected ? "font-medium" : ""}`}>
                          {name}
                        </span>
                        {showType && <span className="shrink-0 truncate text-xs text-[#A3ADBF]">{spec.name}</span>}
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
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                              <circle cx="5" cy="12" r="1.6" />
                              <circle cx="12" cy="12" r="1.6" />
                              <circle cx="19" cy="12" r="1.6" />
                            </svg>
                          </button>

                          {menuOpen && (
                            <div
                              role="menu"
                              data-row-menu
                              className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-[#E3E7ED] bg-white py-1 text-sm shadow-lg"
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
            <p className="px-4 py-2 text-xs text-[#53627E]">
              No sections yet. Your store shows a simple default layout until you add one.
            </p>
          )}

          {/* Add section */}
          <div className="px-2 pb-3 pt-1">
            {adding ? (
              <div className="rounded-xl border border-[#D8DFE8] bg-[#F7F8FA] p-3">
                <label className="block text-xs font-medium text-[#30466F]" htmlFor="new-section-name">
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
                    className="h-9 min-w-0 flex-1 rounded-lg border border-[#D8DFE8] bg-white px-2.5 text-sm outline-none focus:border-[#161C2C]"
                  />

                  <button
                    type="button"
                    onClick={addCustomSection}
                    disabled={!newName.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#161C2C] text-white hover:bg-[#252E45] disabled:opacity-30"
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
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D8DFE8] bg-white text-[#53627E] hover:border-[#161C2C] hover:text-[#161C2C]"
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
                    <p className="mt-3 text-[11px] text-[#53627E]">Or start from a template:</p>

                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {templateTypes.map(([type, spec]) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => addTemplateSection(type)}
                          className="rounded-full border border-[#D8DFE8] bg-white px-2.5 py-1 text-xs text-[#30466F] hover:border-[#161C2C] hover:text-[#161C2C]"
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
                className="flex h-9 w-full items-center gap-2 rounded-md px-1.5 text-sm font-medium text-[#30466F] hover:bg-[#F5F6F8] hover:text-[#161C2C]"
              >
                <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                  <svg {...iconProps} strokeWidth="2" className="h-4 w-4">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                Add section
              </button>
            )}
          </div>

          <LayoutRows
            part="bottom"
            selected={selected}
            themeGroup={themeGroup}
            footerSynced={Boolean(data.sections?.footer)}
            onOpen={(group) => {
              // The synced footer has its own panel (its options come from sections/footer.liquid)
              if (group === "footer" && data.sections?.footer) {
                setSelected(FOOTER);
                return;
              }
              setThemeGroup(group);
              setSelected("theme");
            }}
          />

          <div className="mt-auto border-t border-[#D8DFE8] p-2">
            <button
              type="button"
              onClick={() => {
                setThemeGroup("colors");
                setSelected("theme");
              }}
              className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
                selected === "theme" ? "bg-[#EEF1F6]" : "hover:bg-[#F7F8FA]"
              }`}
            >
              Theme settings (colors, fonts, buttons)
            </button>
          </div>
        </div>

        {/* Edit view */}
        <div className="flex h-full w-1/3 flex-col" inert={panelView !== 1} aria-hidden={panelView !== 1}>
          <div className="flex shrink-0 items-center gap-2 border-b border-[#D8DFE8] px-3 py-3">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#53627E] hover:bg-[#F3F6FA] hover:text-[#161C2C]"
              aria-label="Back to sections"
              title="Back (Esc)"
            >
              <svg {...iconProps} strokeWidth="2" className="h-4 w-4">
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
            </button>

            <div className="min-w-0">
              <h2 className="truncate font-semibold leading-tight">{editTitle}</h2>
              <p className="truncate text-xs text-[#8A94A8]">{editSubtitle}</p>
            </div>
          </div>

          <div ref={editScrollRef} className={`min-h-0 flex-1 overflow-y-auto px-4`}>
            {shown === "theme" ? (
              <GroupedFields
                key={`theme-${themeGroup}`}
                fields={schema.settings}
                values={data.settings}
                groups={(schema.theme_groups || [{ id: "store", label: "Store" }]).filter(
                  // The synced footer is edited in its own panel (Footer in the sections list)
                  (group) => !(group.id === "footer" && data.sections?.footer)
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
                  <div className="mt-4 rounded-lg border border-dashed border-[#C9D1DD] bg-[#F7F8FA] p-2">
                    <p className="px-1 pb-1.5 text-[11px] font-medium text-[#53627E]">Drop on a section to move the block there</p>

                    <ul className="grid gap-1">
                      {blockTargets.map((id) => (
                        <li
                          key={id}
                          data-drop-section={id}
                          className={`truncate rounded-md border bg-white px-2.5 py-2 text-sm ${
                            dropTarget?.kind === "into" && dropTarget.id === id
                              ? "border-[#141b2d] ring-2 ring-[#141b2d]/20"
                              : "border-[#D8DFE8]"
                          }`}
                        >
                          {template.sections[id].settings.heading || schema.sections[template.sections[id].type].name}
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
            <div className="flex shrink-0 items-center gap-1 border-t border-[#D8DFE8] bg-white px-3 py-2">
              <button
                type="button"
                onClick={() => resetSection(shown)}
                className="rounded-md px-2 py-1.5 text-xs font-medium text-[#53627E] hover:bg-[#F3F6FA] hover:text-[#161C2C]"
              >
                Reset to default
              </button>

              <span className="flex-1" />

              {!shownSpec.required && (
                <>
                  <button
                    type="button"
                    onClick={() => duplicateSection(shown)}
                    className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#53627E] hover:bg-[#F3F6FA] hover:text-[#161C2C]"
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
        <div className="flex h-full w-1/3 flex-col" inert={panelView !== 2} aria-hidden={panelView !== 2}>
          <div className="flex shrink-0 items-center gap-2 border-b border-[#D8DFE8] px-3 py-3">
            <button
              type="button"
              onClick={() => setSelectedBlock(null)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#53627E] hover:bg-[#F3F6FA] hover:text-[#161C2C]"
              aria-label="Back to section"
              title="Back (Esc)"
            >
              <svg {...iconProps} strokeWidth="2" className="h-4 w-4">
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
            </button>

            <div className="min-w-0">
              <h2 className="truncate font-semibold leading-tight">{shownBlockSpec?.name || "Block"}</h2>
              <p className="truncate text-xs text-[#8A94A8]">
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
                  updateBlocks(shown, (list) => {
                    list[shownBlockIndex].settings[key] = value;
                  }, `b:${shown}:${shownBlockIndex}:${key}`)
                }
              />
            )}
          </div>

          {shownBlock && (
            <div className="flex shrink-0 items-center gap-1 border-t border-[#D8DFE8] bg-white px-3 py-2">
              <button
                type="button"
                onClick={() => toggleBlockHidden(shown, shownBlockIndex)}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#53627E] hover:bg-[#F3F6FA] hover:text-[#161C2C]"
              >
                <EyeIcon hidden={!shownBlock.hidden} />
                {shownBlock.hidden ? "Show" : "Hide"}
              </button>

              <span className="flex-1" />

              <button
                type="button"
                onClick={() => duplicateBlock(shown, shownBlockIndex)}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#53627E] hover:bg-[#F3F6FA] hover:text-[#161C2C]"
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
          <div className="mb-2 flex items-center justify-between text-xs text-[#53627E]">
            <span>
              {previewError
                ? `Preview not updated: ${previewError}`
                : `${page === "blog" || page === "article" ? "Sample posts. " : ""}${
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
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[#161C2C]/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                  editMode
                    ? "border-[#161C2C] bg-[#161C2C] text-white"
                    : "border-[#D8DFE8] bg-white text-[#53627E] hover:border-[#161C2C] hover:text-[#161C2C]"
                }`}
              >
                <svg {...iconProps} className="h-3.5 w-3.5">
                  <path d="M4 3l7 17 2.5-7.5L21 10z" />
                </svg>
                Edit mode
                <span className="font-semibold">{editMode ? "On" : "Off"}</span>
              </button>

              <div className="flex rounded-lg border border-[#D8DFE8] bg-white p-0.5" role="radiogroup" aria-label="Preview size">
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
                      device === id ? "bg-[#161C2C] text-white" : "text-[#53627E] hover:text-[#161C2C]"
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
                className="hover:text-[#161C2C]"
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
              className={`mx-auto min-h-0 flex-1 rounded-xl border border-[#D8DFE8] bg-white transition-[width] duration-200 ${
                device === "mobile" ? "w-[390px] max-w-full" : "w-full"
              } ${drag ? "pointer-events-none" : ""}`}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#D8DFE8] text-sm text-[#53627E]">
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
          className="fixed z-50 w-40 rounded-lg border border-[#D8DFE8] bg-white p-1 shadow-lg"
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              window.open(`/editor-demo?file=${encodeURIComponent(contextMenu.file)}`, "_blank", "noopener");
              setContextMenu(null);
            }}
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-[#F7F8FA]"
          >
            Edit code
          </button>
        </div>
      )}
    </div>
    </UploadsContext.Provider>
    </FontsContext.Provider>
  );
}

// The fonts the theme can use (from the schema), shared with every font picker
const FontsContext = createContext([]);

// Image fields: show a picked image in the preview at once, and hold autosave until uploads finish
const UploadsContext = createContext(null);

// One stable change handler per option, so unchanged options don't re-render
function useOptionHandlers(onChange) {
  const ref = useRef(onChange);
  ref.current = onChange;
  const handlers = useRef({});
  return (key) => (handlers.current[key] ||= (value) => ref.current(key, value));
}

// Loads every Google font once (regular weight) so the font picker can show each name in its own font
function useFontPreviews(fonts, active) {
  useEffect(() => {
    if (!active || document.getElementById("tss-font-previews")) return;
    const families = fonts
      .filter((f) => f.google)
      .map((f) => `family=${encodeURIComponent(f.google).replace(/%20/g, "+")}:wght@400`);
    if (!families.length) return;
    const link = document.createElement("link");
    link.id = "tss-font-previews";
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
    document.head.appendChild(link);
  }, [fonts, active]);
}

function FontPicker({ value, allowTheme, onChange, label }) {
  const fonts = useContext(FontsContext);

  const [open, setOpen] = useState(false);

  const ref = useRef(null);

  useFontPreviews(fonts, open);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const current = fonts.find((f) => f.key === value);

  const options = [...(allowTheme ? [{ key: "", label: "Use theme font", stack: "inherit" }] : []), ...fonts];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Escape" && open && (e.preventDefault(), setOpen(false))}
        className={`${inputClass} flex items-center justify-between text-left`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        style={{ fontFamily: current?.stack }}
      >
        <span className="truncate">{current ? current.label : "Use theme font"}</span>
        <svg {...iconProps} className="h-4 w-4 shrink-0 text-[#8A94A8]">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul role="listbox" className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[#D8DFE8] bg-white py-1 shadow-lg">
          {options.map((font) => (
            <li key={font.key || "theme"}>
              <button
                type="button"
                role="option"
                aria-selected={font.key === value}
                onClick={() => {
                  onChange(font.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[15px] hover:bg-[#F7F8FA] ${
                  font.key === value ? "bg-[#EEF1F6]" : ""
                }`}
                style={{ fontFamily: font.stack }}
              >
                {font.label}
                {font.google && <span className="font-sans text-[10px] uppercase text-[#A3ADBF]">Google</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Size in px with quick presets; 0 means "use the theme size"
function FontSizeInput({ spec, value, onChange }) {
  const presets = Object.entries(spec.presets || {});

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => onChange(0)}
          className={`rounded-md border px-2 py-1 text-[11px] ${!value ? "border-[#161C2C] bg-[#161C2C] text-white" : "border-[#D8DFE8] text-[#30466F] hover:border-[#161C2C]"}`}
        >
          Theme
        </button>
        {presets.map(([name, size]) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(size)}
            className={`rounded-md border px-2 py-1 text-[11px] ${value === size ? "border-[#161C2C] bg-[#161C2C] text-white" : "border-[#D8DFE8] text-[#30466F] hover:border-[#161C2C]"}`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="flex h-10 items-center overflow-hidden rounded-lg border border-[#D8DFE8] bg-white focus-within:border-[#161C2C]">
        <input
          type="number"
          min={spec.min}
          max={spec.max}
          value={value || ""}
          placeholder="Theme"
          onChange={(e) => {
            const n = Math.round(Number(e.target.value));
            if (e.target.value === "") onChange(0);
            else if (!Number.isNaN(n)) onChange(n);
          }}
          onBlur={(e) => {
            const n = Math.round(Number(e.target.value));
            if (n) onChange(Math.min(spec.max, Math.max(spec.min, n)));
          }}
          className="h-full min-w-0 flex-1 px-3 text-sm outline-none"
          aria-label={spec.label}
        />
        <span className="border-l border-[#D8DFE8] bg-[#F7F8FA] px-3 text-xs leading-10 text-[#53627E]">{spec.unit || "px"}</span>
      </div>
    </div>
  );
}

// A link to a page, product, collection, email, phone number or any web address
const LINK_KINDS = [
  ["url", "Web address"],
  ["page", "Page"],
  ["collection", "Collection"],
  ["product", "Product"],
  ["email", "Email"],
  ["phone", "Phone"],
];

const PAGES_TO_LINK = [
  ["/", "Home page"],
  ["/collections/all", "All products"],
];

function linkKind(value) {
  if (!value) return "url";
  if (value.startsWith("mailto:")) return "email";
  if (value.startsWith("tel:")) return "phone";
  if (/^\/collections\/[0-9a-f-]{36}$/i.test(value)) return "collection";
  if (/^\/products\/[0-9a-f-]{36}$/i.test(value)) return "product";
  if (PAGES_TO_LINK.some(([path]) => path === value)) return "page";
  return "url";
}

function LinkPicker({ value, collections, products, onChange, label }) {
  const [kind, setKind] = useState(() => linkKind(value));

  const choose = (next) => {
    setKind(next);
    if (next === "page") onChange("/collections/all");
    else if (next === "collection") onChange(collections[0] ? `/collections/${collections[0].id}` : "");
    else if (next === "product") onChange(products[0] ? `/products/${products[0].id}` : "");
    else if (next === "email") onChange("mailto:");
    else if (next === "phone") onChange("tel:");
    else onChange("");
  };

  return (
    <div className="grid gap-1.5">
      <select className={inputClass} value={kind} onChange={(e) => choose(e.target.value)} aria-label={`${label}: link type`}>
        {LINK_KINDS.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>

      {kind === "page" && (
        <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
          {PAGES_TO_LINK.map(([path, name]) => (
            <option key={path} value={path}>
              {name}
            </option>
          ))}
        </select>
      )}

      {kind === "collection" && (
        <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
          {collections.length === 0 && <option value="">No collections yet</option>}
          {collections.map((c) => (
            <option key={c.id} value={`/collections/${c.id}`}>
              {c.name}{c.status === "draft" ? " (Draft, hidden on store)" : ""}
            </option>
          ))}
        </select>
      )}

      {kind === "product" && (
        <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
          {products.length === 0 && <option value="">No products yet</option>}
          {products.map((p) => (
            <option key={p.id} value={`/products/${p.id}`}>
              {p.title}
            </option>
          ))}
        </select>
      )}

      {kind === "email" && (
        <input
          className={inputClass}
          type="email"
          placeholder="hello@yourstore.com"
          value={value.replace(/^mailto:/, "")}
          onChange={(e) => onChange(`mailto:${e.target.value.trim()}`)}
          aria-label={label}
        />
      )}

      {kind === "phone" && (
        <input
          className={inputClass}
          type="tel"
          placeholder="+91 98765 43210"
          value={value.replace(/^tel:/, "")}
          onChange={(e) => onChange(`tel:${e.target.value.replace(/[^\d+]/g, "")}`)}
          aria-label={label}
        />
      )}

      {kind === "url" && (
        <input
          className={inputClass}
          value={value}
          placeholder="https://... , /collections/all or #section-id"
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
      )}
    </div>
  );
}

// An option that was changed from the theme default gets a small reset link
function isOverridden(spec, value) {
  return spec.theme_default && JSON.stringify(value ?? spec.default) !== JSON.stringify(spec.default);
}

function ResetToTheme({ spec, value, onChange }) {
  if (!isOverridden(spec, value)) return null;

  return (
    <button
      type="button"
      onClick={() => onChange(structuredClone(spec.default))}
      className="mt-1 text-[11px] font-medium text-[#30466F] underline-offset-2 hover:underline"
    >
      Reset to theme default
    </button>
  );
}

// An option with "show_if" only appears when the other options match ("*" = has any value)
function isShown(spec, values) {
  if (!spec.show_if) return true;
  return Object.entries(spec.show_if).every(([key, expected]) =>
    expected === "*"
      ? Boolean(values[key])
      : Array.isArray(expected)
      ? expected.includes(values[key])
      : values[key] === expected
  );
}

const optionLabel = (spec, option) =>
  spec.labels?.[option] || option.charAt(0).toUpperCase() + option.slice(1).replace(/[-_]/g, " ");

function Fields({ fields, values, collections, products = [], onChange }) {
  const handlerFor = useOptionHandlers(onChange);

  return (
    <div className="grid gap-4">
      {Object.entries(fields)
        .filter(([, spec]) => isShown(spec, values))
        .map(([key, spec]) => (
          <div key={key}>
            <Field
              spec={spec}
              value={values[key]}
              collections={collections}
              products={products}
              onChange={handlerFor(key)}
            />
            <ResetToTheme spec={spec} value={values[key]} onChange={handlerFor(key)} />
          </div>
        ))}
    </div>
  );
}

// Section options in collapsible groups; "Content" starts open, `extra` (blocks) goes at its end
function GroupedFields({ fields, values, groups, collections, products, onChange, extra, initialOpen = "content" }) {
  const [open, setOpen] = useState({ [initialOpen]: true });

  const handlerFor = useOptionHandlers(onChange);

  const visible = Object.entries(fields).filter(([, spec]) => isShown(spec, values));

  return (
    <div className="-mx-4">
      {groups.map((group) => {
        const entries = visible.filter(([, spec]) => (spec.group || "content") === group.id);

        const hasExtra = group.id === "content" && extra;

        if (!entries.length && !hasExtra) return null;

        const isOpen = Boolean(open[group.id]);

        return (
          <section key={group.id} className="border-b border-[#EEF0F4] last:border-b-0">
            <button
              type="button"
              onClick={() => setOpen((current) => ({ ...current, [group.id]: !current[group.id] }))}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[#161C2C] hover:bg-[#F7F8FA]"
              aria-expanded={isOpen}
            >
              {group.label}

              <svg {...iconProps} className={`h-4 w-4 text-[#8A94A8] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {isOpen && (
              <div className="grid gap-4 px-4 pb-5 pt-1">
                {entries.map(([key, spec]) => (
                  <div key={key}>
                    <Field
                      spec={spec}
                      value={values[key]}
                      collections={collections}
                      products={products}
                      onChange={handlerFor(key)}
                    />
                    <ResetToTheme spec={spec} value={values[key]} onChange={handlerFor(key)} />
                  </div>
                ))}

                {hasExtra && extra}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Help({ spec }) {
  return spec.help ? <span className="mt-1 block text-[11px] leading-snug text-[#8A94A8]">{spec.help}</span> : null;
}

const Field = memo(function Field({ spec, value, collections, products = [], onChange }) {
  const label = (
    <span className="mb-1 block text-xs font-medium text-[#30466F]">
      {spec.label}
    </span>
  );

  switch (spec.type) {
    case "checkbox":
      return (
        <div>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>{spec.label}</span>

            <span className="relative inline-flex shrink-0">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={Boolean(value)}
                onChange={(e) => onChange(e.target.checked)}
              />
              <span className="h-5 w-9 rounded-full bg-[#CBD3DF] transition-colors peer-checked:bg-[#161C2C] peer-focus-visible:ring-2 peer-focus-visible:ring-[#161C2C]/30" />
              <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
            </span>
          </label>

          <Help spec={spec} />
        </div>
      );

    case "range":
      return (
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs font-medium text-[#30466F]">
            {spec.label}
            <span className="tabular-nums text-[#53627E]">
              {value}
              {spec.unit || ""}
            </span>
          </span>

          <input
            type="range"
            min={spec.min}
            max={spec.max}
            step={spec.step || 1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-[#161C2C]"
          />

          <Help spec={spec} />
        </label>
      );

    case "number":
      return (
        <label className="block">
          {label}

          <div className="flex h-10 items-center overflow-hidden rounded-lg border border-[#D8DFE8] bg-white focus-within:border-[#161C2C]">
            <input
              type="number"
              min={spec.min}
              max={spec.max}
              value={value}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (e.target.value !== "" && !Number.isNaN(n)) onChange(Math.round(n));
              }}
              onBlur={(e) => onChange(Math.min(spec.max, Math.max(spec.min, Math.round(Number(e.target.value) || spec.min))))}
              className="h-full min-w-0 flex-1 px-3 text-sm outline-none"
            />
            {spec.unit && <span className="border-l border-[#D8DFE8] bg-[#F7F8FA] px-3 text-xs leading-10 text-[#53627E]">{spec.unit}</span>}
          </div>

          <Help spec={spec} />
        </label>
      );

    case "select":
      if (spec.ui === "segmented") {
        return (
          <div>
            {label}

            <div className="flex rounded-lg border border-[#D8DFE8] bg-[#F7F8FA] p-0.5" role="radiogroup" aria-label={spec.label}>
              {spec.options.map((o) => (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={value === o}
                  onClick={() => onChange(o)}
                  className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    value === o ? "bg-white text-[#161C2C] shadow-sm" : "text-[#53627E] hover:text-[#161C2C]"
                  }`}
                >
                  {optionLabel(spec, o)}
                </button>
              ))}
            </div>

            <Help spec={spec} />
          </div>
        );
      }

      return (
        <label className="block">
          {label}

          <select
            className={inputClass}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            {spec.options.map((o) => (
              <option key={o} value={o}>
                {optionLabel(spec, o)}
              </option>
            ))}
          </select>

          <Help spec={spec} />
        </label>
      );

    case "color":
      return (
        <label className="block">
          {label}

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className="h-10 w-12 rounded border border-[#D8DFE8]"
            />

            <span className="text-sm tabular-nums">
              {value}
            </span>
          </div>

          <Help spec={spec} />
        </label>
      );

    case "color_optional":
      return (
        <div>
          {label}

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value || "#FFFFFF"}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className={`h-10 w-12 rounded border border-[#D8DFE8] ${value ? "" : "opacity-40"}`}
              aria-label={spec.label}
            />

            <span className="min-w-0 flex-1 text-sm tabular-nums text-[#53627E]">{value || "None"}</span>

            <button
              type="button"
              disabled={!value}
              onClick={() => onChange("")}
              className="rounded-md border border-[#D8DFE8] px-2 py-1 text-xs text-[#30466F] hover:border-[#161C2C] disabled:opacity-40"
            >
              None
            </button>
          </div>

          <Help spec={spec} />
        </div>
      );

    case "font":
      return (
        <div>
          {label}

          <FontPicker value={value || ""} allowTheme={Boolean(spec.theme_default)} onChange={onChange} label={spec.label} />

          <Help spec={spec} />
        </div>
      );

    case "font_size":
      return (
        <div>
          {label}

          <FontSizeInput spec={spec} value={value} onChange={onChange} />

          <Help spec={spec} />
        </div>
      );

    case "url":
      return (
        <div>
          {label}

          <LinkPicker
            value={value || ""}
            collections={collections}
            products={products}
            onChange={onChange}
            label={spec.label}
          />

          <Help spec={spec} />
        </div>
      );

    case "collection":
      return (
        <label className="block">
          {label}

          <select
            className={inputClass}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Newest products</option>

            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.status === "draft" ? " (Draft, hidden on store)" : ""}
              </option>
            ))}
          </select>

          <Help spec={spec} />
        </label>
      );

    case "image":
      return (
        <div>
          {label}

          <ImageUpload value={value} onChange={onChange} />

          <Help spec={spec} />
        </div>
      );

    case "products":
      return (
        <div>
          {label}

          <ProductPicker value={value || []} products={products} max={spec.max || 24} onChange={onChange} />

          <Help spec={spec} />
        </div>
      );

    case "collections":
      return (
        <div>
          {label}

          <ProductPicker
            value={value || []}
            products={collections.map((c) => ({ id: c.id, title: c.name, status: c.status || "active" }))}
            max={spec.max || 12}
            noun="collections"
            onChange={onChange}
          />
        </div>
      );

    case "richtext":
      return (
        <div>
          {label}

          <RichTextEditor value={value || ""} onChange={onChange} />

          <Help spec={spec} />
        </div>
      );

    case "embed":
      return (
        <label className="block">
          {label}

          <textarea
            rows={6}
            value={value}
            spellCheck={false}
            placeholder='<iframe src="https://www.google.com/maps/embed?..."></iframe>'
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-[#D8DFE8] px-3 py-2 font-mono text-xs outline-none focus:border-[#161C2C]"
          />

          <span className="mt-1 block text-[11px] leading-snug text-[#53627E]">
            Scripts and unsafe code are removed when you save. Embeds work from Google Maps,
            Google Forms, Spotify, SoundCloud and Calendly.
          </span>
        </label>
      );

    case "textarea":
    case "menu":
      return (
        <label className="block">
          {label}

          <textarea
            rows={spec.type === "menu" ? 5 : 3}
            value={value}
            placeholder={spec.type === "menu" ? "Shop all | /collections/all\nContact | mailto:hello@example.com" : ""}
            spellCheck={spec.type !== "menu"}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-[#D8DFE8] px-3 py-2 text-sm outline-none focus:border-[#161C2C]"
          />

          <Help spec={spec} />
        </label>
      );

    default:
      // text, url, anchor (section ID), css_class
      return (
        <label className="block">
          {label}

          <input
            className={inputClass}
            value={value}
            placeholder={
              spec.type === "url" ? "/collections/all" : spec.type === "anchor" ? "e.g. our-story" : ""
            }
            onChange={(e) => onChange(e.target.value)}
          />

          <Help spec={spec} />
        </label>
      );
  }
});

// Short summary shown on a block row
function blockTitle(block, blockSpec, i) {
  const s = block.settings || {};
  const strip = (html) => (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const text =
    s.heading ||
    s.title ||
    s.text ||
    s.label ||
    strip(s.body) ||
    (s.items ? s.items.split("\n").find((line) => line.trim()) : "") ||
    s.address ||
    s.alt ||
    (s.products?.length ? `${s.products.length} product${s.products.length === 1 ? "" : "s"}` : "") ||
    (s.collections?.length ? `${s.collections.length} collection${s.collections.length === 1 ? "" : "s"}` : "") ||
    (block.type === "spacer" ? `${s.height}px` : "") ||
    s.url ||
    "";
  return text ? `${blockSpec.name}: ${text}` : `${blockSpec.name} ${i + 1}`;
}

// The blocks of a section: add any type, open one to edit it, drag to reorder or onto another section
function SectionBlocks({ sectionId, spec, blocks, drag, dropTarget, startDrag, onChange, onOpen, onDuplicate, onToggle, onRemove }) {
  const types = Object.entries(spec.blocks);

  const [menu, setMenu] = useState(false);

  const full = blocks.length >= spec.max_blocks;

  // Some types have their own limit (e.g. at most 8 slides)
  const atLimit = (type) =>
    spec.type_limits?.[type] !== undefined && blocks.filter((b) => b.type === type).length >= spec.type_limits[type];

  function add(type, blockSpec) {
    onChange((list) => list.push({ type, hidden: false, settings: defaultsOf(blockSpec.settings) }));
    setMenu(false);
    onOpen(blocks.length);
  }

  function move(i, delta) {
    const j = i + delta;
    if (j < 0 || j >= blocks.length) return;
    onChange((list) => {
      [list[i], list[j]] = [list[j], list[i]];
    });
  }

  return (
    <div className="border-t border-[#EEF0F4] pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Blocks <span className="font-normal text-[#8A94A8]">({blocks.length}/{spec.max_blocks})</span>
        </h3>

        <button
          type="button"
          className={smallButton}
          disabled={full}
          onClick={() => setMenu((v) => !v)}
          aria-expanded={menu}
        >
          + Add block
        </button>
      </div>

      {menu && (
        <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-lg border border-[#D8DFE8] bg-[#F7F8FA] p-2" role="menu">
          {types.map(([type, blockSpec]) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              disabled={atLimit(type)}
              title={atLimit(type) ? `Up to ${spec.type_limits[type]} ${blockSpec.name.toLowerCase()}s` : undefined}
              onClick={() => add(type, blockSpec)}
              className="truncate rounded-md border border-[#D8DFE8] bg-white px-2 py-1.5 text-left text-xs text-[#161C2C] hover:border-[#161C2C] disabled:opacity-40 disabled:hover:border-[#D8DFE8]"
            >
              {blockSpec.name}
            </button>
          ))}
        </div>
      )}

      {blocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#D8DFE8] px-3 py-4 text-center text-xs text-[#53627E]">
          No blocks yet. Use "+ Add block" to add text, images, buttons, lists and more.
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {blocks.map((block, i) => {
            const blockSpec = spec.blocks[block.type];

            const lineHere = dropTarget?.kind === "block" && dropTarget.sectionId === sectionId && dropTarget.index === i;

            const dragging = drag?.kind === "block" && drag.sectionId === sectionId && drag.index === i;

            if (!blockSpec) return null;

            const title = blockTitle(block, blockSpec, i);

            return (
              <li
                key={i}
                data-drop-block={`${sectionId}|${i}`}
                className={`relative rounded-lg border border-[#D8DFE8] bg-white ${dragging ? "opacity-40" : ""}`}
              >
                {lineHere && <DropLine after={dropTarget.after} />}

                <div className="flex items-center gap-1 px-1.5 py-1.5 text-sm">
                  <DragHandle
                    label={`Move ${blockSpec.name}`}
                    onPointerDown={(e) => startDrag(e, { kind: "block", sectionId, index: i })}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        move(i, -1);
                      }
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        move(i, 1);
                      }
                    }}
                  />

                  <button
                    type="button"
                    className={`min-w-0 flex-1 truncate text-left ${block.hidden ? "text-[#A3ADBF]" : ""}`}
                    onClick={() => onOpen(i)}
                    title={title}
                  >
                    {title}
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggle(i)}
                    className={iconButton}
                    aria-label={block.hidden ? `Show ${blockSpec.name}` : `Hide ${blockSpec.name}`}
                    aria-pressed={!block.hidden}
                    title={block.hidden ? "Hidden: click to show" : "Visible: click to hide"}
                  >
                    <EyeIcon hidden={block.hidden} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDuplicate(i)}
                    disabled={full || atLimit(block.type)}
                    className={`${iconButton} disabled:opacity-30`}
                    aria-label={`Duplicate ${blockSpec.name}`}
                    title="Duplicate"
                  >
                    <svg {...iconProps} className="h-3.5 w-3.5">
                      <rect x="8" y="8" width="13" height="13" rx="2" />
                      <path d="M4 16V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  </button>

                  {!spec.required_blocks?.includes(block.type) && (
                    <button
                      type="button"
                      className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                      onClick={() => onRemove(i)}
                      aria-label={`Delete ${blockSpec.name}`}
                      title="Delete"
                    >
                      <svg {...iconProps} className="h-3.5 w-3.5">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {blocks.length > 0 && (
        <p className="mt-2 text-[11px] text-[#A3ADBF]">
          Click a block to edit it. Drag by the handle to reorder, or onto another section that appears below.
        </p>
      )}
    </div>
  );
}

function EyeIcon({ hidden }) {
  return (
    <svg {...iconProps} className="h-3.5 w-3.5">
      {hidden ? (
        <>
          <path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
          <path d="m2 2 20 20M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

// Resize big images in the browser (max 1920px wide) and make a small copy for the instant preview
async function prepareImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const draw = (maxWidth, type, quality) =>
      new Promise((resolve) => {
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), type, quality);
      });
    const needsResize = img.naturalWidth > 1920 || file.size > 1.5 * 1024 * 1024;
    const resized = needsResize ? await draw(1920, "image/webp", 0.86) : null;
    const small = await draw(1280, "image/webp", 0.8);
    const dataUrl = small
      ? await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(small);
        })
      : null;
    const blob = resized && resized.size < file.size ? resized : file;
    return { blob, dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ImageUpload({ value, onChange }) {
  const uploads = useContext(UploadsContext);

  const inputRef = useRef(null);

  const [progress, setProgress] = useState(null); // 0..1 while uploading

  const [localUrl, setLocalUrl] = useState(null);

  const [error, setError] = useState("");

  async function choose(file) {
    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Not a supported image. Use JPG, PNG or WEBP.");
      return;
    }

    setError("");
    setProgress(0);

    let prepared;
    try {
      prepared = await prepareImage(file);
    } catch {
      prepared = { blob: file, dataUrl: null };
    }

    if (prepared.blob.size > MAX_IMAGE_SIZE) {
      setProgress(null);
      setError("Image is too large. Maximum size is 5MB.");
      return;
    }

    // Show it straight away: a temporary address the preview swaps for the local copy
    const previous = value || "";
    const token = `https://pending.invalid/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.img`;
    setLocalUrl(prepared.dataUrl || URL.createObjectURL(prepared.blob));
    if (prepared.dataUrl) uploads?.registerPendingImage(token, prepared.dataUrl);
    onChange(token);

    uploads?.begin();
    const name = file.name.replace(/\.[^.]+$/, "") + (prepared.blob.type === "image/webp" ? ".webp" : "");
    const res = await uploadThemeImage(new File([prepared.blob], name || "image", { type: prepared.blob.type || file.type }), setProgress);
    uploads?.end();

    if (res.ok) {
      // Swap in the real address once it has loaded, so the picture never flickers
      const real = res.data.url;
      const probe = new Image();
      probe.onload = probe.onerror = () => setLocalUrl(null);
      probe.src = real;
      uploads?.replace(token, real);
    } else {
      setLocalUrl(null);
      setError(res.error);
      uploads?.replace(token, previous);
    }
    setProgress(null);
  }

  const shown = localUrl || (value && !value.startsWith("https://pending.invalid/") ? value : "");

  return (
    <div>
      {shown ? (
        <div className="relative overflow-hidden rounded-lg border border-[#D8DFE8]">
          <img src={shown} alt="" loading="lazy" className="h-28 w-full object-cover" />

          {progress !== null && (
            <div className="absolute inset-x-0 top-0 h-1 bg-black/10" aria-label="Uploading">
              <div className="h-full bg-[#161C2C] transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/50 to-transparent p-1.5">
            {progress !== null && (
              <span className="mr-auto rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Uploading {Math.round(progress * 100)}%
              </span>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={progress !== null}
              className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-[#161C2C] disabled:opacity-60"
            >
              Replace
            </button>

            <button
              type="button"
              onClick={() => onChange("")}
              disabled={progress !== null}
              className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-red-600 disabled:opacity-60"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            choose(e.dataTransfer.files?.[0]);
          }}
          className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#D8DFE8] text-xs text-[#53627E] hover:border-[#161C2C]"
        >
          <span className="font-medium text-[#161C2C]">Upload image</span>
          JPG, PNG or WEBP, up to 5MB
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Pick items one by one (products or collections); the order picked is the order shown
function ProductPicker({ value, products, max, noun = "products", onChange }) {
  const [query, setQuery] = useState("");

  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  const matches = products.filter(
    (p) => !value.includes(p.id) && p.title.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="rounded-lg border border-[#D8DFE8]">
      {value.length > 0 && (
        <ul className="divide-y divide-[#EEF0F4] border-b border-[#D8DFE8]">
          {value.map((id) => (
            <li key={id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">
                {byId[id]?.title || "No longer available"}
              </span>

              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== id))}
                className="text-xs text-[#53627E] hover:text-red-600"
                aria-label={`Remove ${byId[id]?.title || "item"}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {products.length === 0 ? (
        <p className="px-3 py-2.5 text-xs text-[#53627E]">Add {noun} first, then choose them here.</p>
      ) : value.length >= max ? (
        <p className="px-3 py-2.5 text-xs text-[#53627E]">You've chosen the maximum of {max}.</p>
      ) : (
        <div className="p-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${noun} to add`}
            className="h-9 w-full rounded-md border border-[#D8DFE8] px-2.5 text-sm outline-none focus:border-[#161C2C]"
          />

          <ul className="mt-1 max-h-40 overflow-y-auto">
            {matches.slice(0, 50).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onChange([...value, p.id])}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-[#F7F8FA]"
                >
                  <span className="min-w-0 truncate">{p.title}</span>

                  {p.status !== "active" && (
                    <span className="shrink-0 text-[10px] uppercase text-[#A3ADBF]">{p.status}</span>
                  )}
                </button>
              </li>
            ))}

            {matches.length === 0 && (
              <li className="px-2 py-1.5 text-xs text-[#53627E]">No matching {noun}.</li>
            )}
          </ul>
        </div>
      )}

      {value.some((id) => byId[id] && byId[id].status !== "active") && (
        <p className="border-t border-[#D8DFE8] px-3 py-2 text-xs text-[#53627E]">
          Only active products appear on your store.
        </p>
      )}
    </div>
  );
}

// A small editor: bold, italic, underline, lists and links. The server cleans the HTML again.
function RichTextEditor({ value, onChange }) {
  const ref = useRef(null);

  // Set the content once on mount; afterwards the editor owns it (keeps the cursor in place)
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // New lines become <p> paragraphs rather than <div>s
  const preferParagraphs = () => document.execCommand("defaultParagraphSeparator", false, "p");

  function run(command, arg) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML || "");
  }

  const tools = [
    { label: "B", title: "Bold", className: "font-bold", run: () => run("bold") },
    { label: "I", title: "Italic", className: "italic", run: () => run("italic") },
    { label: "U", title: "Underline", className: "underline", run: () => run("underline") },
    { label: "H", title: "Heading", className: "font-bold", run: () => run("formatBlock", "<h3>") },
    { label: "❝", title: "Quote", run: () => run("formatBlock", "<blockquote>") },
    { label: "¶", title: "Normal text", run: () => run("formatBlock", "<p>") },
    { label: "• List", title: "Bulleted list", run: () => run("insertUnorderedList") },
    { label: "1. List", title: "Numbered list", run: () => run("insertOrderedList") },
    {
      label: "Link",
      title: "Add a link",
      run: () => {
        const url = window.prompt("Link address (https://... or /collections/all)");
        if (url) run("createLink", url.trim());
      },
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[#D8DFE8] focus-within:border-[#161C2C]">
      <div className="flex flex-wrap gap-1 border-b border-[#D8DFE8] bg-[#F7F8FA] p-1">
        {tools.map((tool) => (
          <button
            key={tool.title}
            type="button"
            title={tool.title}
            aria-label={tool.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={tool.run}
            className={`h-7 min-w-7 rounded px-2 text-xs text-[#161C2C] hover:bg-white ${tool.className || ""}`}
          >
            {tool.label}
          </button>
        ))}
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        onFocus={preferParagraphs}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="min-h-[120px] px-3 py-2 text-sm leading-relaxed outline-none [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#C9D1DD] [&_blockquote]:pl-3 [&_blockquote]:italic [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}

// The page's fixed parts. They are theme-wide, so they open the matching group of Theme settings.
const LAYOUT_ROWS = [
  { part: "top", group: "announcement", name: "Announcement bar", hint: "Banner above the header", icon: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a4 4 0 0 1 0 6" },
  { part: "top", group: "header", name: "Header", hint: "Logo and navigation", icon: "M3 5h18v5H3zM7 15h10M9 19h6" },
  { part: "bottom", group: "footer", name: "Footer", hint: "Links, social and copyright", icon: "M3 14h18v5H3zM7 9h10M9 5h6" },
];

function LayoutRows({ part, selected, themeGroup, footerSynced = false, onOpen }) {
  const rows = LAYOUT_ROWS.filter((row) => row.part === part);

  return (
    <ul className={`px-2 ${part === "top" ? "mb-1" : "mt-1"}`}>
      {rows.map((row) => {
        const active =
          row.group === "footer" && footerSynced ? selected === "footer" : selected === "theme" && themeGroup === row.group;

        return (
          <li key={row.group}>
            <button
              type="button"
              onClick={() => onOpen(row.group)}
              className={`flex h-9 w-full items-center gap-2 rounded-md pl-1.5 pr-1 text-left text-sm ${
                active ? "bg-[#EEF1F6]" : "hover:bg-[#F5F6F8]"
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[#8A94A8]">
                <svg {...iconProps} className="h-4 w-4">
                  <path d={row.icon} />
                </svg>
              </span>
              <span className="min-w-0 flex-1 truncate">
                {row.name} <span className="text-xs text-[#A3ADBF]">{row.hint}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CenteredMessage({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-6 text-center text-sm text-[#53627E]">
      <p>{children}</p>
    </div>
  );
}
