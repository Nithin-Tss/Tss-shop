import { createContext, memo, useContext, useEffect, useRef, useState } from "react";

import LinkField, { collectionLabel } from "@/components/LinkField";
import { getEditingThemeId } from "@/lib/editingTheme";

import { listMenus, uploadThemeImage } from "@/lib/themeApi";

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
  CARD_EXTRA_BLOCKS,
} from "./AdminCustomizeShared";

// The fonts the theme can use (from the schema), shared with every font picker
export const FontsContext = createContext([]);

// The store's visible pages (written in Pages), so a link can point at one
export const StorePagesContext = createContext([]);

// The store's published blog posts, so a link can point at one
export const BlogPostsContext = createContext([]);

// Image fields: show a picked image in the preview at once, and hold autosave until uploads finish
export const UploadsContext = createContext(null);

// Opens a group of the theme settings (e.g. "typography") from a link under a field
export const ThemeLinkContext = createContext(null);

// A link to a group of the theme settings: { label, group }
export function ThemeLink({ link }) {
  const open = useContext(ThemeLinkContext);
  if (!link || !open) return null;
  return (
    <button
      type="button"
      onClick={() => open(link.group)}
      className="mt-1 block text-left text-[11px] font-medium text-ink underline"
    >
      {link.label}
    </button>
  );
}

// Alignment buttons: three lines, flush left, centred, flush right
const ALIGN_ICONS = {
  left: "M4 6h16M4 12h10M4 18h14",
  center: "M4 6h16M7 12h10M5 18h14",
  right: "M4 6h16M10 12h10M6 18h14",
};

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

