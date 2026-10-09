import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Link } from "react-router-dom";

import { API_URL, apiRequest } from "@/lib/api";

import { useSession } from "@/lib/auth";

import {
  getThemeSchema,
  getThemeSettings,
  saveThemeSettings,
  getThemeCustomizer,
  saveThemeCustomizer,
  previewTheme,
  uploadThemeImage,
} from "@/lib/themeApi";

const PAGE_LABELS = {
  index: "Home page",
  product: "Product page",
  collection: "Collection page",
};

const inputClass =
  "h-10 w-full rounded-lg border border-[#D8DFE8] bg-white px-3 text-sm outline-none focus:border-[#161C2C]";

const smallButton =
  "rounded-md border border-[#D8DFE8] bg-white px-2 py-1 text-xs text-[#30466F] hover:border-[#161C2C] disabled:opacity-30";

const iconButton =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#53627E] hover:bg-white hover:text-[#161C2C]";

const newSectionId = (type) => `${type}-${Math.random().toString(36).slice(2, 6)}`;

const MAX_SECTIONS = 25;

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

  const [status, setStatus] = useState("loading");

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [dirty, setDirty] = useState(false);

  const [saving, setSaving] = useState(false);

  const [previewKey, setPreviewKey] = useState(0);

  const [previewHtml, setPreviewHtml] = useState("");

  const [previewError, setPreviewError] = useState("");

  // Add-section box
  const [adding, setAdding] = useState(false);

  const [newName, setNewName] = useState("");

  // Inline rename in the sections panel
  const [renaming, setRenaming] = useState(null);

  const [renameValue, setRenameValue] = useState("");

  // Pointer drag (mouse and touch): what is moving, and where it would land
  const [drag, setDrag] = useState(null);

  const [dropTarget, setDropTarget] = useState(null);

  const iframeRef = useRef(null);

  const scrollRef = useRef(0);

  const dataRef = useRef(null);

  dataRef.current = data;

  useEffect(() => {
    Promise.all([
      getThemeSchema(),
      getThemeSettings(),
      getThemeCustomizer(),
      apiRequest("/api/v1/catalog/collections/"),
      apiRequest("/api/v1/catalog/products/"),
    ])
      .then(([schemaData, settingsData, customizerData, collectionData, productData]) => {
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

    return `${base}/`;
  }, [store, page, sampleProductId]);

  // Home page: render the unsaved sections as you edit. Other pages show the saved version.
  useEffect(() => {
    if (status !== "ready" || page !== "index" || !data) return undefined;

    let cancelled = false;

    const timer = setTimeout(() => {
      previewTheme(data, { scroll: scrollRef.current, selected: selected || "" })
        .then((res) => {
          if (cancelled) return;
          setPreviewHtml(res.html);
          setPreviewError("");
        })
        .catch((e) => !cancelled && setPreviewError(e.message));
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [data, page, status, previewKey, selected]);

  function update(mutator) {
    setData((current) => {
      const next = structuredClone(current);

      mutator(next);

      return next;
    });

    setDirty(true);
  }

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

      if (message.type === "scroll") {
        scrollRef.current = Math.max(0, Number(message.y) || 0);
      } else if (message.type === "select" && typeof message.id === "string") {
        if (dataRef.current?.templates.index.sections[message.id]) setSelected(message.id);
      } else if (
        message.type === "move-section" &&
        typeof message.id === "string" &&
        typeof message.target === "string"
      ) {
        moveSectionTo("index", message.id, message.target, Boolean(message.after));
      }
    }

    window.addEventListener("message", onMessage);

    return () => window.removeEventListener("message", onMessage);
  }, [moveSectionTo]);

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
      const from = t.sections[payload.sectionId];

      const block = from?.blocks?.[payload.index];

      if (!block) return;

      const destinationId = target.kind === "block" ? target.sectionId : target.kind === "into" ? target.id : null;

      const destination = destinationId && t.sections[destinationId];

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

  async function save() {
    setSaving(true);

    setError("");

    try {
      const [saved, savedCustomizer] = await Promise.all([
        saveThemeSettings(data),
        saveThemeCustomizer(customizer),
      ]);

      setData(saved);

      setCustomizer(savedCustomizer);

      setDirty(false);

      setNotice("Saved. Your store's home page is updated.");

      setPreviewKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
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
    selected && selected !== "theme" ? template.sections[selected] : null;

  const sectionSpec = section ? schema.sections[section.type] : null;

  return (
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

          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="h-9 rounded-lg border border-[#D8DFE8] px-3 text-sm leading-9 hover:border-[#161C2C]"
            >
              View store
            </a>
          )}

          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="h-9 rounded-lg bg-[#161C2C] px-4 text-sm font-semibold text-white hover:bg-[#252E45] disabled:opacity-40"
          >
            {saving ? "Saving..." : dirty ? "Save" : "Saved"}
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

      <div className="flex min-h-0 flex-1">
        {/* Sections */}
        <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-[#D8DFE8] bg-white">
          <p className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-[#53627E]">
            {PAGE_LABELS[page]} sections
          </p>

          <ul className="px-2">
            {template.order.map((id, i) => {
              const s = template.sections[id];

              const spec = schema.sections[s.type];

              const name = s.settings.heading || spec.name;

              const canRename = "heading" in spec.settings;

              const lineHere = dropTarget?.kind === "section" && dropTarget.id === id;

              const blockInto = dropTarget?.kind === "into" && dropTarget.id === id;

              return (
                <li key={id} data-drop-section={id} className={`relative ${drag?.kind === "section" && drag.id === id ? "opacity-40" : ""}`}>
                  {lineHere && <DropLine after={dropTarget.after} />}

                  <div
                    className={`group flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-sm ${
                      blockInto
                        ? "bg-[#EEF1F6] ring-2 ring-[#141b2d]/40"
                        : selected === id
                        ? "bg-[#EEF1F6]"
                        : "hover:bg-[#F7F8FA]"
                    }`}
                  >
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
                          if (e.key === "Escape") setRenaming(null);
                        }}
                        className="h-7 min-w-0 flex-1 rounded-md border border-[#161C2C] px-2 text-sm outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        className={`min-w-0 flex-1 truncate text-left ${s.hidden ? "text-[#A3ADBF]" : ""}`}
                        onClick={() => setSelected(id)}
                        onDoubleClick={() => canRename && startRename(id)}
                        title={s.type === "custom" ? name : `${spec.name}${s.settings.heading ? ` · ${s.settings.heading}` : ""}`}
                      >
                        {name}
                        {s.type !== "custom" && s.settings.heading ? (
                          <span className="text-[#A3ADBF]"> · {spec.name}</span>
                        ) : null}
                      </button>
                    )}

                    {canRename && renaming !== id && (
                      <button type="button" onClick={() => startRename(id)} className={iconButton} aria-label={`Rename ${name}`} title="Rename">
                        <svg {...iconProps} className="h-3.5 w-3.5">
                          <path d="M12 20h9M16.4 3.6a2 2 0 0 1 3 3L7.4 18.6l-4 1 1-4Z" />
                        </svg>
                      </button>
                    )}

                    {!spec.required && (
                      <button type="button" onClick={() => duplicateSection(id)} className={iconButton} aria-label={`Duplicate ${name}`} title="Duplicate">
                        <svg {...iconProps} className="h-3.5 w-3.5">
                          <rect x="8" y="8" width="13" height="13" rx="2" />
                          <path d="M4 16V5a2 2 0 0 1 2-2h11" />
                        </svg>
                      </button>
                    )}

                    {!spec.required && (
                      <button
                        type="button"
                        onClick={() => toggleHidden(id)}
                        className={iconButton}
                        aria-label={s.hidden ? `Show ${name}` : `Hide ${name}`}
                        aria-pressed={!s.hidden}
                        title={s.hidden ? "Hidden: click to show" : "Visible: click to hide"}
                      >
                        <svg {...iconProps} className="h-3.5 w-3.5">
                          {s.hidden ? (
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
                      </button>
                    )}

                    {!spec.required && (
                      <button
                        type="button"
                        onClick={() => removeSection(id)}
                        className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                        aria-label={`Delete ${name}`}
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

          {template.order.length === 0 && (
            <p className="px-4 py-2 text-xs text-[#53627E]">
              No sections yet. Your store shows a simple default layout until you add one.
            </p>
          )}

          {/* Add section */}
          <div className="px-3 py-3">
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
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#C9D1DD] text-sm font-medium text-[#161C2C] hover:border-[#161C2C] hover:bg-[#F7F8FA]"
              >
                <span aria-hidden="true">+</span> Add section
              </button>
            )}
          </div>

          <div className="mt-auto border-t border-[#D8DFE8] p-2">
            <button
              type="button"
              onClick={() => setSelected("theme")}
              className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
                selected === "theme" ? "bg-[#EEF1F6]" : "hover:bg-[#F7F8FA]"
              }`}
            >
              Theme settings (colors, currency)
            </button>
          </div>
        </aside>

        {/* Settings panel */}
        {selected && (selected === "theme" || section) && (
          <aside className="w-80 shrink-0 overflow-y-auto border-r border-[#D8DFE8] bg-white p-4">
            {selected === "theme" ? (
              <>
                <h2 className="mb-4 font-semibold">
                  Theme settings
                </h2>

                {/* Existing theme settings */}
                <Fields
                  fields={schema.settings}
                  values={data.settings}
                  collections={collections}
                  onChange={(key, value) => {
                    update((d) => {
                      d.settings[key] = value;
                    });
                  }}
                />

                {/* Theme appearance settings */}
                <div className="mt-6 border-t border-[#D8DFE8] pt-6">
                  <h3 className="mb-4 font-semibold">
                    Theme appearance
                  </h3>

                  <div className="grid gap-4">
                    {/* Primary Color */}
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[#30466F]">
                        Primary Color
                      </span>

                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customizer.primary || "#341A01"}
                          onChange={(e) => {
                            setCustomizer((current) => ({
                              ...current,
                              primary: e.target.value.toUpperCase(),
                            }));

                            setDirty(true);
                          }}
                          className="h-10 w-12 rounded border border-[#D8DFE8]"
                        />

                        <span className="text-sm">
                          {customizer.primary || "#341A01"}
                        </span>
                      </div>
                    </label>

                    {/* Accent Color */}
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[#30466F]">
                        Accent Color
                      </span>

                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customizer.accent || "#D4A017"}
                          onChange={(e) => {
                            setCustomizer((current) => ({
                              ...current,
                              accent: e.target.value.toUpperCase(),
                            }));

                            setDirty(true);
                          }}
                          className="h-10 w-12 rounded border border-[#D8DFE8]"
                        />

                        <span className="text-sm">
                          {customizer.accent || "#D4A017"}
                        </span>
                      </div>
                    </label>

                    {/* Background Color */}
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[#30466F]">
                        Background Color
                      </span>

                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customizer.background || "#FFFFFF"}
                          onChange={(e) => {
                            setCustomizer((current) => ({
                              ...current,
                              background:
                                e.target.value.toUpperCase(),
                            }));

                            setDirty(true);
                          }}
                          className="h-10 w-12 rounded border border-[#D8DFE8]"
                        />

                        <span className="text-sm">
                          {customizer.background || "#FFFFFF"}
                        </span>
                      </div>
                    </label>

                    {/* Heading Font */}
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[#30466F]">
                        Heading Font
                      </span>

                      <select
                        className={inputClass}
                        value={customizer.heading_font || "Inter"}
                        onChange={(e) => {
                          setCustomizer((current) => ({
                            ...current,
                            heading_font: e.target.value,
                          }));

                          setDirty(true);
                        }}
                      >
                        <option value="Inter">Inter</option>
                        <option value="Arial">Arial</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Roboto">Roboto</option>
                      </select>
                    </label>

                    {/* Body Font */}
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[#30466F]">
                        Body Font
                      </span>

                      <select
                        className={inputClass}
                        value={customizer.body_font || "Inter"}
                        onChange={(e) => {
                          setCustomizer((current) => ({
                            ...current,
                            body_font: e.target.value,
                          }));

                          setDirty(true);
                        }}
                      >
                        <option value="Inter">Inter</option>
                        <option value="Arial">Arial</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Roboto">Roboto</option>
                      </select>
                    </label>

                    {/* Button Radius */}
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[#30466F]">
                        Button Radius
                      </span>

                      <input
                        type="text"
                        className={inputClass}
                        value={customizer.button_radius || "8px"}
                        onChange={(e) => {
                          setCustomizer((current) => ({
                            ...current,
                            button_radius: e.target.value,
                          }));

                          setDirty(true);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2 className="truncate font-semibold">
                    {section.type === "custom" ? section.settings.heading || "Custom section" : sectionSpec.name}
                  </h2>

                  <button type="button" className="text-xs text-[#53627E] hover:text-[#161C2C]" onClick={() => setSelected(null)}>
                    Close
                  </button>
                </div>

                <Fields
                  key={selected}
                  fields={sectionSpec.settings}
                  values={section.settings}
                  collections={collections}
                  products={products}
                  onChange={(key, value) =>
                    update((d) => {
                      d.templates[page].sections[selected].settings[key] = value;
                    })
                  }
                />

                {sectionSpec.blocks && (
                  <SectionBlocks
                    key={`blocks-${selected}`}
                    sectionId={selected}
                    spec={sectionSpec}
                    blocks={section.blocks || []}
                    collections={collections}
                    products={products}
                    drag={drag}
                    dropTarget={dropTarget}
                    startDrag={startDrag}
                    onChange={(mutate) =>
                      update((d) => {
                        const s = d.templates[page].sections[selected];
                        s.blocks = s.blocks || [];
                        mutate(s.blocks);
                      })
                    }
                  />
                )}
              </>
            )}
          </aside>
        )}

        {/* Preview */}
        <main className="flex min-w-0 flex-1 flex-col p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-[#53627E]">
            <span>
              {page === "index"
                ? previewError
                  ? `Preview not updated: ${previewError}`
                  : dirty
                  ? "Live preview of your unsaved changes. Drag sections here, click one to edit it, then Save."
                  : "Live preview. Drag sections here, or click one to edit it."
                : dirty
                ? "Preview shows the last saved version. Save to update it."
                : "Live preview"}
            </span>

            <button
              type="button"
              className="hover:text-[#161C2C]"
              onClick={() => setPreviewKey((k) => k + 1)}
            >
              Refresh
            </button>
          </div>

          {page === "index" ? (
            previewHtml ? (
              <iframe
                ref={iframeRef}
                title="Store preview"
                srcDoc={previewHtml}
                // Theme code is written by store owners: keep it off this origin
                sandbox="allow-scripts allow-popups"
                className={`min-h-0 flex-1 rounded-xl border border-[#D8DFE8] bg-white ${drag ? "pointer-events-none" : ""}`}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#D8DFE8] text-sm text-[#53627E]">
                Loading preview...
              </div>
            )
          ) : previewUrl ? (
            <iframe
              key={`${previewKey}-${previewUrl}`}
              title="Store preview"
              src={previewUrl}
              // Theme code is written by store owners: keep it off this origin
              sandbox="allow-scripts allow-forms allow-popups"
              className="min-h-0 flex-1 rounded-xl border border-[#D8DFE8] bg-white"
            />
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#D8DFE8] text-sm text-[#53627E]">
              Add an active product to preview the product page.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Fields({ fields, values, collections, products = [], onChange }) {
  return (
    <div className="grid gap-4">
      {Object.entries(fields).map(([key, spec]) => (
        <Field
          key={key}
          spec={spec}
          value={values[key]}
          collections={collections}
          products={products}
          onChange={(v) => onChange(key, v)}
        />
      ))}
    </div>
  );
}

function Field({ spec, value, collections, products = [], onChange }) {
  const label = (
    <span className="mb-1 block text-xs font-medium text-[#30466F]">
      {spec.label}
    </span>
  );

  switch (spec.type) {
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />

          {spec.label}
        </label>
      );

    case "range":
      return (
        <label className="block">
          {label}

          <div className="flex items-center gap-3">
            <input
              type="range"
              min={spec.min}
              max={spec.max}
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="flex-1"
            />

            <span className="w-8 text-right text-sm tabular-nums">
              {value}
            </span>
          </div>
        </label>
      );

    case "select":
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
                {o[0].toUpperCase() + o.slice(1)}
              </option>
            ))}
          </select>
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
        </label>
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
                {c.name}
              </option>
            ))}
          </select>
        </label>
      );

    case "image":
      return (
        <div>
          {label}

          <ImageUpload value={value} onChange={onChange} />
        </div>
      );

    case "products":
      return (
        <div>
          {label}

          <ProductPicker value={value || []} products={products} max={spec.max || 24} onChange={onChange} />
        </div>
      );

    case "collections":
      return (
        <div>
          {label}

          <ProductPicker
            value={value || []}
            products={collections.map((c) => ({ id: c.id, title: c.name, status: "active" }))}
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
      return (
        <label className="block">
          {label}

          <textarea
            rows={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-[#D8DFE8] px-3 py-2 text-sm outline-none focus:border-[#161C2C]"
          />
        </label>
      );

    default:
      // text, url
      return (
        <label className="block">
          {label}

          <input
            className={inputClass}
            value={value}
            placeholder={spec.type === "url" ? "/collections/all" : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      );
  }
}

// Short summary shown on a collapsed block row
function blockTitle(block, blockSpec, i) {
  const s = block.settings || {};
  const text =
    s.heading ||
    s.text ||
    s.label ||
    (s.body ? s.body.replace(/<[^>]*>/g, " ").trim() : "") ||
    s.alt ||
    (s.products?.length ? `${s.products.length} product${s.products.length === 1 ? "" : "s"}` : "") ||
    (s.collections?.length ? `${s.collections.length} collection${s.collections.length === 1 ? "" : "s"}` : "") ||
    s.url ||
    "";
  return text ? `${blockSpec.name}: ${text}` : `${blockSpec.name} ${i + 1}`;
}

// Blocks inside a section: add any allowed type, edit, drag to reorder or onto another section
function SectionBlocks({ sectionId, spec, blocks, collections, products, drag, dropTarget, startDrag, onChange }) {
  const types = Object.entries(spec.blocks);

  const single = types.length === 1;

  const [open, setOpen] = useState(-1);

  const [menu, setMenu] = useState(false);

  const full = blocks.length >= spec.max_blocks;

  function add(type, blockSpec) {
    onChange((list) => list.push({ type, settings: defaultsOf(blockSpec.settings) }));
    setOpen(blocks.length);
    setMenu(false);
  }

  function move(i, delta) {
    const j = i + delta;
    if (j < 0 || j >= blocks.length) return;
    onChange((list) => {
      [list[i], list[j]] = [list[j], list[i]];
    });
    setOpen((current) => (current === i ? j : current));
  }

  return (
    <div className="mt-6 border-t border-[#D8DFE8] pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {single ? `${types[0][1].name}s` : "Blocks"} ({blocks.length}/{spec.max_blocks})
        </h3>

        <button
          type="button"
          className={smallButton}
          disabled={full}
          onClick={() => (single ? add(types[0][0], types[0][1]) : setMenu((v) => !v))}
          aria-expanded={single ? undefined : menu}
        >
          + Add {single ? types[0][1].name.toLowerCase() : "block"}
        </button>
      </div>

      {menu && !single && (
        <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-lg border border-[#D8DFE8] bg-[#F7F8FA] p-2">
          {types.map(([type, blockSpec]) => (
            <button
              key={type}
              type="button"
              onClick={() => add(type, blockSpec)}
              className="rounded-md border border-[#D8DFE8] bg-white px-2 py-1.5 text-left text-xs text-[#161C2C] hover:border-[#161C2C]"
            >
              {blockSpec.name}
            </button>
          ))}
        </div>
      )}

      {blocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#D8DFE8] px-3 py-4 text-center text-xs text-[#53627E]">
          {single
            ? `No ${types[0][1].name.toLowerCase()}s yet.`
            : "This section is empty. Add a heading, text, image, button, products, collections or an embed."}
        </p>
      ) : (
        <ul className="grid gap-2">
          {blocks.map((block, i) => {
            const blockSpec = spec.blocks[block.type];

            const lineHere = dropTarget?.kind === "block" && dropTarget.sectionId === sectionId && dropTarget.index === i;

            const dragging = drag?.kind === "block" && drag.sectionId === sectionId && drag.index === i;

            if (!blockSpec) return null;

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
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => setOpen(open === i ? -1 : i)}
                    aria-expanded={open === i}
                  >
                    <span className="text-[#A3ADBF]">{open === i ? "▾" : "▸"}</span>{" "}
                    {blockTitle(block, blockSpec, i)}
                  </button>

                  <button
                    type="button"
                    className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                    onClick={() => {
                      onChange((list) => {
                        list.splice(i, 1);
                      });
                      setOpen(-1);
                    }}
                    aria-label={`Remove ${blockSpec.name}`}
                    title="Remove"
                  >
                    <svg {...iconProps} className="h-3.5 w-3.5">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>

                {open === i && (
                  <div className="border-t border-[#D8DFE8] p-3">
                    <Fields
                      key={`${sectionId}-${i}-${block.type}`}
                      fields={blockSpec.settings}
                      values={block.settings}
                      collections={collections}
                      products={products}
                      onChange={(key, value) =>
                        onChange((list) => {
                          list[i].settings[key] = value;
                        })
                      }
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!single && blocks.length > 0 && (
        <p className="mt-2 text-[11px] text-[#A3ADBF]">
          Drag a block onto another custom section in the list to move it there.
        </p>
      )}
    </div>
  );
}

function ImageUpload({ value, onChange }) {
  const inputRef = useRef(null);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  async function choose(file) {
    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Not a supported image. Use JPG, PNG or WEBP.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image is too large. Maximum size is 5MB.");
      return;
    }

    setBusy(true);
    setError("");

    const res = await uploadThemeImage(file);

    setBusy(false);

    if (res.ok) onChange(res.data.url);
    else setError(res.error);
  }

  return (
    <div>
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-[#D8DFE8]">
          <img src={value} alt="" className="h-28 w-full object-cover" />

          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/50 to-transparent p-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-[#161C2C]"
            >
              Replace
            </button>

            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-red-600"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            choose(e.dataTransfer.files?.[0]);
          }}
          className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#D8DFE8] text-xs text-[#53627E] hover:border-[#161C2C] disabled:opacity-60"
        >
          <span className="font-medium text-[#161C2C]">
            {busy ? "Uploading..." : "Upload image"}
          </span>
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

      {busy && value && <p className="mt-1 text-xs text-[#53627E]">Uploading...</p>}

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
        className="min-h-[120px] px-3 py-2 text-sm leading-relaxed outline-none [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}

function CenteredMessage({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-6 text-center text-sm text-[#53627E]">
      <p>{children}</p>
    </div>
  );
}
