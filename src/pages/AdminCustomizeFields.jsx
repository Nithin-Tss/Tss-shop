import { createContext, memo, useContext, useEffect, useRef, useState } from "react";

import LinkField from "@/components/LinkField";

import { uploadThemeImage } from "@/lib/themeApi";

import {
  inputClass,
  smallButton,
  iconButton,
  iconProps,
  IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  defaultsOf,
  DropLine,
  DragHandle,
} from "./AdminCustomizeShared";

// The fonts the theme can use (from the schema), shared with every font picker
export const FontsContext = createContext([]);

// The store's visible pages (written in Pages), so a link can point at one
export const StorePagesContext = createContext([]);

// The store's published blog posts, so a link can point at one
export const BlogPostsContext = createContext([]);

// Image fields: show a picked image in the preview at once, and hold autosave until uploads finish
export const UploadsContext = createContext(null);

// One stable change handler per option, so unchanged options don't re-render
export function useOptionHandlers(onChange) {
  const ref = useRef(onChange);
  useEffect(() => {
    ref.current = onChange;
  });
  const handlers = useRef({});
  return (key) => (handlers.current[key] ||= (value) => ref.current(key, value));
}

// Loads every Google font once (regular weight) so the font picker can show each name in its own font
export function useFontPreviews(fonts, active) {
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

export function FontPicker({ value, allowTheme, onChange, label }) {
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

  const options = [
    ...(allowTheme ? [{ key: "", label: "Use theme font", stack: "inherit" }] : []),
    ...fonts,
  ];

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
        <svg {...iconProps} className="h-4 w-4 shrink-0 text-[#8B8FB8]">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[#DDD6FE] bg-white py-1 shadow-lg"
        >
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
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[15px] hover:bg-[#F5F3FF] ${
                  font.key === value ? "bg-[#EDE9FE]" : ""
                }`}
                style={{ fontFamily: font.stack }}
              >
                {font.label}
                {font.google && (
                  <span className="font-sans text-[10px] uppercase text-[#A3ADBF]">Google</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Size in px with quick presets; 0 means "use the theme size"
export function FontSizeInput({ spec, value, onChange }) {
  const presets = Object.entries(spec.presets || {});

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => onChange(0)}
          className={`rounded-md border px-2 py-1 text-[11px] ${!value ? "border-[#0B1020] bg-[#0B1020] text-white" : "border-[#DDD6FE] text-[#3B3F8F] hover:border-[#0B1020]"}`}
        >
          Theme
        </button>
        {presets.map(([name, size]) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(size)}
            className={`rounded-md border px-2 py-1 text-[11px] ${value === size ? "border-[#0B1020] bg-[#0B1020] text-white" : "border-[#DDD6FE] text-[#3B3F8F] hover:border-[#0B1020]"}`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="flex h-10 items-center overflow-hidden rounded-lg border border-[#DDD6FE] bg-white focus-within:border-[#0B1020]">
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
        <span className="border-l border-[#DDD6FE] bg-[#F5F3FF] px-3 text-xs leading-10 text-[#4C4F7A]">
          {spec.unit || "px"}
        </span>
      </div>
    </div>
  );
}

// A link to a page, product, collection, blog post, email, phone number or any web address
export function LinkPicker({ value, collections, products, onChange, label }) {
  const pages = useContext(StorePagesContext);
  const posts = useContext(BlogPostsContext);

  return (
    <LinkField
      value={value}
      onChange={onChange}
      collections={collections}
      products={products}
      pages={pages}
      posts={posts}
      label={label}
    />
  );
}

// Shopify-style list of links: a label and a link picker per row. Stored as one
// "Label | /link" line per row, which is what the theme's sections read.
export function parseMenuLines(text) {
  return String(text || "")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const i = line.indexOf("|");
      return i === -1
        ? { label: line.trim(), url: "" }
        : { label: line.slice(0, i).trim(), url: line.slice(i + 1).trim() };
    });
}

export function menuLinesText(rows) {
  return rows
    .filter((r) => r.label || r.url)
    .map((r) => `${r.label} | ${r.url}`)
    .join("\n");
}

export function MenuLinksEditor({ value, collections, products, onChange, label }) {
  const pages = useContext(StorePagesContext);
  const posts = useContext(BlogPostsContext);
  const [rows, setRows] = useState(() => parseMenuLines(value));
  const emitted = useRef(menuLinesText(rows));

  // Take in a change made elsewhere (the code editor, undo), not our own echo
  useEffect(() => {
    if ((value || "") !== emitted.current) {
      emitted.current = value || "";
      setRows(parseMenuLines(value));
    }
  }, [value]);

  const commit = (next) => {
    setRows(next);
    emitted.current = menuLinesText(next);
    onChange(emitted.current);
  };

  const update = (index, patch) =>
    commit(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const move = (index, step) => {
    const to = index + step;
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    [next[index], next[to]] = [next[to], next[index]];
    commit(next);
  };

  return (
    <div className="grid gap-2">
      {rows.map((row, i) => (
        <div key={i} className="grid gap-1.5 rounded-xl border border-[#E4DEFB] bg-[#FBFAFF] p-2.5">
          <div className="flex items-center gap-1.5">
            <input
              className={inputClass}
              value={row.label}
              placeholder="Link label"
              aria-label={`${label}: label ${i + 1}`}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="rounded p-1 text-[#4C4F7A] hover:text-[#0B1020] disabled:opacity-30"
              aria-label="Move link up"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === rows.length - 1}
              className="rounded p-1 text-[#4C4F7A] hover:text-[#0B1020] disabled:opacity-30"
              aria-label="Move link down"
            >
              ▼
            </button>
            <button
              type="button"
              onClick={() => commit(rows.filter((_, j) => j !== i))}
              className="rounded p-1 text-[#4C4F7A] hover:text-red-600"
              aria-label="Delete link"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
          <LinkField
            value={row.url}
            onChange={(url) => update(i, { url })}
            collections={collections}
            products={products}
            pages={pages}
            posts={posts}
            label={`${label}: link ${i + 1}`}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => commit([...rows, { label: "", url: "" }])}
        className="flex h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-[#DDD6FE] text-sm font-medium text-[#3B3F8F] hover:bg-[#F5F3FF]"
      >
        <span aria-hidden="true">+</span> Add link
      </button>
    </div>
  );
}

// An option that was changed from the theme default gets a small reset link
export function isOverridden(spec, value) {
  return (
    spec.theme_default && JSON.stringify(value ?? spec.default) !== JSON.stringify(spec.default)
  );
}

export function ResetToTheme({ spec, value, onChange }) {
  if (!isOverridden(spec, value)) return null;

  return (
    <button
      type="button"
      onClick={() => onChange(structuredClone(spec.default))}
      className="mt-1 text-[11px] font-medium text-[#3B3F8F] underline-offset-2 hover:underline"
    >
      Reset to theme default
    </button>
  );
}

// An option with "show_if" only appears when the other options match ("*" = has any value)
export function isShown(spec, values) {
  if (!spec.show_if) return true;
  return Object.entries(spec.show_if).every(([key, expected]) =>
    expected === "*"
      ? Boolean(values[key])
      : Array.isArray(expected)
        ? expected.includes(values[key])
        : values[key] === expected
  );
}

export const optionLabel = (spec, option) =>
  spec.labels?.[option] || option.charAt(0).toUpperCase() + option.slice(1).replace(/[-_]/g, " ");

// Section options in collapsible groups; "Content" starts open, `extra` (blocks) goes at its end
export function GroupedFields({
  fields,
  values,
  groups,
  collections,
  products,
  onChange,
  extra,
  initialOpen = "content",
}) {
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
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[#0B1020] hover:bg-[#F5F3FF]"
              aria-expanded={isOpen}
            >
              {group.label}

              <svg
                {...iconProps}
                className={`h-4 w-4 text-[#8B8FB8] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              >
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

export function Help({ spec }) {
  return spec.help ? (
    <span className="mt-1 block text-[11px] leading-snug text-[#8B8FB8]">{spec.help}</span>
  ) : null;
}

export const Field = memo(function Field({ spec, value, collections, products = [], onChange }) {
  const label = <span className="mb-1 block text-xs font-medium text-[#3B3F8F]">{spec.label}</span>;

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
              <span className="h-5 w-9 rounded-full bg-[#CBD3DF] transition-colors peer-checked:bg-[#0B1020] peer-focus-visible:ring-2 peer-focus-visible:ring-[#0B1020]/30" />
              <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
            </span>
          </label>

          <Help spec={spec} />
        </div>
      );

    case "range":
      return (
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs font-medium text-[#3B3F8F]">
            {spec.label}
            <span className="tabular-nums text-[#4C4F7A]">
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
            className="w-full accent-[#0B1020]"
          />

          <Help spec={spec} />
        </label>
      );

    case "number":
      return (
        <label className="block">
          {label}

          <div className="flex h-10 items-center overflow-hidden rounded-lg border border-[#DDD6FE] bg-white focus-within:border-[#0B1020]">
            <input
              type="number"
              min={spec.min}
              max={spec.max}
              value={value}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (e.target.value !== "" && !Number.isNaN(n)) onChange(Math.round(n));
              }}
              onBlur={(e) =>
                onChange(
                  Math.min(
                    spec.max,
                    Math.max(spec.min, Math.round(Number(e.target.value) || spec.min))
                  )
                )
              }
              className="h-full min-w-0 flex-1 px-3 text-sm outline-none"
            />
            {spec.unit && (
              <span className="border-l border-[#DDD6FE] bg-[#F5F3FF] px-3 text-xs leading-10 text-[#4C4F7A]">
                {spec.unit}
              </span>
            )}
          </div>

          <Help spec={spec} />
        </label>
      );

    case "select":
      if (spec.ui === "segmented") {
        return (
          <div>
            {label}

            <div
              className="flex rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] p-0.5"
              role="radiogroup"
              aria-label={spec.label}
            >
              {spec.options.map((o) => (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={value === o}
                  onClick={() => onChange(o)}
                  className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    value === o
                      ? "bg-white text-[#0B1020] shadow-sm"
                      : "text-[#4C4F7A] hover:text-[#0B1020]"
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

          <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
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
              className="h-10 w-12 rounded border border-[#DDD6FE]"
            />

            <span className="text-sm tabular-nums">{value}</span>
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
              className={`h-10 w-12 rounded border border-[#DDD6FE] ${value ? "" : "opacity-40"}`}
              aria-label={spec.label}
            />

            <span className="min-w-0 flex-1 text-sm tabular-nums text-[#4C4F7A]">
              {value || "None"}
            </span>

            <button
              type="button"
              disabled={!value}
              onClick={() => onChange("")}
              className="rounded-md border border-[#DDD6FE] px-2 py-1 text-xs text-[#3B3F8F] hover:border-[#0B1020] disabled:opacity-40"
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

          <FontPicker
            value={value || ""}
            allowTheme={Boolean(spec.theme_default)}
            onChange={onChange}
            label={spec.label}
          />

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

          <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">Newest products</option>

            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.status === "draft" ? " (Draft, hidden on store)" : ""}
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

          <ProductPicker
            value={value || []}
            products={products}
            max={spec.max || 24}
            onChange={onChange}
          />

          <Help spec={spec} />
        </div>
      );

    case "collections":
      return (
        <div>
          {label}

          <ProductPicker
            value={value || []}
            products={collections.map((c) => ({
              id: c.id,
              title: c.name,
              status: c.status || "active",
            }))}
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
            className="w-full rounded-lg border border-[#DDD6FE] px-3 py-2 font-mono text-xs outline-none focus:border-[#0B1020]"
          />

          <span className="mt-1 block text-[11px] leading-snug text-[#4C4F7A]">
            Scripts and unsafe code are removed when you save. Embeds work from Google Maps, Google
            Forms, Spotify, SoundCloud and Calendly.
          </span>
        </label>
      );

    case "menu":
      return (
        <div>
          {label}

          <MenuLinksEditor
            value={value || ""}
            collections={collections}
            products={products}
            onChange={onChange}
            label={spec.label}
          />

          <Help spec={spec} />
        </div>
      );

    case "textarea":
      return (
        <label className="block">
          {label}

          <textarea
            rows={3}
            value={value}
            spellCheck
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-[#DDD6FE] px-3 py-2 text-sm outline-none focus:border-[#0B1020]"
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
              spec.type === "url"
                ? "/collections/all"
                : spec.type === "anchor"
                  ? "e.g. our-story"
                  : ""
            }
            onChange={(e) => onChange(e.target.value)}
          />

          <Help spec={spec} />
        </label>
      );
  }
});

// Short summary shown on a block row
export function blockTitle(block, blockSpec, i) {
  const s = block.settings || {};
  const strip = (html) =>
    (html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const text =
    s.heading ||
    s.title ||
    s.text ||
    s.label ||
    strip(s.body) ||
    (s.items ? s.items.split("\n").find((line) => line.trim()) : "") ||
    s.address ||
    s.alt ||
    (s.products?.length
      ? `${s.products.length} product${s.products.length === 1 ? "" : "s"}`
      : "") ||
    (s.collections?.length
      ? `${s.collections.length} collection${s.collections.length === 1 ? "" : "s"}`
      : "") ||
    (block.type === "spacer" ? `${s.height}px` : "") ||
    s.url ||
    "";
  return text ? `${blockSpec.name}: ${text}` : `${blockSpec.name} ${i + 1}`;
}

// The blocks of a section: add any type, open one to edit it, drag to reorder or onto another section
export function SectionBlocks({
  sectionId,
  spec,
  blocks,
  drag,
  dropTarget,
  startDrag,
  onChange,
  onOpen,
  onDuplicate,
  onToggle,
  onRemove,
}) {
  const types = Object.entries(spec.blocks);

  const [menu, setMenu] = useState(false);

  const full = blocks.length >= spec.max_blocks;

  // Some types have their own limit (e.g. at most 8 slides)
  const atLimit = (type) =>
    spec.type_limits?.[type] !== undefined &&
    blocks.filter((b) => b.type === type).length >= spec.type_limits[type];

  function add(type, blockSpec) {
    onChange((list) =>
      list.push({ type, hidden: false, settings: defaultsOf(blockSpec.settings) })
    );
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
          Blocks{" "}
          <span className="font-normal text-[#8B8FB8]">
            ({blocks.length}/{spec.max_blocks})
          </span>
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
        <div
          className="mb-3 grid grid-cols-2 gap-1.5 rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] p-2"
          role="menu"
        >
          {types.map(([type, blockSpec]) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              disabled={atLimit(type)}
              title={
                atLimit(type)
                  ? `Up to ${spec.type_limits[type]} ${blockSpec.name.toLowerCase()}s`
                  : undefined
              }
              onClick={() => add(type, blockSpec)}
              className="truncate rounded-md border border-[#DDD6FE] bg-white px-2 py-1.5 text-left text-xs text-[#0B1020] hover:border-[#0B1020] disabled:opacity-40 disabled:hover:border-[#DDD6FE]"
            >
              {blockSpec.name}
            </button>
          ))}
        </div>
      )}

      {blocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#DDD6FE] px-3 py-4 text-center text-xs text-[#4C4F7A]">
          No blocks yet. Use "+ Add block" to add text, images, buttons, lists and more.
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {blocks.map((block, i) => {
            const blockSpec = spec.blocks[block.type];

            const lineHere =
              dropTarget?.kind === "block" &&
              dropTarget.sectionId === sectionId &&
              dropTarget.index === i;

            const dragging =
              drag?.kind === "block" && drag.sectionId === sectionId && drag.index === i;

            if (!blockSpec) return null;

            const title = blockTitle(block, blockSpec, i);

            return (
              <li
                key={i}
                data-drop-block={`${sectionId}|${i}`}
                className={`relative rounded-lg border border-[#DDD6FE] bg-white ${dragging ? "opacity-40" : ""}`}
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
          Click a block to edit it. Drag by the handle to reorder, or onto another section that
          appears below.
        </p>
      )}
    </div>
  );
}

export function EyeIcon({ hidden }) {
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

export function ImageUpload({ value, onChange }) {
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
    const name =
      file.name.replace(/\.[^.]+$/, "") + (prepared.blob.type === "image/webp" ? ".webp" : "");
    const res = await uploadThemeImage(
      new File([prepared.blob], name || "image", { type: prepared.blob.type || file.type }),
      setProgress
    );
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
        <div className="relative overflow-hidden rounded-lg border border-[#DDD6FE]">
          <img src={shown} alt="" loading="lazy" className="h-28 w-full object-cover" />

          {progress !== null && (
            <div className="absolute inset-x-0 top-0 h-1 bg-black/10" aria-label="Uploading">
              <div
                className="h-full bg-[#0B1020] transition-[width] duration-150"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
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
              className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-[#0B1020] disabled:opacity-60"
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
          className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#DDD6FE] text-xs text-[#4C4F7A] hover:border-[#0B1020]"
        >
          <span className="font-medium text-[#0B1020]">Upload image</span>
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
export function ProductPicker({ value, products, max, noun = "products", onChange }) {
  const [query, setQuery] = useState("");

  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  const matches = products.filter(
    (p) => !value.includes(p.id) && p.title.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="rounded-lg border border-[#DDD6FE]">
      {value.length > 0 && (
        <ul className="divide-y divide-[#EEF0F4] border-b border-[#DDD6FE]">
          {value.map((id) => (
            <li key={id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">
                {byId[id]?.title || "No longer available"}
              </span>

              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== id))}
                className="text-xs text-[#4C4F7A] hover:text-red-600"
                aria-label={`Remove ${byId[id]?.title || "item"}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {products.length === 0 ? (
        <p className="px-3 py-2.5 text-xs text-[#4C4F7A]">
          Add {noun} first, then choose them here.
        </p>
      ) : value.length >= max ? (
        <p className="px-3 py-2.5 text-xs text-[#4C4F7A]">You've chosen the maximum of {max}.</p>
      ) : (
        <div className="p-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${noun} to add`}
            className="h-9 w-full rounded-md border border-[#DDD6FE] px-2.5 text-sm outline-none focus:border-[#0B1020]"
          />

          <ul className="mt-1 max-h-40 overflow-y-auto">
            {matches.slice(0, 50).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onChange([...value, p.id])}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-[#F5F3FF]"
                >
                  <span className="min-w-0 truncate">{p.title}</span>

                  {p.status !== "active" && (
                    <span className="shrink-0 text-[10px] uppercase text-[#A3ADBF]">
                      {p.status}
                    </span>
                  )}
                </button>
              </li>
            ))}

            {matches.length === 0 && (
              <li className="px-2 py-1.5 text-xs text-[#4C4F7A]">No matching {noun}.</li>
            )}
          </ul>
        </div>
      )}

      {value.some((id) => byId[id] && byId[id].status !== "active") && (
        <p className="border-t border-[#DDD6FE] px-3 py-2 text-xs text-[#4C4F7A]">
          Only active products appear on your store.
        </p>
      )}
    </div>
  );
}

// A small editor: bold, italic, underline, lists and links. The server cleans the HTML again.
export const RICH_TEXT_TOOLS = [
  { label: "B", title: "Bold", className: "font-bold", command: "bold" },
  { label: "I", title: "Italic", className: "italic", command: "italic" },
  { label: "U", title: "Underline", className: "underline", command: "underline" },
  { label: "H", title: "Heading", className: "font-bold", command: "formatBlock", arg: "<h3>" },
  { label: "❝", title: "Quote", command: "formatBlock", arg: "<blockquote>" },
  { label: "¶", title: "Normal text", command: "formatBlock", arg: "<p>" },
  { label: "• List", title: "Bulleted list", command: "insertUnorderedList" },
  { label: "1. List", title: "Numbered list", command: "insertOrderedList" },
  { label: "Link", title: "Add a link", command: "createLink" },
];

export function RichTextEditor({ value, onChange }) {
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

  function apply(tool) {
    if (tool.command !== "createLink") return run(tool.command, tool.arg);
    const url = window.prompt("Link address (https://... or /collections/all)");
    if (url) run("createLink", url.trim());
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#DDD6FE] focus-within:border-[#0B1020]">
      <div className="flex flex-wrap gap-1 border-b border-[#DDD6FE] bg-[#F5F3FF] p-1">
        {RICH_TEXT_TOOLS.map((tool) => (
          <button
            key={tool.title}
            type="button"
            title={tool.title}
            aria-label={tool.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(tool)}
            className={`h-7 min-w-7 rounded px-2 text-xs text-[#0B1020] hover:bg-white ${tool.className || ""}`}
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
export const LAYOUT_ROWS = [
  {
    part: "top",
    group: "announcement",
    name: "Announcement bar",
    hint: "Banner above the header",
    icon: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a4 4 0 0 1 0 6",
  },
  {
    part: "top",
    group: "header",
    name: "Header",
    hint: "Logo and navigation",
    icon: "M3 5h18v5H3zM7 15h10M9 19h6",
  },
  {
    part: "bottom",
    group: "footer",
    name: "Footer",
    hint: "Links, social and copyright",
    icon: "M3 14h18v5H3zM7 9h10M9 5h6",
  },
];

// A labelled group in the sections list (Header / Template / Footer), divided from the one above
export function GroupHeading({ children }) {
  return (
    <h3 className="mt-2 border-t border-[#E4DEFB] px-4 pb-1.5 pt-4 text-sm font-semibold text-[#0B1020]">
      {children}
    </h3>
  );
}

export function LayoutRows({ part, selected, themeGroup, synced = {}, onOpen }) {
  const rows = LAYOUT_ROWS.filter((row) => row.part === part);

  return (
    <ul className={`px-2 ${part === "top" ? "mb-1" : "mt-1"}`}>
      {rows.map((row) => {
        const active = synced?.[row.group]
          ? selected === row.group
          : selected === "theme" && themeGroup === row.group;

        return (
          <li key={row.group}>
            <button
              type="button"
              onClick={() => onOpen(row.group)}
              className={`flex h-9 w-full items-center gap-2 rounded-md pl-1.5 pr-1 text-left text-sm ${
                active ? "bg-[#EDE9FE]" : "hover:bg-[#F5F6F8]"
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[#8B8FB8]">
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

export function CenteredMessage({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F3FF] px-6 text-center text-sm text-[#4C4F7A]">
      <p>{children}</p>
    </div>
  );
}