// What the browser shows if the font can't load
function FontFallback({ value }) {
  const fonts = useContext(FontsContext);
  const stack = fonts.find((f) => f.key === value)?.stack || "";
  const fallback = stack.split(",").slice(1).join(", ").replace(/"/g, "");
  return fallback ? (
    <span className="mt-1 block text-[11px] leading-snug text-slate-400">Fallback: {fallback}</span>
  ) : null;
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
        <svg {...iconProps} className="h-4 w-4 shrink-0 text-slate-400">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
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
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[15px] hover:bg-slate-100 ${
                  font.key === value ? "bg-violet-100" : ""
                }`}
                style={{ fontFamily: font.stack }}
              >
                {font.label}
                {font.google && (
                  <span className="font-sans text-[10px] uppercase text-slate-400">Google</span>
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
          className={`rounded-md border px-2 py-1 text-[11px] ${!value ? "border-charcoal-navy bg-charcoal-navy text-white" : "border-slate-200 text-violet-600 hover:border-charcoal-navy"}`}
        >
          Theme
        </button>
        {presets.map(([name, size]) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(size)}
            className={`rounded-md border px-2 py-1 text-[11px] ${value === size ? "border-charcoal-navy bg-charcoal-navy text-white" : "border-slate-200 text-violet-600 hover:border-charcoal-navy"}`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="flex h-10 items-center overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-orange-600">
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
        <span className="border-l border-slate-200 bg-slate-100 px-3 text-xs leading-10 text-slate-600">
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
        <div key={i} className="grid gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
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
              className="rounded p-1 text-slate-600 hover:text-orange-600 disabled:opacity-30"
              aria-label="Move link up"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === rows.length - 1}
              className="rounded p-1 text-slate-600 hover:text-orange-600 disabled:opacity-30"
              aria-label="Move link down"
            >
              ▼
            </button>
            <button
              type="button"
              onClick={() => commit(rows.filter((_, j) => j !== i))}
              className="rounded p-1 text-slate-600 hover:text-red-600"
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
        className="flex h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 text-sm font-medium text-violet-600 hover:bg-slate-100"
      >
        <span aria-hidden="true">+</span> Add link
      </button>
    </div>
  );
}

// A menu from Admin > Menus: the section follows it when the menu changes. Stored as the menu's handle (or its id).
export function MenuPicker({ value, onChange, label }) {
  const [menus, setMenus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listMenus()
      .then((list) => !cancelled && setMenus(Array.isArray(list) ? list : []))
      .catch(() => !cancelled && setMenus([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const key = (menu) => menu.handle || menu.id;
  const missing =
    Boolean(value) && menus !== null && !menus.some((m) => key(m) === value || m.id === value);

  return (
    <div className="grid gap-1.5">
      <select
        className={inputClass}
        value={value || ""}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{menus === null ? "Loading menus..." : "Choose a menu"}</option>
        {missing && <option value={value}>{value} (not found)</option>}
        {(menus || []).map((menu) => (
          <option key={menu.id} value={key(menu)}>
            {menu.name}
            {menu.items_count ? ` (${menu.items_count} items)` : ""}
          </option>
        ))}
      </select>

      {menus !== null && !menus.length && (
        <p className="text-[11px] leading-snug text-slate-600">
          You have no menus yet. Make one in{" "}
          <a className="underline" href="/admin/online-store/content/menus">
            Online Store &gt; Menus
          </a>
          .
        </p>
      )}
    </div>
  );
}

// Social networks the footer can show, with the word the theme stores for each
export const SOCIAL_NETWORKS = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["youtube", "YouTube"],
  ["tiktok", "TikTok"],
  ["x", "X"],
  ["threads", "Threads"],
  ["linkedin", "LinkedIn"],
  ["pinterest", "Pinterest"],
  ["snapchat", "Snapchat"],
  ["whatsapp", "WhatsApp"],
  ["telegram", "Telegram"],
  ["bluesky", "Bluesky"],
  ["custom", "Custom"],
];

// One "network | link | label | icon image" line per social link, which is what the theme reads
export function parseSocialLines(text) {
  return String(text || "")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const [network = "", url = "", label = "", icon = ""] = line.split("|").map((p) => p.trim());
      const known = SOCIAL_NETWORKS.some(([id]) => id === network.toLowerCase());
      return { network: known ? network.toLowerCase() : "custom", url, label, icon };
    });
}

export function socialLinesText(rows) {
  return rows
    .filter((r) => r.url)
    .map((r) => [r.network, r.url, r.label, r.icon].join(" | ").replace(/(\s*\|\s*)+$/, ""))
    .join("\n");
}

// Any number of social icons: a network and a link each (a name and an icon image too for "Custom")
export function SocialLinksEditor({ value, onChange, label }) {
  const [rows, setRows] = useState(() => parseSocialLines(value));
  const emitted = useRef(socialLinesText(rows));

  // Take in a change made elsewhere (the code editor, undo), not our own echo
  useEffect(() => {
    if ((value || "") !== emitted.current) {
      emitted.current = value || "";
      setRows(parseSocialLines(value));
    }
  }, [value]);

  const commit = (next) => {
    setRows(next);
    emitted.current = socialLinesText(next);
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
        <div key={i} className="grid gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <div className="flex items-center gap-1.5">
            <select
              className={inputClass}
              value={row.network}
              aria-label={`${label}: network ${i + 1}`}
              onChange={(e) => update(i, { network: e.target.value })}
            >
              {SOCIAL_NETWORKS.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="rounded p-1 text-slate-600 hover:text-orange-600 disabled:opacity-30"
              aria-label="Move link up"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === rows.length - 1}
              className="rounded p-1 text-slate-600 hover:text-orange-600 disabled:opacity-30"
              aria-label="Move link down"
            >
              ▼
            </button>
            <button
              type="button"
              onClick={() => commit(rows.filter((_, j) => j !== i))}
              className="rounded p-1 text-slate-600 hover:text-red-600"
              aria-label="Delete link"
            >
              ✕
            </button>
          </div>

          <input
            className={inputClass}
            type="url"
            value={row.url}
            placeholder="https://"
            aria-label={`${label}: link ${i + 1}`}
            onChange={(e) => update(i, { url: e.target.value })}
          />

          {row.network === "custom" && (
            <>
              <input
                className={inputClass}
                value={row.label}
                placeholder="Name (read out by screen readers)"
                aria-label={`${label}: name ${i + 1}`}
                onChange={(e) => update(i, { label: e.target.value })}
              />
              <input
                className={inputClass}
                type="url"
                value={row.icon}
                placeholder="Icon image address (optional)"
                aria-label={`${label}: icon image ${i + 1}`}
                onChange={(e) => update(i, { icon: e.target.value })}
              />
            </>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => commit([...rows, { network: "instagram", url: "", label: "", icon: "" }])}
        className="flex h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 text-sm font-medium text-violet-600 hover:bg-slate-100"
      >
        <span aria-hidden="true">+</span> Add social link
      </button>
    </div>
  );
}

// An option that was changed from the theme default gets a small reset link
export function isOverridden(spec, value, any = false) {
  return (
    (any || spec.theme_default) &&
    JSON.stringify(value ?? spec.default) !== JSON.stringify(spec.default)
  );
}

export function ResetToTheme({ spec, value, onChange, any = false }) {
  if (!isOverridden(spec, value, any)) return null;

  return (
    <button
      type="button"
      onClick={() => onChange(structuredClone(spec.default))}
      className="mt-1 text-[11px] font-medium text-violet-600 underline-offset-2 hover:underline"
    >
      {spec.theme_default ? "Reset to theme default" : "Reset to default"}
    </button>
  );
}

// "contrast": [[keys...], [keys...]]: the first key with a value on each side is compared
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const HEX = /^#[0-9a-f]{6}$/i;

function ContrastWarning({ spec, values }) {
  if (!spec.contrast) return null;
  const [a, b] = spec.contrast.map((keys) =>
    keys.map((k) => values[k]).find((v) => HEX.test(v || ""))
  );
  if (!a || !b) return null;
  const ratio = contrastRatio(a, b);
  if (ratio >= 4.5) return null;
  return (
    <p role="status" className="mt-1 text-[11px] font-medium leading-snug text-[#B08D57]">
      Low contrast ({ratio.toFixed(1)}:1). Text may be hard to read; aim for at least 4.5:1.
    </p>
  );
}

// Hex text box beside a colour picker: changes only when a full #RRGGBB is typed
function HexInput({ value, onChange, label }) {
  const [text, setText] = useState(value || "");
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(value || "");
  }
  const invalid = text !== "" && !HEX.test(text);
  return (
    <input
      type="text"
      value={text}
      maxLength={7}
      spellCheck={false}
      aria-label={`${label} hex code`}
      aria-invalid={invalid}
      placeholder="None"
      onChange={(e) => {
        const next = e.target.value.trim();
        setText(next);
        if (HEX.test(next)) onChange(next.toUpperCase());
      }}
      onBlur={() => setText(value || "")}
      className={`h-10 w-24 rounded-lg border px-2 text-sm tabular-nums uppercase ${
        invalid ? "border-[#B08D57]" : "border-slate-200"
      }`}
    />
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
  catalogErrors,
  onChange,
  extra,
  initialOpen = "content",
  resetAny = false,
  exclusive = false,
}) {
  // exclusive (Theme settings): at most one group open; initialOpen null starts them all closed
  const [open, setOpen] = useState(initialOpen ? { [initialOpen]: true } : {});

  const toggle = (id) =>
    setOpen((current) =>
      exclusive ? (current[id] ? {} : { [id]: true }) : { ...current, [id]: !current[id] }
    );

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
          <section key={group.id} className="border-b border-slate-100 last:border-b-0">
            <button
              type="button"
              onClick={() => toggle(group.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-charcoal-navy hover:bg-slate-100"
              aria-expanded={isOpen}
              aria-controls={`group-${group.id}`}
            >
              {group.label}

              <svg
                {...iconProps}
                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {isOpen && (
              <div id={`group-${group.id}`} className="grid gap-4 px-4 pb-5 pt-1">
                {entries.map(([key, spec]) => (
                  <div key={key}>
                    <Field
                      spec={spec}
                      value={values[key]}
                      collections={collections}
                      products={products}
                      catalogErrors={catalogErrors}
                      onChange={handlerFor(key)}
                    />
                    <ContrastWarning spec={spec} values={values} />
                    <ResetToTheme
                      spec={spec}
                      value={values[key]}
                      onChange={handlerFor(key)}
                      any={resetAny}
                    />
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
  return (
    <>
      {spec.help ? (
        <span className="mt-1 block text-[11px] leading-snug text-slate-400">{spec.help}</span>
      ) : null}
      <ThemeLink link={spec.link} />
    </>
  );
}

export const Field = memo(function Field({
  spec,
  value,
  collections,
  products = [],
  catalogErrors = {},
  onChange,
}) {
  const label = (
    <span className="mb-1 block text-xs font-medium text-violet-600">{spec.label}</span>
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
              <span className="h-5 w-9 rounded-full bg-slate-300 transition-colors peer-checked:bg-orange-600 peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30" />
              <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
            </span>
          </label>

          <Help spec={spec} />
        </div>
      );

    case "range":
      if (spec.box) {
        const clamp = (n) => Math.min(spec.max, Math.max(spec.min, Math.round(n)));
        return (
          <div>
            {label}

            <div className="flex items-center gap-2">
              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step || 1}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                aria-label={spec.label}
                className="min-w-0 flex-1 accent-orange-600"
              />

              <div className="flex h-8 w-20 shrink-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-orange-600">
                <input
                  type="number"
                  min={spec.min}
                  max={spec.max}
                  value={value}
                  aria-label={`${spec.label} (${spec.unit || "number"})`}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (e.target.value !== "" && !Number.isNaN(n)) onChange(clamp(n));
                  }}
                  className="h-full min-w-0 flex-1 px-2 text-sm outline-none"
                />
                {spec.unit && (
                  <span className="border-l border-slate-200 bg-slate-100 px-1.5 text-xs leading-8 text-slate-600">
                    {spec.unit}
                  </span>
                )}
              </div>
            </div>

            <Help spec={spec} />
          </div>
        );
      }

      return (
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs font-medium text-violet-600">
            {spec.label}
            <span className="tabular-nums text-slate-600">
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
            className="w-full accent-orange-600"
          />

          <Help spec={spec} />
        </label>
      );

    case "number":
      return (
        <label className="block">
          {label}

          <div className="flex h-10 items-center overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-orange-600">
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
              <span className="border-l border-slate-200 bg-slate-100 px-3 text-xs leading-10 text-slate-600">
                {spec.unit}
              </span>
            )}
          </div>

          <Help spec={spec} />
        </label>
      );

    case "select":
      if (spec.ui === "icons") {
        return (
          <div>
            {label}

            <div
              className="flex w-fit rounded-lg border border-slate-200 bg-slate-100 p-0.5"
              role="radiogroup"
              aria-label={spec.label}
            >
              {spec.options
                .filter((o) => ALIGN_ICONS[o])
                .map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={value === o}
                    aria-label={`${spec.label}: ${o}`}
                    title={o.charAt(0).toUpperCase() + o.slice(1)}
                    onClick={() => onChange(o)}
                    className={`flex h-8 w-10 items-center justify-center rounded-md transition-colors ${
                      value === o
                        ? "bg-white text-charcoal-navy shadow-sm"
                        : "text-slate-500 hover:text-orange-600"
                    }`}
                  >
                    <svg {...iconProps} className="h-4 w-4">
                      <path d={ALIGN_ICONS[o]} />
                    </svg>
                  </button>
                ))}
            </div>

            <Help spec={spec} />
          </div>
        );
      }

      if (spec.ui === "segmented") {
        return (
          <div>
            {label}

            <div
              className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5"
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
                      ? "bg-white text-charcoal-navy shadow-sm"
                      : "text-slate-600 hover:text-orange-600"
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
              className="h-10 w-12 rounded border border-slate-200"
              aria-label={spec.label}
            />

            <HexInput value={value} onChange={onChange} label={spec.label} />
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
              className={`h-10 w-12 rounded border border-slate-200 ${value ? "" : "opacity-40"}`}
              aria-label={spec.label}
            />

            <HexInput value={value} onChange={onChange} label={spec.label} />

            <span className="flex-1" />

            <button
              type="button"
              disabled={!value}
              onClick={() => onChange("")}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-violet-600 hover:border-orange-600 disabled:opacity-40"
            >
              {spec.palette ? "Use palette" : "None"}
            </button>
          </div>

          {/* Whether this element follows the palette or has its own colour */}
          {spec.palette && (
            <p className="mt-1 text-xs text-slate-600" data-testid="color-source">
              {value ? "Own colour" : `Follows the palette (${spec.palette})`}
            </p>
          )}

          <Help spec={spec} />
        </div>
      );

    case "font":
      return (
        <div>
          {label}

          <FontPicker
            value={value || ""}
            allowTheme={Boolean(spec.theme_default || spec.allow_empty)}
            onChange={onChange}
            label={spec.label}
          />

          <FontFallback value={value} />

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
            <option value="">{spec.empty_label || "Newest products"}</option>

            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {collectionLabel(c)}
                {c.status === "draft" ? " (Draft, hidden on store)" : ""}
              </option>
            ))}
          </select>

          {catalogErrors.collections && (
            <p className="mt-1 text-xs text-red-600">{catalogErrors.collections}</p>
          )}

          <Help spec={spec} />
        </label>
      );

    case "image":
    case "image_picker":
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
            error={catalogErrors.products}
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
              title: collectionLabel(c),
              status: c.status || "active",
            }))}
            max={spec.max || 12}
            noun="collections"
            error={catalogErrors.collections}
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
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-orange-600"
          />

          <span className="mt-1 block text-[11px] leading-snug text-slate-600">
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

    case "menu_ref":
      return (
        <div>
          {label}

          <MenuPicker value={value || ""} onChange={onChange} label={spec.label} />

          <Help spec={spec} />
        </div>
      );

    case "social":
      return (
        <div>
          {label}

          <SocialLinksEditor value={value || ""} onChange={onChange} label={spec.label} />

          <Help spec={spec} />
        </div>
      );

    case "css":
      // Custom CSS: checked by the server (no <, @import, scripts or http:// links) when it is saved
      return (
        <label className="block">
          {label}

          <textarea
            rows={6}
            value={value}
            maxLength={spec.max}
            spellCheck={false}
            placeholder=".product-card__title { letter-spacing: .02em; }"
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-orange-600"
          />

          <p className="text-right text-xs text-slate-400">
            {(value || "").length} / {spec.max}
          </p>

          <Help spec={spec} />
        </label>
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
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-600"
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
  // A section's Product card is built in (it can't be added twice, hidden or deleted) and holds the cart icon and
  // heart itself: none of those three is offered
  const hasCard = blocks.some((b) => b.type === "card_layout");

  const types = Object.entries(spec.blocks).filter(
    ([type, blockSpec]) => !blockSpec.child_blocks && !(hasCard && CARD_EXTRA_BLOCKS.includes(type))
  );

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
    <div className="border-t border-slate-100 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Blocks{" "}
          <span className="font-normal text-slate-400">
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
          className="mb-3 grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-2"
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
              className="truncate rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left text-xs text-charcoal-navy hover:border-orange-600 disabled:opacity-40 disabled:hover:border-slate-200"
            >
              {blockSpec.name}
            </button>
          ))}
        </div>
      )}

      {hasCard && (
        <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Every card of this section is drawn from the Product card block below: open it to change
          the image, title, price and the other parts of every card. The card options above (vendor,
          rating, price, image shape and so on) are used only if you edited this section's code in
          Edit code.
        </p>
      )}

      {blocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-600">
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
                className={`relative rounded-lg border border-slate-200 bg-white ${dragging ? "opacity-40" : ""}`}
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
                    className={`min-w-0 flex-1 truncate text-left ${block.hidden ? "text-slate-400" : ""}`}
                    onClick={() => onOpen(i)}
                    title={title}
                  >
                    {title}
                  </button>

                  {!blockSpec.child_blocks && (
                    <>
                      <button
                        type="button"
                        onClick={() => onToggle(i)}
                        className={iconButton}
                        aria-label={
                          block.hidden ? `Show ${blockSpec.name}` : `Hide ${blockSpec.name}`
                        }
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
                    </>
                  )}

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
        <p className="mt-2 text-[11px] text-slate-400">
          Click a block to edit it. Drag by the handle to reorder, or onto another section that
          appears below.
        </p>
      )}
    </div>
  );
}

// The parts of a Product card block (image, title, price, ...): add, drag to reorder, hide, delete. A part opens in
// its own panel (onOpen), and every card of the section follows what is set there.
export function CardChildren({
  blockSpec,
  items,
  selected,
  insertAfter = null,
  onInsertDone,
  onChange,
  onOpen,
}) {
  const parts = blockSpec.child_blocks;

  const [menu, setMenu] = useState(false);

  // The "+" under a part in the preview: open the menu, and the new part goes right after that part
  useEffect(() => {
    if (insertAfter !== null) setMenu(true);
  }, [insertAfter]);
  const [drag, setDrag] = useState(null); // { from, over } while a part is being dragged
  const listRef = useRef(null);

  const used = new Set(items.map((c) => c.type));
  const full = items.length >= 12;

  function move(from, to) {
    if (to < 0 || to >= items.length || to === from) return;
    onChange((list) => {
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
    });
  }

  function startDrag(e, from) {
    e.preventDefault();
    let over = from;
    setDrag({ from, over });

    const onMove = (ev) => {
      const rows = listRef.current ? [...listRef.current.querySelectorAll("[data-card-part]")] : [];
      for (const row of rows) {
        const box = row.getBoundingClientRect();
        if (ev.clientY >= box.top && ev.clientY <= box.bottom) {
          over = Number(row.dataset.cardPart);
          setDrag({ from, over });
          break;
        }
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setDrag(null);
      move(from, over);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return (
    <div className="border-t border-slate-100 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Card parts <span className="font-normal text-slate-400">({items.length}/12)</span>
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

      {menu && insertAfter !== null && items[insertAfter] && (
        <p className="mb-1.5 text-[11px] text-slate-500">
          Adding after {parts[items[insertAfter].type]?.name}
        </p>
      )}

      {menu && (
        <div
          className="mb-3 grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-2"
          role="menu"
        >
          {Object.entries(parts).map(([type, partSpec]) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              disabled={used.has(type)}
              title={used.has(type) ? "The card already has this part" : undefined}
              onClick={() => {
                const at =
                  insertAfter !== null ? Math.min(insertAfter + 1, items.length) : items.length;
                onChange((list) =>
                  list.splice(at, 0, {
                    type,
                    hidden: false,
                    settings: defaultsOf(partSpec.settings),
                  })
                );
                setMenu(false);
                onInsertDone?.();
                onOpen(at);
              }}
              className="truncate rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left text-xs text-charcoal-navy hover:border-orange-600 disabled:opacity-40 disabled:hover:border-slate-200"
            >
              {partSpec.name}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-600">
          The card is empty. Use "+ Add block" to add an image, title, price and more.
        </p>
      ) : (
        <ul ref={listRef} className="grid gap-1.5">
          {items.map((child, i) => {
            const partSpec = parts[child.type];
            if (!partSpec) return null;

            const dragging = drag?.from === i;
            const lineHere = drag && drag.over === i && drag.from !== i;

            return (
              <li
                key={`${child.type}-${i}`}
                data-card-part={i}
                className={`relative rounded-lg border bg-white ${
                  selected === i ? "border-orange-600" : "border-slate-200"
                } ${dragging ? "opacity-40" : ""}`}
              >
                {lineHere && <DropLine after={drag.over > drag.from} />}

                <div className="flex items-center gap-1 px-1.5 py-1.5 text-sm">
                  <DragHandle
                    label={`Move ${partSpec.name}`}
                    onPointerDown={(e) => startDrag(e, i)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        move(i, i - 1);
                      }
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        move(i, i + 1);
                      }
                    }}
                  />

                  <button
                    type="button"
                    className={`min-w-0 flex-1 truncate text-left ${child.hidden ? "text-slate-400" : ""}`}
                    onClick={() => onOpen(i)}
                  >
                    {partSpec.name}
                    {child.hidden ? " · Hidden" : ""}
                  </button>

                  <button
                    type="button"
                    className={iconButton}
                    onClick={() =>
                      onChange((list) => {
                        list[i].hidden = !list[i].hidden;
                      })
                    }
                    aria-label={child.hidden ? `Show ${partSpec.name}` : `Hide ${partSpec.name}`}
                    aria-pressed={!child.hidden}
                    title={child.hidden ? "Hidden: click to show" : "Visible: click to hide"}
                  >
                    <EyeIcon hidden={child.hidden} />
                  </button>

                  <button
                    type="button"
                    className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                    onClick={() => onChange((list) => list.splice(i, 1))}
                    aria-label={`Delete ${partSpec.name}`}
                    title="Delete"
                  >
                    <svg {...iconProps} className="h-3.5 w-3.5">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && (
        <p className="mt-2 text-[11px] text-slate-400">
          Click a part to edit it on every card. Drag by the handle to reorder. The badge sits on
          the image; the cart icon and heart sit over it, so their place on the card stays.
        </p>
      )}
    </div>
  );
}

// A group block's child blocks: add, reorder, hide, delete and edit them right inside the group's panel
export function GroupChildren({
  spec,
  items,
  groups,
  collections,
  products,
  catalogErrors,
  onChange,
}) {
  const [open, setOpen] = useState(null);
  const [menu, setMenu] = useState(false);

  const types = Object.entries(spec.blocks).filter(([, s]) => s.generic && !s.nests);
  const full = items.length >= 12;

  function move(i, delta) {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    onChange((list) => {
      [list[i], list[j]] = [list[j], list[i]];
    });
    setOpen(null);
  }

  return (
    <div className="border-t border-slate-100 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Blocks in group <span className="font-normal text-slate-400">({items.length}/12)</span>
        </h3>
        <button
          type="button"
          className={smallButton}
          disabled={full}
          onClick={() => setMenu((v) => !v)}
        >
          + Add block
        </button>
      </div>

      {menu && (
        <div
          className="mb-3 grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-2"
          role="menu"
        >
          {types.map(([type, blockSpec]) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              onClick={() => {
                onChange((list) =>
                  list.push({ type, hidden: false, settings: defaultsOf(blockSpec.settings) })
                );
                setOpen(items.length);
                setMenu(false);
              }}
              className="truncate rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left text-xs text-charcoal-navy hover:border-orange-600"
            >
              {blockSpec.name}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-600">
          This group is empty. Use "+ Add block" to put blocks inside it.
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {items.map((child, i) => {
            const childSpec = spec.blocks[child.type];
            if (!childSpec) return null;
            const isOpen = open === i;
            return (
              <li key={i} className="rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center gap-1 px-1.5 py-1.5 text-sm">
                  <button
                    type="button"
                    className={`min-w-0 flex-1 truncate text-left ${child.hidden ? "text-slate-400" : ""}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    {blockTitle(child, childSpec, i)}
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                    disabled={i === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                    disabled={i === items.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    onClick={() =>
                      onChange((list) => {
                        list[i].hidden = !list[i].hidden;
                      })
                    }
                    aria-label={child.hidden ? "Show" : "Hide"}
                  >
                    <EyeIcon hidden={child.hidden} />
                  </button>
                  <button
                    type="button"
                    className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                    onClick={() => {
                      onChange((list) => {
                        list.splice(i, 1);
                      });
                      setOpen(null);
                    }}
                    aria-label={`Delete ${childSpec.name}`}
                  >
                    ×
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-2">
                    <GroupedFields
                      fields={childSpec.settings}
                      values={child.settings}
                      groups={groups}
                      collections={collections}
                      products={products}
                      catalogErrors={catalogErrors}
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
      setError("Image is too large. Maximum size is 1MB per image.");
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
        <div className="relative overflow-hidden rounded-lg border border-slate-200">
          <img
            src={shown}
            alt=""
            loading="lazy"
            className="h-28 w-full object-contain bg-slate-50 p-2"
          />

          {progress !== null && (
            <div className="absolute inset-x-0 top-0 h-1 bg-black/10" aria-label="Uploading">
              <div
                className="h-full bg-orange-600 transition-[width] duration-150"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-linear-to-t from-brand-navy-500/50 to-transparent p-1.5">
            {progress !== null && (
              <span className="mr-auto rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Uploading {Math.round(progress * 100)}%
              </span>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={progress !== null}
              className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-charcoal-navy disabled:opacity-60"
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
          className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 text-xs text-slate-600 hover:border-orange-600"
        >
          <span className="font-medium text-charcoal-navy">Upload image</span>
          JPG, PNG or WEBP, up to 1MB
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
export function ProductPicker({ value, products, max, noun = "products", error, onChange }) {
  const [query, setQuery] = useState("");

  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  const matches = products.filter(
    (p) => !value.includes(p.id) && p.title.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="rounded-lg border border-slate-200">
      {value.length > 0 && (
        <ul className="divide-y divide-slate-100 border-b border-slate-200">
          {value.map((id) => (
            <li key={id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">
                {byId[id]?.title || "No longer available"}
              </span>

              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== id))}
                className="text-xs text-slate-600 hover:text-red-600"
                aria-label={`Remove ${byId[id]?.title || "item"}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p className="px-3 py-2.5 text-xs text-red-600">{error}</p>
      ) : products.length === 0 ? (
        <p className="px-3 py-2.5 text-xs text-slate-600">
          Add {noun} first, then choose them here.
        </p>
      ) : value.length >= max ? (
        <p className="px-3 py-2.5 text-xs text-slate-600">You've chosen the maximum of {max}.</p>
      ) : (
        <div className="p-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${noun} to add`}
            className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm outline-none focus:border-orange-600"
          />

          <ul className="mt-1 max-h-40 overflow-y-auto">
            {matches.slice(0, 50).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onChange([...value, p.id])}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100"
                >
                  <span className="min-w-0 truncate">{p.title}</span>

                  {p.status !== "active" && (
                    <span className="shrink-0 text-[10px] uppercase text-slate-400">
                      {p.status}
                    </span>
                  )}
                </button>
              </li>
            ))}

            {matches.length === 0 && (
              <li className="px-2 py-1.5 text-xs text-slate-600">No matching {noun}.</li>
            )}
          </ul>
        </div>
      )}

      {value.some((id) => byId[id] && byId[id].status !== "active") && (
        <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
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
    <div className="overflow-hidden rounded-lg border border-slate-200 focus-within:border-orange-600">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-100 p-1">
        {RICH_TEXT_TOOLS.map((tool) => (
          <button
            key={tool.title}
            type="button"
            title={tool.title}
            aria-label={tool.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(tool)}
            className={`h-7 min-w-7 rounded px-2 text-xs text-charcoal-navy hover:bg-white ${tool.className || ""}`}
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
        className="min-h-30 px-3 py-2 text-sm leading-relaxed outline-none [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}

// The page's fixed parts. They are theme-wide, so they open the matching group of Theme settings.
export const LAYOUT_ROWS = [
  {
    part: "top",
    group: "header",
    file: "sections/header.liquid",
    name: "Header",
    hint: "Announcement, logo and navigation",
    icon: "M3 5h18v5H3zM7 15h10M9 19h6",
  },
  {
    part: "bottom",
    group: "footer",
    file: "sections/footer.liquid",
    name: "Footer",
    hint: "Links, social and copyright",
    icon: "M3 14h18v5H3zM7 9h10M9 5h6",
  },
];

// A labelled group in the sections list (Header / Template / Footer), divided from the one above
export function GroupHeading({ children }) {
  return (
    <h3 className="mt-4 px-5 pb-2 pt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
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
          <li key={row.group} className="flex items-center">
            <button
              type="button"
              onClick={() => onOpen(row.group)}
              className={`flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg pl-1.5 pr-1 text-left text-[13px] ${
                active ? "bg-slate-100 font-medium" : "hover:bg-slate-50"
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-500">
                <svg {...iconProps} className="h-4 w-4">
                  <path d={row.icon} />
                </svg>
              </span>
              <span className="min-w-0 flex-1 truncate">
                {row.name} <span className="text-xs text-slate-400">{row.hint}</span>
              </span>
            </button>
            {row.file && (
              <a
                href={`/editor-demo?${new URLSearchParams({
                  file: row.file,
                  ...(getEditingThemeId() ? { theme: getEditingThemeId() } : {}),
                }).toString()}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Edit code: ${row.file}`}
                className="shrink-0 rounded px-1.5 text-xs text-slate-500 hover:bg-slate-100"
              >
                Edit code
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function CenteredMessage({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-600">
      <p>{children}</p>
    </div>
  );
}
