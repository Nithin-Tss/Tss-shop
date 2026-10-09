import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import { API_URL, apiRequest } from "@/lib/api";

import { useSession } from "@/lib/auth";

import {
  getThemeSchema,
  getThemeSettings,
  saveThemeSettings,
  getThemeCustomizer,
  saveThemeCustomizer,
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

const newSectionId = (type) => `${type}-${Math.random().toString(36).slice(2, 6)}`;

function defaultsOf(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, spec]) => [key, spec.default])
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

  const [page, setPage] = useState("index");

  const [selected, setSelected] = useState(null);

  const [status, setStatus] = useState("loading");

  const [error, setError] = useState("");

  const [dirty, setDirty] = useState(false);

  const [saving, setSaving] = useState(false);

  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    Promise.all([
      getThemeSchema(),
      getThemeSettings(),
      getThemeCustomizer(),
      apiRequest("/api/v1/catalog/collections/"),
      apiRequest("/api/v1/catalog/products/"),
    ])
      .then(
        ([
          schemaData,
          settingsData,
          customizerData,
          collectionData,
          products,
        ]) => {
          setSchema(schemaData);

          setData(settingsData);

          setCustomizer(customizerData);

          setCollections(collectionData);

          setSampleProductId(
            products.find((p) => p.status === "active")?.id || null
          );

          setStatus("ready");
        }
      )
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

    return () =>
      window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const previewUrl = useMemo(() => {
    if (!store?.storeSlug) return "";

    const base = `${API_URL}/s/${store.storeSlug}`;

    if (page === "product") {
      return sampleProductId
        ? `${base}/products/${sampleProductId}`
        : "";
    }

    if (page === "collection") {
      return `${base}/collections/all`;
    }

    return `${base}/`;
  }, [store, page, sampleProductId]);

  const template = data?.templates[page];

  function update(mutator) {
    setData((current) => {
      const next = structuredClone(current);

      mutator(next);

      return next;
    });

    setDirty(true);
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

  function removeSection(id) {
    if (!window.confirm("Remove this section?")) return;

    update((d) => {
      const t = d.templates[page];

      t.order = t.order.filter((s) => s !== id);

      delete t.sections[id];
    });

    if (selected === id) {
      setSelected(null);
    }
  }

  function addSection(type) {
    if (!type) return;

    const spec = schema.sections[type];

    const id = newSectionId(type);

    update((d) => {
      const section = {
        type,
        settings: defaultsOf(spec.settings),
      };

      if (spec.blocks) {
        section.blocks = [];
      }

      d.templates[page].sections[id] = section;

      d.templates[page].order.push(id);
    });

    setSelected(id);
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

  const addable = Object.entries(schema.sections).filter(
    ([, spec]) => spec.pages.includes(page) && !spec.required
  );

  const section =
    selected && selected !== "theme"
      ? template.sections[selected]
      : null;

  return (
    <div className="flex h-screen flex-col bg-[#F7F8FA] text-[#161C2C]">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#D8DFE8] bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/admin/online-store"
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
        <p
          role="alert"
          className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Sections */}
        <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-[#D8DFE8] bg-white">
          <p className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-[#53627E]">
            {PAGE_LABELS[page]} sections
          </p>

          <ul className="px-2">
            {template.order.map((id, i) => {
              const s = template.sections[id];

              const spec = schema.sections[s.type];

              return (
                <li key={id}>
                  <div
                    className={`group flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${
                      selected === id
                        ? "bg-[#EEF1F6]"
                        : "hover:bg-[#F7F8FA]"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left"
                      onClick={() => setSelected(id)}
                    >
                      {spec.name}

                      {s.settings.heading ? (
                        <span className="text-[#53627E]">
                          {" "}
                          · {s.settings.heading}
                        </span>
                      ) : null}
                    </button>

                    <button
                      type="button"
                      className={smallButton}
                      disabled={i === 0}
                      onClick={() => moveSection(id, -1)}
                      aria-label="Move up"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      className={smallButton}
                      disabled={i === template.order.length - 1}
                      onClick={() => moveSection(id, 1)}
                      aria-label="Move down"
                    >
                      ↓
                    </button>

                    {!spec.required && (
                      <button
                        type="button"
                        className={smallButton}
                        onClick={() => removeSection(id)}
                        aria-label="Remove section"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {addable.length > 0 && (
            <div className="px-4 py-3">
              <select
                className={inputClass}
                value=""
                onChange={(e) => addSection(e.target.value)}
                aria-label="Add section"
              >
                <option value="">+ Add section</option>

                {addable.map(([type, spec]) => (
                  <option key={type} value={type}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-auto border-t border-[#D8DFE8] p-2">
            <button
              type="button"
              onClick={() => setSelected("theme")}
              className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
                selected === "theme"
                  ? "bg-[#EEF1F6]"
                  : "hover:bg-[#F7F8FA]"
              }`}
            >
              Theme settings (colors, currency)
            </button>
          </div>
        </aside>

        {/* Settings panel */}
        {selected && (
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
            ) : section ? (
              <>
                <h2 className="mb-4 font-semibold">
                  {schema.sections[section.type].name}
                </h2>

                <Fields
                  fields={schema.sections[section.type].settings}
                  values={section.settings}
                  collections={collections}
                  onChange={(key, value) =>
                    update((d) => {
                      d.templates[page].sections[selected].settings[key] =
                        value;
                    })
                  }
                />

                {schema.sections[section.type].blocks && (
                  <Blocks
                    spec={schema.sections[section.type]}
                    blocks={section.blocks || []}
                    collections={collections}
                    onChange={(mutate) =>
                      update((d) =>
                        mutate(
                          d.templates[page].sections[selected].blocks
                        )
                      )
                    }
                  />
                )}
              </>
            ) : null}
          </aside>
        )}

        {/* Preview */}
        <main className="flex min-w-0 flex-1 flex-col p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-[#53627E]">
            <span>
              {dirty
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

          {previewUrl ? (
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

function Fields({ fields, values, collections, onChange }) {
  return (
    <div className="grid gap-4">
      {Object.entries(fields).map(([key, spec]) => (
        <Field
          key={key}
          spec={spec}
          value={values[key]}
          collections={collections}
          onChange={(v) => onChange(key, v)}
        />
      ))}
    </div>
  );
}

function Field({ spec, value, collections, onChange }) {
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
              onChange={(e) =>
                onChange(e.target.value.toUpperCase())
              }
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
      // text, url, image
      return (
        <label className="block">
          {label}

          <input
            className={inputClass}
            value={value}
            placeholder={
              spec.type === "image"
                ? "https://..."
                : spec.type === "url"
                ? "/collections/all"
                : ""
            }
            onChange={(e) => onChange(e.target.value)}
          />

          {spec.type === "image" && value && (
            <img
              src={value}
              alt=""
              className="mt-2 h-20 w-full rounded-lg object-cover"
            />
          )}
        </label>
      );
  }
}

function Blocks({ spec, blocks, collections, onChange }) {
  const [type, blockSpec] = Object.entries(spec.blocks)[0];

  const [open, setOpen] = useState(0);

  return (
    <div className="mt-6 border-t border-[#D8DFE8] pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {blockSpec.name}s ({blocks.length}/{spec.max_blocks})
        </h3>

        <button
          type="button"
          className={smallButton}
          disabled={blocks.length >= spec.max_blocks}
          onClick={() => {
            onChange((list) =>
              list.push({
                type,
                settings: defaultsOf(blockSpec.settings),
              })
            );

            setOpen(blocks.length);
          }}
        >
          + Add {blockSpec.name.toLowerCase()}
        </button>
      </div>

      <ul className="grid gap-2">
        {blocks.map((block, i) => (
          <li
            key={i}
            className="rounded-lg border border-[#D8DFE8]"
          >
            <div className="flex items-center gap-1 px-2 py-2 text-sm">
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                onClick={() =>
                  setOpen(open === i ? -1 : i)
                }
              >
                {open === i ? "▾" : "▸"}{" "}
                {block.settings.heading ||
                  `${blockSpec.name} ${i + 1}`}
              </button>

              <button
                type="button"
                className={smallButton}
                disabled={i === 0}
                onClick={() =>
                  onChange((list) => {
                    [list[i - 1], list[i]] = [
                      list[i],
                      list[i - 1],
                    ];
                  })
                }
                aria-label="Move up"
              >
                ↑
              </button>

              <button
                type="button"
                className={smallButton}
                disabled={i === blocks.length - 1}
                onClick={() =>
                  onChange((list) => {
                    [list[i + 1], list[i]] = [
                      list[i],
                      list[i + 1],
                    ];
                  })
                }
                aria-label="Move down"
              >
                ↓
              </button>

              <button
                type="button"
                className={smallButton}
                onClick={() =>
                  onChange((list) => {
                    list.splice(i, 1);
                  })
                }
                aria-label="Remove"
              >
                ✕
              </button>
            </div>

            {open === i && (
              <div className="border-t border-[#D8DFE8] p-3">
                <Fields
                  fields={blockSpec.settings}
                  values={block.settings}
                  collections={collections}
                  onChange={(key, value) =>
                    onChange((list) => {
                      list[i].settings[key] = value;
                    })
                  }
                />
              </div>
            )}
          </li>
        ))}
      </ul>
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