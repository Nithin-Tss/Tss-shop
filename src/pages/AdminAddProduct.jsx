import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { EXTRA_FIELDS, emptyExtraFields, useFieldLabels, withLabels } from "@/lib/productFields";
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload, storeBaseUrl } from "@/lib/api";
import { can, getActiveStore, useSession } from "@/lib/auth";

const NAVY = "#14130F";
const PRODUCTS_URL = "/admin/online-store/products";

const inputClass =
  "w-full h-11 rounded-[10px] border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10";

// Photos: JPG, PNG or WEBP, up to 1MB each
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_PHOTO_SIZE = 1 * 1024 * 1024;

// Returns why a photo can't be added, or "" when it's fine
function photoError(file) {
  // Some browsers leave file.type empty, so fall back to the extension
  const isAllowedType = file.type
    ? PHOTO_TYPES.includes(file.type)
    : PHOTO_EXTENSIONS.test(file.name);
  if (!isAllowedType) return "Not a supported image. Use JPG, PNG or WEBP.";
  if (file.size > MAX_PHOTO_SIZE) return "Image is too large. Maximum size is 1MB per image.";
  return "";
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFilenameFromUrl(url) {
  if (!url) return "";
  try {
    const cleanUrl = url.split("?")[0].split("#")[0];
    const parts = cleanUrl.split("/");
    const name = parts[parts.length - 1];
    return decodeURIComponent(name) || "image";
  } catch {
    return "image";
  }
}
const slugify = (text) =>
  (text || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// What the owner types in "URL handle": lower case, dashes for anything else
const cleanHandle = (text) =>
  text
    .replace(/^products\/?/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-");

// Product.status values, and how they read in the top bar and the Visibility card
const STATUSES = [
  {
    value: "active",
    label: "Active",
    text: "Shoppers can find and buy it",
    badge: "bg-emerald-100 text-emerald-800",
  },
  {
    value: "draft",
    label: "Draft",
    text: "Only you can see it",
    badge: "bg-slate-100 text-slate-600",
  },
  {
    value: "archived",
    label: "Archived",
    text: "Hidden and kept for your records",
    badge: "bg-amber-100 text-amber-800",
  },
];

// Product.theme_template values
const PAGE_LAYOUTS = [
  { value: "default", label: "Default product page" },
  { value: "featured", label: "Featured product" },
  { value: "minimal", label: "Minimal" },
];

const TARGET_SALES_CHANNELS = [
  { name: "Online Store", type: "online" },
  { name: "Point of Sale", type: "pos" },
  { name: "Shop", type: "shop" },
];

// Lists from the API come back either as an array or as { results }
const listOf = (res) =>
  Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.results) ? res.data.results : [];

// Categories in dropdown order: each top-level category followed by its subcategories
function categoryOptions(categories) {
  const byParent = {};
  categories.forEach((c) => (byParent[c.parent || "root"] ||= []).push(c));
  Object.values(byParent).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));

  const rows = [];
  const walk = (parentId, depth) =>
    (byParent[parentId] || []).forEach((c) => {
      rows.push({ id: c.id, label: `${"   ".repeat(depth)}${depth ? "↳ " : ""}${c.name}` });
      if (depth < 4) walk(c.id, depth + 1);
    });
  walk("root", 0);
  return rows;
}

/* ---------- small building blocks ---------- */

function Card({ title, hint, action, children }) {
  return (
    <section>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        {(title || action) && (
          <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {title && <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>}
              {hint && <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{hint}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

function Field({ label, help, error, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-slate-900">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : (
        help && <span className="mt-1 block text-xs text-slate-500">{help}</span>
      )}
    </label>
  );
}

function FieldError({ message }) {
  return message ? <span className="mt-1 block text-xs text-red-600">{message}</span> : null;
}

const withError = (error) => (error ? "border-red-400" : "");

function MoneyInput({ value, onChange, placeholder = "0.00", error }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
        $
      </span>
      <input
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} pl-7 ${withError(error)}`}
      />
    </div>
  );
}

const sameText = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Round "+" button beside a sidebar label
function CircleAddButton({ label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-slate-600 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
    >
      <svg
        viewBox="0 0 20 20"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M10 5v10M5 10h10" strokeLinecap="round" />
      </svg>
    </button>
  );
}

// Removable grey chips in a rounded box
function ChipBox({ values, onRemove, empty }) {
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white p-1.5">
      {values.length ? (
        values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-sm text-slate-800"
          >
            {v}
            {onRemove && (
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onRemove(v)}
                className="text-slate-500 hover:text-slate-900"
              >
                ×
              </button>
            )}
          </span>
        ))
      ) : (
        <span className="px-1.5 text-sm text-slate-400">{empty}</span>
      )}
    </div>
  );
}

// Search popover shared by the "+" buttons: filters existing values, offers Add "typed value"
function AddValuePopover({
  title,
  options,
  selected = [],
  onPick,
  onClose,
  canCreate = true,
  busy,
  error,
}) {
  const [query, setQuery] = useState("");
  const boxRef = useRef(null);
  const typed = query.trim();

  useEffect(() => {
    const outside = (e) => boxRef.current && !boxRef.current.contains(e.target) && onClose();
    const escape = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [onClose]);

  const matches = options.filter(
    (o) => !selected.some((s) => sameText(s, o)) && o.toLowerCase().includes(typed.toLowerCase())
  );
  const exact = [...options, ...selected].find((o) => typed && sameText(o, typed));
  const pick = (value) => !busy && onPick(value);

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-label={title}
      className="absolute right-0 top-8 z-40 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
    >
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (exact && !selected.some((s) => sameText(s, exact))) pick(exact);
          else if (!exact && typed && canCreate) pick(typed);
        }}
        placeholder="Search"
        aria-label={`Search ${title.toLowerCase()}`}
        className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10"
      />
      <ul className="mt-1 max-h-56 overflow-y-auto text-sm">
        {matches.map((o) => (
          <li key={o}>
            <button
              type="button"
              onClick={() => pick(o)}
              className="w-full rounded-md px-2.5 py-1.5 text-left hover:bg-slate-100"
            >
              {o}
            </button>
          </li>
        ))}
        {typed && !exact && canCreate && (
          <li>
            <button
              type="button"
              onClick={() => pick(typed)}
              disabled={busy}
              className="w-full rounded-md px-2.5 py-1.5 text-left font-medium text-charcoal-navy hover:bg-slate-100 disabled:opacity-50"
            >
              {busy ? "Adding..." : `Add "${typed}"`}
            </button>
          </li>
        )}
        {!matches.length && !(typed && !exact && canCreate) && (
          <li className="px-2.5 py-1.5 text-slate-400">No matches</li>
        )}
      </ul>
      {error && <p className="px-2.5 pb-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const RECOMMENDED_OPTIONS = [
  "Allergen information",
  "Beer style",
  "Beer variety",
  "Country",
  "Dietary preferences",
  "Dietary supplements",
  "Package type",
  "Volume",
  "Pack size",
];

// "Add another option" dropdown: search the recommended names, or start a custom option
function OptionPicker({ label, usedNames, onPick }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const buttonRef = useRef(null);
  const boxRef = useRef(null);
  const listRef = useRef(null);
  const typed = query.trim();

  const used = usedNames.map((n) => n.toLowerCase());
  const matches = RECOMMENDED_OPTIONS.filter(
    (n) => !used.includes(n.toLowerCase()) && n.toLowerCase().includes(typed.toLowerCase())
  );
  // Keyboard order: the matches (or Create "typed" when none), then the fixed custom row
  const items = [
    ...matches.map((n) => ({ key: n, label: n, name: n })),
    ...(!matches.length && typed
      ? [{ key: "typed", label: `Create "${typed}"`, name: typed, custom: true }]
      : []),
    { key: "custom", name: typed, custom: true, footer: true },
  ];
  const current = Math.min(active, items.length - 1);

  const close = (refocus) => {
    setOpen(false);
    setQuery("");
    setActive(0);
    if (refocus) buttonRef.current?.focus();
  };
  const pick = (item) => {
    close(true);
    onPick(item.name, item.custom);
  };

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => {
      if (boxRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
      close(boxRef.current?.contains(document.activeElement));
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${current}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [current, open]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((current + step + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(items[current]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    }
  };

  const rowClass = (i) =>
    `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 ${
      i === current ? "bg-slate-100" : ""
    }`;
  const footerIndex = items.length - 1;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close(false) : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal-navy hover:underline"
      >
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 6.5v7M6.5 10h7" strokeLinecap="round" />
        </svg>
        {label}
      </button>
      {open && (
        <div
          ref={boxRef}
          role="dialog"
          aria-label="Add an option"
          onKeyDown={onKeyDown}
          className="absolute left-0 top-full z-40 mt-2 flex w-72 max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_-6px_rgba(15,23,42,0.18)]"
        >
          <div className="p-3 pb-2">
            <div className="relative">
              <svg
                viewBox="0 0 20 20"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="9" cy="9" r="5.5" />
                <path d="M13.5 13.5L17 17" strokeLinecap="round" />
              </svg>
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Search"
                aria-label="Search options"
                aria-controls="option-picker-list"
                aria-activedescendant={`option-picker-${items[current].key}`}
                className="h-10 w-full rounded-[10px] border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>
          <ul
            id="option-picker-list"
            role="listbox"
            ref={listRef}
            className="max-h-64 overflow-y-auto px-2 pb-2"
          >
            {matches.length > 0 && (
              <li role="presentation" className="px-3 pb-1 pt-1 text-xs font-medium text-slate-500">
                Recommended
              </li>
            )}
            {items.slice(0, -1).map((item, i) => (
              <li
                key={item.key}
                id={`option-picker-${item.key}`}
                role="option"
                aria-selected={i === current}
                data-index={i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer ${rowClass(i)}`}
              >
                {item.label}
              </li>
            ))}
            {items.length === 1 && (
              <li className="px-3 py-2 text-sm text-slate-400">No more suggestions</li>
            )}
          </ul>
          <div className="border-t border-slate-200 p-2">
            <button
              type="button"
              id={`option-picker-${items[footerIndex].key}`}
              data-index={footerIndex}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(items[footerIndex])}
              onMouseEnter={() => setActive(footerIndex)}
              className={`${rowClass(footerIndex)} font-medium`}
            >
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="7.5" />
                <path d="M10 6.5v7M6.5 10h7" strokeLinecap="round" />
              </svg>
              Create custom option
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Full-width rounded dropdown with up/down chevrons
function ChevronSelect({ id, value, onChange, label, children }) {
  return (
    <div className="relative">
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-[10px] border border-slate-300 bg-white pl-3.5 pr-9 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10"
      >
        {children}
      </select>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path
          d="M6.5 8L10 4.5 13.5 8M6.5 12l3.5 3.5 3.5-3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// Trimmed, non-empty values without case-insensitive duplicates, sorted
const uniqueText = (values) =>
  values
    .map((v) => (v || "").trim())
    .filter((v, i, all) => v && all.findIndex((x) => sameText(x, v)) === i)
    .sort((a, b) => a.localeCompare(b));

/* ---------- variants ---------- */

// Product.options: [{ name, values }] in display order; each variant's values: variant.options = { [name]: value }
const MAX_PRODUCT_OPTIONS = 3;
const MAX_VARIANTS = 100;

const firstFields = (v) => ({
  price: v?.price ?? "",
  compareAt: v?.compare_at_price ?? "",
  sku: v?.sku || "",
  weight: v?.weight && Number(v.weight) > 0 ? v.weight : "",
});

const isMoney = (s) => /^\d+(\.\d{1,2})?$/.test(String(s).trim());
const isWhole = (s) => /^\d+$/.test(String(s).trim());
const isWeight = (s) => /^\d+(\.\d{1,3})?$/.test(String(s).trim());
const formatAud = (value) =>
  value === "" || value == null || Number.isNaN(Number(value))
    ? ""
    : `$${Number(value).toFixed(2)}`;

// "Single / 375ML", else the SKU, else "Default variant"
const variantName = (v, options) => {
  const values = options.map((o) => v.options?.[o.name]).filter(Boolean);
  return values.length ? values.join(" / ") : v.sku || "Default variant";
};
const comboKey = (values, options) =>
  options.map((o) => (values?.[o.name] || "").toLowerCase()).join("\u0000");

// Every combination of the options' values, in option order
const combinations = (options) =>
  options.reduce(
    (acc, o) => acc.flatMap((combo) => o.values.map((value) => ({ ...combo, [o.name]: value }))),
    [{}]
  );

let draftSeq = 0;
const draftId = () => `draft-${(draftSeq += 1)}`;

// Stock of a variant from the inventory rows: not tracked when it has no row anywhere
function stockOf(variant, items, location) {
  const rows = items.filter((i) => i.variant === variant.id);
  if (!rows.length) return { tracked: false, available: null };
  if (location === "all")
    return { tracked: true, available: rows.reduce((n, i) => n + i.available, 0) };
  const row = rows.find((i) => i.location === location);
  return { tracked: true, available: row ? row.available : null };
}

function stockStatus(stock) {
  if (!stock.tracked) return "untracked";
  if (stock.available == null || stock.available === 0) return "out";
  return stock.available < 0 ? "oversold" : "in";
}

const STOCK_FILTERS = [
  { value: "in", label: "In stock" },
  { value: "out", label: "Out of stock" },
  { value: "oversold", label: "Oversold" },
  { value: "untracked", label: "Not tracked" },
];

function TriCheckbox({ checked, indeterminate, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate) && !checked;
  });
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="h-4 w-4 cursor-pointer accent-charcoal-navy"
    />
  );
}

function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-xl ${wide ? "max-w-5xl" : "max-w-lg"}`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 text-lg text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

const ghostButton =
  "h-9 rounded-full px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50";
const outlineButton =
  "h-8 rounded-full border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50";
const primaryButton =
  "h-9 rounded-full bg-charcoal-navy px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50";
const cellInput =
  "h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10";
const notYet = "Not available yet";

// Edit option names and values; preview the variants created and removed, then save them in one product PATCH
const blankOption = () => ({
  id: draftId(),
  name: "",
  original: null,
  values: [{ id: draftId(), value: "", original: null }],
  defaultValue: "",
});

function OptionsEditor({ productId, options, variants, startWithNew, onClose, onApplied }) {
  const [opts, setOpts] = useState(() => [
    ...options.map((o) => ({
      id: draftId(),
      name: o.name,
      original: o.name,
      values: o.values.map((value) => ({ id: draftId(), value, original: value })),
      defaultValue: "",
    })),
    // startWithNew: the new option's name ("" for a blank one); focus goes to its first value once named
    ...(startWithNew != null
      ? [{ ...blankOption(), name: startWithNew, focus: startWithNew.trim() ? "value" : "name" }]
      : []),
  ]);
  const [step, setStep] = useState("edit");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(null); // { optionId, index }
  const changed =
    JSON.stringify(opts.map((o) => [o.name, o.values.map((v) => v.value)])) !==
    JSON.stringify(options.map((o) => [o.name, o.values]));

  const close = () => {
    if (saving) return;
    if (!changed || window.confirm("Discard your option changes?")) onClose();
  };

  const update = (optionId, change) =>
    setOpts((prev) => prev.map((o) => (o.id === optionId ? { ...o, ...change(o) } : o)));
  const moveValue = (optionId, from, to) =>
    update(optionId, (o) => {
      if (to < 0 || to >= o.values.length) return {};
      const values = [...o.values];
      const [item] = values.splice(from, 1);
      values.splice(to, 0, item);
      return { values };
    });

  // Problems that stop the preview, by field
  const problems = [];
  const names = new Set();
  opts.forEach((o, i) => {
    const name = o.name.trim();
    if (!name) problems.push(`Option ${i + 1} needs a name.`);
    else if (names.has(name.toLowerCase()))
      problems.push(`There are two options called "${name}".`);
    names.add(name.toLowerCase());
    const seen = new Set();
    if (!o.values.length) problems.push(`${name || `Option ${i + 1}`} needs at least one value.`);
    o.values.forEach((v) => {
      const value = v.value.trim();
      if (!value) problems.push(`${name || `Option ${i + 1}`} has a blank value.`);
      else if (seen.has(value.toLowerCase()))
        problems.push(`${name || `Option ${i + 1}`} has "${value}" more than once.`);
      seen.add(value.toLowerCase());
    });
    if (o.original == null && variants.length && !o.defaultValue)
      problems.push(`Choose which ${name || "new option"} value the existing variants get.`);
  });

  const plan = () => {
    const newOptions = opts.map((o) => ({
      name: o.name.trim(),
      values: o.values.map((v) => v.value.trim()),
    }));
    const kept = [];
    const removed = [];
    const taken = new Map();
    variants.forEach((v) => {
      const values = {};
      let why = null;
      opts.forEach((o) => {
        if (why) return;
        const name = o.name.trim();
        if (o.original == null) {
          values[name] = (o.values.find((x) => x.id === o.defaultValue)?.value || "").trim();
          return;
        }
        const current = v.options?.[o.original];
        const entry = o.values.find((x) => x.original != null && x.original === current);
        if (!entry)
          why = current ? `${o.original} "${current}" is removed` : `it has no ${o.original}`;
        else values[name] = entry.value.trim();
      });
      if (!why) {
        const key = comboKey(values, newOptions);
        if (taken.has(key)) why = `same options as ${variantName(taken.get(key), options)}`;
        else {
          taken.set(key, v);
          kept.push({ variant: v, values });
          return;
        }
      }
      removed.push({ variant: v, why });
    });
    const skus = new Set(variants.map((v) => (v.sku || "").toLowerCase()));
    const base = variants[0]?.sku || "SKU";
    const created = combinations(newOptions)
      .filter((combo) => !taken.has(comboKey(combo, newOptions)))
      .map((combo) => {
        const stem = `${base}-${Object.values(combo).join("-")}`
          .toUpperCase()
          .replace(/[^A-Z0-9-]+/g, "");
        let sku = stem;
        for (let n = 2; skus.has(sku.toLowerCase()); n += 1) sku = `${stem}-${n}`;
        skus.add(sku.toLowerCase());
        return { values: combo, sku };
      });
    return { newOptions, kept, removed, created };
  };

  const preview = step === "review" ? plan() : null;
  const total = preview ? preview.kept.length + preview.created.length : 0;
  const basePrice = variants[0]?.price ?? "0";

  const apply = async () => {
    if (saving || !preview) return;
    setSaving(true);
    setError("");
    // The complete list: every variant that stays plus the new ones. Only the confirmed removals are left out
    const res = await apiPatch(`/api/v1/catalog/products/${productId}/`, {
      options: preview.newOptions,
      variants: [
        ...preview.kept.map((k) => ({ id: k.variant.id, options: k.values })),
        ...preview.created.map((c) => ({ sku: c.sku, price: basePrice, options: c.values })),
      ],
    });
    setSaving(false);
    if (!res.ok) {
      setError(
        res.formError ||
          Object.values(res.fieldErrors || {})[0] ||
          res.error ||
          "The options couldn't be saved."
      );
      return;
    }
    onApplied(res.data);
  };

  const footer =
    step === "edit" ? (
      <>
        <button type="button" onClick={close} className={ghostButton}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirmDelete(false);
            setStep("review");
          }}
          disabled={!changed || problems.length > 0}
          className={primaryButton}
        >
          Review changes
        </button>
      </>
    ) : (
      <>
        <button
          type="button"
          onClick={() => setStep("edit")}
          disabled={saving}
          className={ghostButton}
        >
          Back
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={
            saving || total > MAX_VARIANTS || (preview.removed.length > 0 && !confirmDelete)
          }
          className={primaryButton}
        >
          {saving ? "Saving..." : "Done"}
        </button>
      </>
    );

  return (
    <Modal
      title={step === "edit" ? "Edit options" : "Review variant changes"}
      onClose={close}
      footer={footer}
      wide
    >
      {step === "edit" ? (
        <div className="space-y-4">
          {opts.map((o, oi) => (
            <div key={o.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-end gap-2">
                <label className="block flex-1">
                  <span className="mb-1 block text-xs font-semibold text-slate-700">
                    Option name
                  </span>
                  <input
                    value={o.name}
                    onChange={(e) => update(o.id, () => ({ name: e.target.value }))}
                    placeholder="e.g. Pack size"
                    autoFocus={o.focus === "name"}
                    className={cellInput}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setOpts((prev) => prev.filter((x) => x.id !== o.id))}
                  className="h-9 rounded-full px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  Remove option
                </button>
              </div>
              <p className="mt-3 mb-1 text-xs font-semibold text-slate-700">
                Values{" "}
                <span className="font-normal text-slate-500">
                  (drag, or use the arrows or Alt+↑/↓, to reorder)
                </span>
              </p>
              <ul className="space-y-1.5">
                {o.values.map((v, vi) => (
                  <li
                    key={v.id}
                    draggable
                    onDragStart={() => setDragging({ optionId: o.id, index: vi })}
                    onDragOver={(e) => dragging?.optionId === o.id && e.preventDefault()}
                    onDrop={() => {
                      if (dragging?.optionId === o.id) moveValue(o.id, dragging.index, vi);
                      setDragging(null);
                    }}
                    onDragEnd={() => setDragging(null)}
                    className="flex items-center gap-1.5"
                  >
                    <span aria-hidden className="cursor-grab select-none px-1 text-slate-400">
                      ⋮⋮
                    </span>
                    <input
                      value={v.value}
                      aria-label={`${o.name || `Option ${oi + 1}`} value ${vi + 1}`}
                      autoFocus={o.focus === "value" && vi === 0}
                      onChange={(e) =>
                        update(o.id, (opt) => ({
                          values: opt.values.map((x) =>
                            x.id === v.id ? { ...x, value: e.target.value } : x
                          ),
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                          e.preventDefault();
                          moveValue(o.id, vi, vi + (e.key === "ArrowUp" ? -1 : 1));
                        }
                      }}
                      className={cellInput}
                    />
                    <button
                      type="button"
                      onClick={() => moveValue(o.id, vi, vi - 1)}
                      disabled={vi === 0}
                      aria-label={`Move ${v.value || "value"} up`}
                      className="h-8 w-8 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveValue(o.id, vi, vi + 1)}
                      disabled={vi === o.values.length - 1}
                      aria-label={`Move ${v.value || "value"} down`}
                      className="h-8 w-8 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        update(o.id, (opt) => ({
                          values: opt.values.filter((x) => x.id !== v.id),
                          defaultValue: opt.defaultValue === v.id ? "" : opt.defaultValue,
                        }))
                      }
                      aria-label={`Remove ${v.value || "value"}`}
                      className="h-8 w-8 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-700"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() =>
                  update(o.id, (opt) => ({
                    values: [...opt.values, { id: draftId(), value: "", original: null }],
                  }))
                }
                className="mt-2 text-xs font-semibold text-charcoal-navy hover:underline"
              >
                + Add value
              </button>
              {o.original == null && variants.length > 0 && (
                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-semibold text-slate-700">
                    Value for the {variants.length} existing variant
                    {variants.length === 1 ? "" : "s"}
                  </span>
                  <select
                    value={o.defaultValue}
                    onChange={(e) => update(o.id, () => ({ defaultValue: e.target.value }))}
                    className={cellInput}
                  >
                    <option value="">Choose a value</option>
                    {o.values
                      .filter((v) => v.value.trim())
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.value.trim()}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </div>
          ))}
          {opts.length < MAX_PRODUCT_OPTIONS && (
            <button
              type="button"
              onClick={() => setOpts((prev) => [...prev, blankOption()])}
              className="text-sm font-semibold text-charcoal-navy hover:underline"
            >
              + Add another option
            </button>
          )}
          {problems.length > 0 && changed && (
            <ul role="alert" className="list-disc space-y-0.5 pl-5 text-xs text-red-600">
              {[...new Set(problems)].map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <p className="text-slate-600">
            {preview.kept.length} variant{preview.kept.length === 1 ? "" : "s"} keep their ID, price
            and stock.
          </p>
          {preview.created.length > 0 && (
            <div>
              <p className="font-semibold text-slate-900">
                {preview.created.length} variant{preview.created.length === 1 ? "" : "s"} will be
                created
              </p>
              <p className="text-xs text-slate-500">
                Each gets the first variant's price ({formatAud(basePrice)}) and the SKU shown,
                which you can change later. They start as Not tracked.
              </p>
              <ul className="mt-1 max-h-40 list-disc overflow-y-auto pl-5 text-slate-700">
                {preview.created.map((c) => (
                  <li key={c.sku}>
                    {Object.values(c.values).join(" / ") || "Default variant"}{" "}
                    <span className="text-xs text-slate-500">({c.sku})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preview.removed.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="font-semibold text-red-800">
                ⚠ {preview.removed.length} variant{preview.removed.length === 1 ? "" : "s"} will be
                deleted
              </p>
              <ul className="mt-1 max-h-40 list-disc overflow-y-auto pl-5 text-red-800">
                {preview.removed.map((r) => (
                  <li key={r.variant.id}>
                    {variantName(r.variant, options)} <span className="text-xs">({r.why})</span>
                  </li>
                ))}
              </ul>
              <label className="mt-2 flex items-center gap-2 text-xs font-medium text-red-900">
                <input
                  type="checkbox"
                  checked={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.checked)}
                  className="h-4 w-4"
                />
                Delete these {preview.removed.length} variant
                {preview.removed.length === 1 ? "" : "s"}
              </label>
            </div>
          )}
          {total > MAX_VARIANTS && (
            <p role="alert" className="text-red-600">
              That would make {total} variants. A product can have at most {MAX_VARIANTS}.
            </p>
          )}
          {!preview.created.length && !preview.removed.length && (
            <p className="text-slate-600">
              No variants are created or deleted; only names and order change.
            </p>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </Modal>
  );
}

// Add a variant (variant null) or edit one. Stock goes through the inventory API (adjust_inventory)
function VariantEditor({
  productId,
  variant,
  options,
  variants,
  locations,
  items,
  canSeeStock,
  canSetStock,
  onClose,
  onSaved,
}) {
  const [savedId, setSavedId] = useState(variant?.id || null);
  const start = variant || {};
  const initial = {
    options: Object.fromEntries(options.map((o) => [o.name, start.options?.[o.name] || ""])),
    price: start.price ?? variants[0]?.price ?? "",
    compareAt: start.compare_at_price ?? "",
    sku: start.sku || "",
    weight: start.weight && Number(start.weight) > 0 ? start.weight : "",
    continueSelling: Boolean(start.continue_selling),
  };
  const initialStock = Object.fromEntries(
    locations.map((l) => {
      const row = variant && items.find((i) => i.variant === variant.id && i.location === l.id);
      return [l.id, row ? String(row.available) : ""];
    })
  );
  const [form, setForm] = useState(initial);
  const [stock, setStock] = useState(initialStock);
  const [savedForm, setSavedForm] = useState(initial);
  const [savedStock, setSavedStock] = useState(initialStock);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const dirty = JSON.stringify([form, stock]) !== JSON.stringify([savedForm, savedStock]);
  const tracked = Boolean(variant) && items.some((i) => i.variant === variant.id);

  const errors = {};
  options.forEach((o) => {
    if (!form.options[o.name]) errors[o.name] = `Choose a ${o.name}.`;
  });
  if (options.length && !Object.keys(errors).length) {
    const key = comboKey(form.options, options);
    const clash = variants.find((v) => v.id !== savedId && comboKey(v.options, options) === key);
    if (clash) errors.combo = `${variantName(clash, options)} already exists.`;
  }
  if (!isMoney(form.price)) errors.price = "Enter a price, like 12.50.";
  if (form.compareAt !== "" && !isMoney(form.compareAt))
    errors.compareAt = "Enter a price, like 15.00.";
  if (!form.sku.trim()) errors.sku = "Enter a SKU.";
  if (form.weight !== "" && !isWeight(form.weight)) errors.weight = "Enter a weight of 0 or more.";
  Object.entries(stock).forEach(([loc, value]) => {
    if (value !== "" && !isWhole(value)) errors[`stock-${loc}`] = "Whole number of 0 or more.";
    if (value === "" && savedStock[loc] !== "")
      errors[`stock-${loc}`] = "Enter a number to keep this stock.";
  });

  const close = () => {
    if (saving) return;
    if (!dirty || window.confirm("Discard your changes to this variant?")) onClose();
  };

  const save = async () => {
    if (saving || Object.keys(errors).length) return;
    setSaving(true);
    setError("");
    const body = {};
    if (!savedId || form.price !== savedForm.price) body.price = form.price;
    if (!savedId || form.compareAt !== savedForm.compareAt)
      body.compare_at_price = form.compareAt === "" ? null : form.compareAt;
    if (!savedId || form.sku !== savedForm.sku) body.sku = form.sku.trim();
    if (!savedId || form.weight !== savedForm.weight)
      body.weight = form.weight === "" ? "0" : form.weight;
    if (!savedId || form.continueSelling !== savedForm.continueSelling)
      body.continue_selling = form.continueSelling;
    if (
      options.length &&
      (!savedId || comboKey(form.options, options) !== comboKey(savedForm.options, options))
    )
      body.options = form.options;

    let id = savedId;
    if (!id || Object.keys(body).length) {
      const res = id
        ? await apiPatch(`/api/v1/catalog/variants/${id}/`, body)
        : await apiPost("/api/v1/catalog/variants/", { product: productId, ...body });
      if (!res.ok) {
        setSaving(false);
        setError(
          res.formError ||
            Object.values(res.fieldErrors || {})[0] ||
            res.error ||
            "The variant couldn't be saved."
        );
        return;
      }
      id = res.data.id;
      setSavedId(id); // a retry updates this variant instead of creating another
      setSavedForm(form);
    }

    const failed = [];
    const nowSaved = { ...savedStock };
    for (const [loc, value] of Object.entries(stock)) {
      if (value === savedStock[loc] || value === "") continue;
      const res = await apiPost("/api/v1/inventory/items/set/", {
        variant: id,
        location: loc,
        available: Number(value),
        reason: "correction",
      });
      if (res.ok) nowSaved[loc] = value;
      else failed.push(`${locations.find((l) => l.id === loc)?.name}: ${res.error}`);
    }
    setSavedStock(nowSaved);
    setSaving(false);
    if (failed.length) {
      setError(`The variant was saved, but some stock wasn't: ${failed.join(" ")}`);
      onSaved({ keepOpen: true });
      return;
    }
    onSaved({});
  };

  const field = (label, key, input, help) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      {input}
      {errors[key] ? (
        <span className="mt-1 block text-xs text-red-600">{errors[key]}</span>
      ) : (
        help && <span className="mt-1 block text-xs text-slate-500">{help}</span>
      )}
    </label>
  );
  const disabledField = (label) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      <input disabled placeholder={notYet} className={`${cellInput} bg-slate-50 text-slate-400`} />
    </label>
  );

  return (
    <Modal
      title={
        savedId
          ? `Edit ${variantName({ ...start, options: savedForm.options, sku: savedForm.sku }, options)}`
          : "Add variant"
      }
      onClose={close}
      wide
      footer={
        <>
          {dirty && (
            <span className="mr-auto text-xs font-medium text-amber-700">● Unsaved changes</span>
          )}
          <button type="button" onClick={close} disabled={saving} className={ghostButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty || Object.keys(errors).length > 0}
            className={primaryButton}
          >
            {saving ? "Saving..." : savedId ? "Save variant" : "Add variant"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {options.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {options.map((o) =>
              field(
                o.name,
                o.name,
                <select
                  value={form.options[o.name]}
                  onChange={(e) => set("options", { ...form.options, [o.name]: e.target.value })}
                  className={cellInput}
                >
                  <option value="">Choose</option>
                  {o.values.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              )
            )}
            {errors.combo && <p className="text-xs text-red-600 sm:col-span-3">{errors.combo}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {field(
            "Price (AUD)",
            "price",
            <input
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              inputMode="decimal"
              className={cellInput}
            />
          )}
          {field(
            "Compare-at price (AUD)",
            "compareAt",
            <input
              value={form.compareAt}
              onChange={(e) => set("compareAt", e.target.value)}
              inputMode="decimal"
              className={cellInput}
            />
          )}
          {disabledField("Cost per item")}
          {field(
            "SKU",
            "sku",
            <input
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
              className={cellInput}
            />
          )}
          {disabledField("Barcode")}
          {field(
            "Weight",
            "weight",
            <input
              value={form.weight}
              onChange={(e) => set("weight", e.target.value)}
              inputMode="decimal"
              className={cellInput}
            />,
            "In your store's weight unit"
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {disabledField("Image")}
          {disabledField("Physical product")}
          {disabledField("Publishing")}
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-900">Inventory</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {tracked
              ? "Tracked. Changes are recorded in the stock history as corrections."
              : "Not tracked yet. Enter a quantity at a location to start tracking it. Turning tracking off is not available yet."}
          </p>
          {canSeeStock ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {locations.map((l) =>
                field(
                  `Available at ${l.name}`,
                  `stock-${l.id}`,
                  <input
                    value={stock[l.id]}
                    onChange={(e) => setStock((prev) => ({ ...prev, [l.id]: e.target.value }))}
                    disabled={!canSetStock}
                    placeholder="Not stocked"
                    inputMode="numeric"
                    className={`${cellInput} disabled:bg-slate-50 disabled:text-slate-400`}
                  />
                )
              )}
              {!locations.length && <p className="text-xs text-slate-500">No locations yet.</p>}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Stock is managed by people with inventory access.
            </p>
          )}
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={form.continueSelling}
              onChange={(e) => set("continueSelling", e.target.checked)}
              className="h-4 w-4 accent-charcoal-navy"
            />
            Continue selling when out of stock
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

// Fields the backend supports today. Everything else stays in BULK_NOT_AVAILABLE_BY_GROUP
// until the backend grows a field for it; move it up here the day it does.
const BULK_FIELD_COLUMNS = [
  { key: "price", label: "Price", group: "Pricing" },
  { key: "compare_at_price", label: "Compare-at price", group: "Pricing" },
  { key: "sku", label: "SKU", group: "Inventory" },
  { key: "continue_selling", label: "Continue selling", group: "Inventory" },
  { key: "weight", label: "Weight", group: "Shipping" },
];
const BULK_COLUMN_GROUPS = [
  "General",
  "Pricing",
  "Inventory",
  "Shipping",
  "Quantities by location",
  "Publishing",
];
const BULK_NOT_AVAILABLE_BY_GROUP = {
  Pricing: ["Cost per item", "Charge taxes", "Unit price"],
  Inventory: ["Barcodes", "Track quantity", "Bin names"],
  Shipping: [
    "Package",
    "Packed dimensions",
    "Physical product",
    "Harmonized system code",
    "Country of origin",
  ],
  Publishing: ["Sales channels"],
};
function bulkError(key, value) {
  if (key === "price") return isMoney(value) ? "" : "Enter a price, like 12.50.";
  if (key === "compare_at_price")
    return value === "" || isMoney(value) ? "" : "Enter a price or leave it empty.";
  if (key === "sku") return value.trim() ? "" : "Enter a SKU.";
  if (key === "continue_selling") return "";
  if (key === "weight")
    return value === "" || isWeight(value) ? "" : "Enter a weight of 0 or more.";
  return value === "" || isWhole(value) ? "" : "Whole number of 0 or more.";
}

// Spreadsheet-style editor for the selected variants only
function BulkEditor({
  rows,
  options,
  locations,
  location,
  items,
  canSetStock,
  productTitle,
  productImage,
  onClose,
  onSaved,
}) {
  const stockColumns = canSetStock
    ? locations.flatMap((l) => [
        {
          key: `avail-${l.id}`,
          label: `${l.name} - Available`,
          locationId: l.id,
          group: "Quantities by location",
        },
        {
          key: `onhand-${l.id}`,
          label: `${l.name} - On hand`,
          locationId: l.id,
          group: "Quantities by location",
          readOnly: true,
        },
      ])
    : [];
  const allColumns = [...BULK_FIELD_COLUMNS, ...stockColumns];
  const isAvailCol = (key) => key.startsWith("avail-");
  const isOnHandCol = (key) => key.startsWith("onhand-");
  const locIdOf = (key) => key.slice(key.indexOf("-") + 1);
  const isNumericCol = (key) =>
    key === "price" ||
    key === "compare_at_price" ||
    key === "weight" ||
    isAvailCol(key) ||
    isOnHandCol(key);
  const TITLE_COL_WIDTH = 400;
  const colWidthFor = (key) => {
    if (key === "price") return 180;
    if (key === "sku") return 400;
    if (isAvailCol(key) || isOnHandCol(key)) return 260;
    return 180;
  };

  const [pickedColumns, setColumns] = useState(() => {
    const base = ["price", "sku"];
    const preferredAvail =
      stockColumns.find((c) => c.locationId === location && isAvailCol(c.key)) ||
      stockColumns.find((c) => isAvailCol(c.key));
    const preferredOnHand =
      stockColumns.find((c) => c.locationId === location && isOnHandCol(c.key)) ||
      stockColumns.find((c) => isOnHandCol(c.key));
    if (preferredAvail) base.push(preferredAvail.key);
    if (preferredOnHand) base.push(preferredOnHand.key);
    return base;
  });
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState("");
  const matchesSearch = (label) => label.toLowerCase().includes(columnSearch.trim().toLowerCase());

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!columnsMenuOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setColumnsMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [columnsMenuOpen]);

  const titleLabel = (v) => {
    const values = options.map((o) => v.options?.[o.name]).filter(Boolean);
    const variantPart = values.length ? values.join(" / ") : "Default variant";
    return `${productTitle || "Untitled product"} - ${variantPart}`;
  };

  const [edits, setEdits] = useState({}); // { [variantId]: { [column]: value } }
  const [range, setRange] = useState(null); // { anchor: [row, col], focus: [row, col] }
  const [extraCells, setExtraCells] = useState([]); // [[row, col], ...] from Ctrl/Alt-click
  const [mouseDown, setMouseDown] = useState(false);
  const [focusedCell, setFocusedCell] = useState(null); // "r-c" of the cell currently focused
  const [step, setStep] = useState("edit"); // "edit" | "confirm"
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const trackedVariant = (v) => items.some((i) => i.variant === v.id);
  const original = (v, key) => {
    if (isAvailCol(key)) {
      const row = items.find((i) => i.variant === v.id && i.location === locIdOf(key));
      return row ? String(row.available) : "";
    }
    if (isOnHandCol(key)) {
      const row = items.find((i) => i.variant === v.id && i.location === locIdOf(key));
      return row && row.on_hand != null ? String(row.on_hand) : "";
    }
    if (key === "compare_at_price") return v.compare_at_price ?? "";
    if (key === "weight") return v.weight && Number(v.weight) > 0 ? v.weight : "";
    if (key === "continue_selling") return v.continue_selling ? "true" : "false";
    return v[key] ?? "";
  };
  const valueOf = (v, key) => edits[v.id]?.[key] ?? original(v, key);
  const setCell = (prev, v, key, value) => {
    const next = { ...prev, [v.id]: { ...prev[v.id] } };
    if (value === original(v, key)) delete next[v.id][key];
    else next[v.id][key] = value;
    if (!Object.keys(next[v.id]).length) delete next[v.id];
    return next;
  };
  const changedCount = Object.values(edits).reduce((n, row) => n + Object.keys(row).length, 0);
  const problems = [];
  rows.forEach((v) =>
    Object.entries(edits[v.id] || {}).forEach(([key, value]) => {
      const message = bulkError(key, value);
      if (message)
        problems.push({ id: v.id, key, message: `${variantName(v, options)}: ${message}` });
    })
  );
  // A hidden column can still hold an invalid edit (e.g. it was hidden after the error appeared);
  // bring it back into view so the error is visible, rather than failing silently.
  const hiddenProblemKeys = [...new Set(problems.map((p) => p.key))].filter(
    (k) => !pickedColumns.includes(k)
  );
  const columns = hiddenProblemKeys.length
    ? [...pickedColumns, ...hiddenProblemKeys]
    : pickedColumns;
  const shownColumns = allColumns.filter((c) => columns.includes(c.key));

  const inRange = (r, c) => {
    if (!range) return false;
    const [r1, c1] = range.anchor;
    const [r2, c2] = range.focus;
    return (
      r >= Math.min(r1, r2) &&
      r <= Math.max(r1, r2) &&
      c >= Math.min(c1, c2) &&
      c <= Math.max(c1, c2)
    );
  };
  const isExtra = (r, c) => extraCells.some(([rr, cc]) => rr === r && cc === c);
  const isSelected = (r, c) => inRange(r, c) || isExtra(r, c);
  const selectedCells = () => {
    const map = new Map();
    if (range) {
      const [r1, c1] = range.anchor;
      const [r2, c2] = range.focus;
      for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r += 1)
        for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c += 1) map.set(`${r}-${c}`, [r, c]);
    }
    extraCells.forEach(([r, c]) => map.set(`${r}-${c}`, [r, c]));
    return [...map.values()];
  };
  const focusCell = (r, c) => document.querySelector(`[data-bulk-cell="${r}-${c}"]`)?.focus();

  // Typing in the active cell updates every other selected cell in the same column
  const editCell = (r, c, value) => {
    const col = shownColumns[c];
    if (!col || isOnHandCol(col.key)) return;
    const targets = isSelected(r, c) ? selectedCells().filter(([, cc]) => cc === c) : [[r, c]];
    setEdits((prev) => {
      let next = prev;
      targets.forEach(([rr]) => {
        const v = rows[rr];
        if (v && !(isAvailCol(col.key) && !trackedVariant(v)))
          next = setCell(next, v, col.key, value);
      });
      return next;
    });
  };

  const paste = (e, r, c) => {
    const text = e.clipboardData.getData("text");
    if (!/[\t\n]/.test(text.trim())) return; // one value: the input handles it
    e.preventDefault();
    const grid = text
      .replace(/\r/g, "")
      .replace(/\n$/, "")
      .split("\n")
      .map((line) => line.split("\t"));
    setEdits((prev) => {
      let next = prev;
      grid.forEach((line, dr) =>
        line.forEach((value, dc) => {
          const v = rows[r + dr];
          const col = shownColumns[c + dc];
          if (v && col && !isOnHandCol(col.key) && !(isAvailCol(col.key) && !trackedVariant(v)))
            next = setCell(next, v, col.key, value.trim());
        })
      );
      return next;
    });
  };

  const close = () => {
    if (saving) return;
    if (!changedCount || window.confirm("Discard your bulk edits?")) onClose();
  };

  // Saves only the edited fields, one variant at a time; failed rows keep their edits so a
  // retry only touches them (succeeded rows are pruned from `edits` below)
  const doSave = async () => {
    setSaving(true);
    const saved = [];
    const failed = [];
    let stockSaved = false;
    for (const v of rows) {
      const rowEdits = edits[v.id];
      if (!rowEdits) continue;
      const body = {};
      Object.entries(rowEdits).forEach(([key, value]) => {
        if (isAvailCol(key) || isOnHandCol(key)) return;
        if (key === "compare_at_price") body[key] = value === "" ? null : value;
        else if (key === "weight") body[key] = value === "" ? "0" : value;
        else if (key === "continue_selling") body[key] = value === "true";
        else body[key] = key === "sku" ? value.trim() : value;
      });
      let message = "";
      if (Object.keys(body).length) {
        const res = await apiPatch(`/api/v1/catalog/variants/${v.id}/`, body);
        if (!res.ok)
          message = res.formError || Object.values(res.fieldErrors || {})[0] || res.error;
      }
      if (!message) {
        const stockKeys = Object.keys(rowEdits).filter(isAvailCol);
        for (const key of stockKeys) {
          const value = rowEdits[key];
          if (value === "") continue;
          const locId = locIdOf(key);
          const res = await apiPost("/api/v1/inventory/items/set/", {
            variant: v.id,
            location: locId,
            available: Number(value),
            reason: "correction",
          });
          if (res.ok) stockSaved = true;
          else {
            message = `Stock failed: ${res.error}`;
            break;
          }
        }
      }
      if (message) failed.push({ id: v.id, name: variantName(v, options), message });
      else saved.push(v.id);
    }
    setEdits((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => !saved.includes(id)))
    );
    setSaving(false);
    setStep("edit");
    setResult({ saved: saved.length, failed });
    await onSaved({ stock: stockSaved, closing: !failed.length, count: saved.length });
  };

  const openConfirm = () => {
    if (saving || !changedCount || problems.length) return;
    setResult(null);
    setStep("confirm");
  };
  const retryFailed = () => doSave();

  if (step === "confirm") {
    const changes = [];
    rows.forEach((v) => {
      const rowEdits = edits[v.id];
      if (!rowEdits) return;
      Object.entries(rowEdits).forEach(([key, value]) => {
        const col = allColumns.find((c) => c.key === key);
        changes.push({
          id: `${v.id}-${key}`,
          variant: variantName(v, options),
          label: col?.label || key,
          from: original(v, key) || "(empty)",
          to: value || "(empty)",
        });
      });
    });
    return (
      <Modal
        title="Review changes"
        onClose={close}
        wide
        footer={
          <>
            <button
              type="button"
              onClick={() => setStep("edit")}
              disabled={saving}
              className={ghostButton}
            >
              Back
            </button>
            <button type="button" onClick={doSave} disabled={saving} className={primaryButton}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          {changes.length} change{changes.length === 1 ? "" : "s"} across{" "}
          {Object.keys(edits).length} variant{Object.keys(edits).length === 1 ? "" : "s"}.
        </p>
        <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 text-sm">
          {changes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="text-slate-700">
                {c.variant} <span className="text-slate-400">·</span> {c.label}
              </span>
              <span className="font-medium text-slate-900">
                {c.from} <span className="text-slate-400">→</span> {c.to}
              </span>
            </li>
          ))}
        </ul>
      </Modal>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2.5">
        <button type="button" onClick={close} disabled={saving} className={ghostButton}>
          ← Back
        </button>
        <h2 className="text-sm font-semibold text-slate-900">
          Editing {rows.length} variant{rows.length === 1 ? "" : "s"}
        </h2>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {changedCount
              ? `${changedCount} changed cell${changedCount === 1 ? "" : "s"}`
              : "No changes yet"}
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setColumnsMenuOpen((v) => !v)}
              aria-expanded={columnsMenuOpen}
              className={outlineButton}
            >
              Columns
            </button>
            {columnsMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setColumnsMenuOpen(false)} />
                <div
                  role="dialog"
                  aria-label="Columns"
                  className="fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-slate-200 bg-white shadow-xl"
                >
                  <div className="border-b border-slate-200 p-3">
                    <input
                      type="text"
                      value={columnSearch}
                      onChange={(e) => setColumnSearch(e.target.value)}
                      placeholder="Search fields"
                      autoFocus
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {BULK_COLUMN_GROUPS.map((group) => {
                      const groupColumns = allColumns.filter(
                        (c) => c.group === group && matchesSearch(c.label)
                      );
                      const disabledLabels = (BULK_NOT_AVAILABLE_BY_GROUP[group] || []).filter(
                        matchesSearch
                      );
                      const showTitleRow = group === "General" && matchesSearch("Title");
                      if (!groupColumns.length && !disabledLabels.length && !showTitleRow)
                        return null;
                      return (
                        <div key={group} className="mb-2">
                          <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase text-slate-400">
                            {group}
                          </p>
                          {showTitleRow && (
                            <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 opacity-80">
                              <input type="checkbox" checked disabled className="h-3.5 w-3.5" />
                              <span className="text-sm text-slate-800">Title</span>
                            </label>
                          )}
                          {groupColumns.map((c) => (
                            <label
                              key={c.key}
                              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={columns.includes(c.key)}
                                onChange={(e) =>
                                  setColumns((prev) =>
                                    e.target.checked
                                      ? [...prev, c.key]
                                      : prev.filter((k) => k !== c.key)
                                  )
                                }
                                className="h-3.5 w-3.5 accent-charcoal-navy"
                              />
                              <span className="text-sm text-slate-800">{c.label}</span>
                            </label>
                          ))}
                          {disabledLabels.map((label) => (
                            <label
                              key={label}
                              className="flex items-center gap-2 rounded-lg px-2 py-1.5 opacity-50"
                            >
                              <input type="checkbox" disabled className="h-3.5 w-3.5" />
                              <span className="text-sm text-slate-600">
                                {label} (Not available yet)
                              </span>
                            </label>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={openConfirm}
            disabled={saving || !changedCount || problems.length > 0}
            className={primaryButton}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {canSetStock && !stockColumns.length && (
        <p className="border-b border-slate-200 px-4 py-1.5 text-xs text-slate-500">
          No locations to show stock for.
        </p>
      )}
      {problems.length > 0 && (
        <p className="border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-600">
          Update the invalid values, then save again.
        </p>
      )}

      <div
        className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-x-contain"
        style={{ scrollPaddingLeft: TITLE_COL_WIDTH }}
        onMouseUp={() => setMouseDown(false)}
      >
        <table
          className="border-collapse text-sm"
          style={{ width: "max-content", tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: TITLE_COL_WIDTH }} />
            {shownColumns.map((c) => (
              <col key={c.key} style={{ width: colWidthFor(c.key) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 h-9 whitespace-nowrap border border-slate-200 border-r-2 border-r-slate-300 bg-slate-50 px-3 text-left font-semibold text-slate-900">
                Title
              </th>
              {shownColumns.map((c) => (
                <th
                  key={c.key}
                  className={`sticky top-0 z-10 h-9 whitespace-nowrap border border-slate-200 bg-slate-50 px-2 font-semibold text-slate-900 ${isNumericCol(c.key) ? "text-right" : "text-left"}`}
                >
                  {c.key === "price" ? (
                    <>
                      Price <span className="font-normal text-slate-400">AUD</span>
                    </>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((v, r) => (
              <tr key={v.id}>
                <td className="sticky left-0 z-[5] h-9 whitespace-nowrap border border-slate-200 border-r-2 border-r-slate-300 bg-white px-3">
                  <div className="flex items-center gap-2">
                    {productImage ? (
                      <img
                        src={productImage}
                        alt=""
                        className="h-6 w-6 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-6 w-6 shrink-0 rounded bg-slate-100" aria-hidden="true" />
                    )}
                    <span className="min-w-0 truncate text-slate-500">{titleLabel(v)}</span>
                  </div>
                </td>
                {shownColumns.map((col, c) => {
                  const isAvail = isAvailCol(col.key);
                  const isOnHand = isOnHandCol(col.key);
                  if ((isAvail || isOnHand) && !trackedVariant(v)) {
                    return (
                      <td
                        key={col.key}
                        className="h-9 border border-slate-200 px-2 text-center text-slate-400"
                      >
                        -
                      </td>
                    );
                  }
                  const value = valueOf(v, col.key);
                  const edited = edits[v.id] && col.key in edits[v.id];
                  const message = edited ? bulkError(col.key, value) : "";
                  const cellKey = `${r}-${c}`;
                  const isFocused = focusedCell === cellKey;
                  const showArrow = isAvail && edited && !isFocused;
                  const from = Number(original(v, col.key) || 0);
                  const to = Number(value || 0);
                  const selected = isSelected(r, c);
                  return (
                    <td
                      key={col.key}
                      className={`relative h-9 border border-slate-200 p-0 ${selected ? "bg-blue-50" : ""} ${isFocused ? "ring-2 ring-inset ring-blue-600" : selected ? "ring-1 ring-inset ring-blue-200" : ""}`}
                    >
                      {isOnHand ? (
                        <input
                          data-bulk-cell={cellKey}
                          value={value}
                          readOnly
                          aria-label={`${col.label} for ${titleLabel(v)}`}
                          className="h-full w-full border-0 bg-transparent px-2 text-right text-slate-500 outline-none"
                        />
                      ) : col.key === "continue_selling" ? (
                        <select
                          data-bulk-cell={cellKey}
                          value={value || "false"}
                          aria-label={`${col.label} for ${titleLabel(v)}`}
                          onChange={(e) => editCell(r, c, e.target.value)}
                          onMouseDown={(e) => startSelect(e, r, c)}
                          onFocus={() => onCellFocus(r, c)}
                          onBlur={() => setFocusedCell(null)}
                          className={`h-full w-full border-0 px-2 text-slate-900 outline-none ${edited ? "bg-amber-50" : "bg-transparent"}`}
                        >
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      ) : (
                        <input
                          data-bulk-cell={cellKey}
                          value={showArrow ? `${from} → ${to}` : value}
                          readOnly={showArrow}
                          aria-label={`${col.label} for ${titleLabel(v)}`}
                          aria-invalid={Boolean(message)}
                          title={message || undefined}
                          placeholder={isAvail ? "Not stocked" : ""}
                          onChange={(e) => editCell(r, c, e.target.value)}
                          onMouseDown={(e) => startSelect(e, r, c)}
                          onMouseEnter={() => onCellMouseEnter(r, c)}
                          onFocus={() => onCellFocus(r, c)}
                          onBlur={() => setFocusedCell(null)}
                          onPaste={(e) => paste(e, r, c)}
                          onKeyDown={(e) => onCellKeyDown(e, r, c)}
                          className={`h-full w-full border-0 px-2 text-slate-900 outline-none ${isNumericCol(col.key) ? "text-right" : ""} ${edited ? "bg-amber-50" : "bg-transparent"} ${message ? "text-red-600" : ""} ${showArrow ? (to > from ? "text-emerald-700" : to < from ? "text-red-700" : "") : ""}`}
                        />
                      )}
                      {edited && !showArrow && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute right-1 top-0.5 text-[10px] text-amber-600"
                        >
                          ●
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(problems.length > 0 || result) && (
        <div className="max-h-40 overflow-y-auto border-t border-slate-200 px-4 py-2 text-xs">
          {problems.length > 0 && (
            <ul role="alert" className="list-disc space-y-0.5 pl-5 text-red-600">
              {problems.map((p) => (
                <li key={`${p.id}-${p.key}`}>{p.message}</li>
              ))}
            </ul>
          )}
          {result && (
            <div role="status" className="text-sm">
              <p className="text-emerald-700">
                {result.saved} variant{result.saved === 1 ? "" : "s"} saved.
              </p>
              {result.failed.length > 0 && (
                <>
                  <p className="mt-1 font-semibold text-red-700">
                    {result.failed.length} failed. Their edits are kept so you can fix them:
                  </p>
                  <ul className="list-disc pl-5 text-red-700">
                    {result.failed.map((f) => (
                      <li key={f.id}>
                        {f.name}: {f.message}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={retryFailed}
                    disabled={saving}
                    className={`${outlineButton} mt-2`}
                  >
                    {saving ? "Retrying..." : `Retry ${result.failed.length} failed`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  function startSelect(e, r, c) {
    setMouseDown(true);
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      setExtraCells((prev) =>
        prev.some(([rr, cc]) => rr === r && cc === c)
          ? prev.filter(([rr, cc]) => !(rr === r && cc === c))
          : [...prev, [r, c]]
      );
      return;
    }
    setExtraCells([]);
    setRange((prev) =>
      e.shiftKey && prev ? { ...prev, focus: [r, c] } : { anchor: [r, c], focus: [r, c] }
    );
  }
  function onCellMouseEnter(r, c) {
    if (mouseDown) setRange((prev) => prev && { ...prev, focus: [r, c] });
  }
  function onCellFocus(r, c) {
    setFocusedCell(`${r}-${c}`);
    if (!mouseDown)
      setRange((prev) => (prev && inRange(r, c) ? prev : { anchor: [r, c], focus: [r, c] }));
    const el = document.querySelector(`[data-bulk-cell="${r}-${c}"]`);
    if (el) {
      const reduced =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: reduced ? "auto" : "smooth",
      });
    }
  }
  function onCellKeyDown(e, r, c) {
    if (e.key === "Enter") {
      e.preventDefault();
      focusCell(r + (e.shiftKey ? -1 : 1), c);
    } else if (e.key === "ArrowDown" && !e.shiftKey) {
      e.preventDefault();
      focusCell(r + 1, c);
    } else if (e.key === "ArrowUp" && !e.shiftKey) {
      e.preventDefault();
      focusCell(r - 1, c);
    } else if (e.key === "ArrowLeft" && !e.shiftKey && e.target.selectionStart === 0) {
      e.preventDefault();
      focusCell(r, c - 1);
    } else if (
      e.key === "ArrowRight" &&
      !e.shiftKey &&
      e.target.selectionStart === e.target.value.length
    ) {
      e.preventDefault();
      focusCell(r, c + 1);
    }
  }
}

function VariantsSection({
  productId,
  productTitle,
  productImage,
  options,
  variants,
  locations,
  canEdit,
  canSeeStock,
  canSetStock,
  stockVersion,
  channelCount,
  onSaved,
  onDirtyChange,
}) {
  const [items, setItems] = useState([]);
  const [stockState, setStockState] = useState(canSeeStock ? "loading" : "hidden");
  const [stockError, setStockError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [location, setLocation] = useState("all");
  const [search, setSearch] = useState("");
  const [optionFilters, setOptionFilters] = useState({});
  const [stockFilter, setStockFilter] = useState("");
  const [groupBy, setGroupBy] = useState("");
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [selected, setSelected] = useState([]);
  const [priceDrafts, setPriceDrafts] = useState({}); // { [variantId]: "12.50" }
  const [stockDrafts, setStockDrafts] = useState({}); // { "variantId|locationId": "5" }
  const [groupPrices, setGroupPrices] = useState({}); // what was typed in each group's price box
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: "success" | "error", text, failed? }
  const [modal, setModal] = useState(null); // { type: "options" | "variant" | "bulk" | "delete" | "image", ... }

  useEffect(() => {
    if (!canSeeStock || !productId) return undefined;
    let cancelled = false;
    apiGet(`/api/v1/inventory/items/?product=${productId}`).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setItems(listOf(res));
        setStockState("ready");
      } else {
        setStockError(res.error || "Stock couldn't be loaded.");
        setStockState("error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [productId, canSeeStock, stockVersion, reloadKey]);

  const draftCount = Object.keys(priceDrafts).length + Object.keys(stockDrafts).length;
  useEffect(() => {
    onDirtyChange(draftCount > 0);
  }, [draftCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fresh variants and options from the server after any save
  const refresh = async ({ stock } = {}) => {
    if (stock) setReloadKey((n) => n + 1);
    const res = await apiGet(`/api/v1/catalog/products/${productId}/`);
    if (!res.ok) {
      setNotice({
        kind: "error",
        text: "Saved, but the list couldn't be refreshed. Reload the page to see it.",
      });
      return false;
    }
    const fresh = res.data.variants || [];
    onSaved(fresh, res.data.options || []);
    const ids = new Set(fresh.map((v) => v.id));
    setSelected((prev) => prev.filter((id) => ids.has(id)));
    return true;
  };

  if (!productId) {
    return (
      <Card
        title="Variants"
        hint="Options such as pack size or volume, each with its own price, SKU and stock."
      >
        <p className="text-sm text-slate-500">
          Save the product first, then add options and variants here.
        </p>
      </Card>
    );
  }

  const locationName =
    location === "all" ? "all locations" : locations.find((l) => l.id === location)?.name || "";
  const stockFor = (v) => stockOf(v, items, location);
  const q = search.trim().toLowerCase();
  const shown = variants.filter((v) => {
    if (
      q &&
      ![productTitle, variantName(v, options), v.sku, ...Object.values(v.options || {})].some(
        (text) => (text || "").toLowerCase().includes(q)
      )
    )
      return false;
    for (const [name, value] of Object.entries(optionFilters))
      if (value && v.options?.[name] !== value) return false;
    if (stockFilter && stockState === "ready" && stockStatus(stockFor(v)) !== stockFilter)
      return false;
    return true;
  });
  const shownIds = shown.map((v) => v.id);
  const allShownSelected = shown.length > 0 && shownIds.every((id) => selected.includes(id));
  const someShownSelected = shownIds.some((id) => selected.includes(id));
  const toggleIds = (ids, on) =>
    setSelected((prev) =>
      on ? [...new Set([...prev, ...ids])] : prev.filter((id) => !ids.includes(id))
    );
  const selectedVariants = variants.filter((v) => selected.includes(v.id));

  const activeFilters = [
    q && { key: "search", label: `Search: "${search.trim()}"`, clear: () => setSearch("") },
    ...Object.entries(optionFilters)
      .filter(([, value]) => value)
      .map(([name, value]) => ({
        key: `opt-${name}`,
        label: `${name}: ${value}`,
        clear: () => setOptionFilters((prev) => ({ ...prev, [name]: "" })),
      })),
    location !== "all" && {
      key: "location",
      label: `Location: ${locationName}`,
      clear: () => setLocation("all"),
    },
    stockFilter && {
      key: "stock",
      label: STOCK_FILTERS.find((f) => f.value === stockFilter)?.label,
      clear: () => setStockFilter(""),
    },
  ].filter(Boolean);
  const clearFilters = () => {
    setSearch("");
    setOptionFilters({});
    setLocation("all");
    setStockFilter("");
  };

  const setPriceDraft = (v, value) =>
    setPriceDrafts((prev) => {
      const next = { ...prev };
      if (value === v.price) delete next[v.id];
      else next[v.id] = value;
      return next;
    });
  const setStockDraft = (v, value) =>
    setStockDrafts((prev) => {
      const key = `${v.id}|${location}`;
      const saved = items.find((i) => i.variant === v.id && i.location === location);
      const next = { ...prev };
      if (value === (saved ? String(saved.available) : "")) delete next[key];
      else next[key] = value;
      return next;
    });
  const draftProblems = [
    ...Object.entries(priceDrafts)
      .filter(([, value]) => !isMoney(value))
      .map(
        ([id]) =>
          `${variantName(variants.find((v) => v.id === id) || {}, options)}: enter a price, like 12.50.`
      ),
    ...Object.entries(stockDrafts)
      .filter(([, value]) => !isWhole(value))
      .map(
        ([key]) =>
          `${variantName(variants.find((v) => v.id === key.split("|")[0]) || {}, options)}: stock must be a whole number.`
      ),
  ];

  const discardDrafts = () => {
    if (window.confirm(`Discard ${draftCount} unsaved change${draftCount === 1 ? "" : "s"}?`)) {
      setPriceDrafts({});
      setStockDrafts({});
      setGroupPrices({});
      setNotice(null);
    }
  };

  // Inline edits: each price on its own variant, each stock count through the inventory API
  const saveDrafts = async () => {
    if (saving || !draftCount || draftProblems.length) return;
    setSaving(true);
    setNotice(null);
    const failed = [];
    let savedCount = 0;
    let stockSaved = false;
    const keptPrices = {};
    const keptStock = {};
    for (const [id, value] of Object.entries(priceDrafts)) {
      const res = await apiPatch(`/api/v1/catalog/variants/${id}/`, { price: value });
      if (res.ok) savedCount += 1;
      else {
        keptPrices[id] = value;
        failed.push(
          `${variantName(variants.find((v) => v.id === id) || {}, options)} price: ${res.formError || Object.values(res.fieldErrors || {})[0] || res.error}`
        );
      }
    }
    for (const [key, value] of Object.entries(stockDrafts)) {
      const [variant, loc] = key.split("|");
      const res = await apiPost("/api/v1/inventory/items/set/", {
        variant,
        location: loc,
        available: Number(value),
        reason: "correction",
      });
      if (res.ok) {
        savedCount += 1;
        stockSaved = true;
      } else {
        keptStock[key] = value;
        failed.push(
          `${variantName(variants.find((v) => v.id === variant) || {}, options)} stock: ${res.error}`
        );
      }
    }
    setPriceDrafts(keptPrices);
    setStockDrafts(keptStock);
    setGroupPrices({});
    await refresh({ stock: stockSaved });
    setSaving(false);
    setNotice(
      failed.length
        ? {
            kind: "error",
            text: `${savedCount} saved, ${failed.length} failed. The failed edits are kept.`,
            failed,
          }
        : { kind: "success", text: `Saved ${savedCount} change${savedCount === 1 ? "" : "s"}.` }
    );
  };

  const deleteSelected = async () => {
    const targets = selectedVariants;
    setModal({ type: "delete", busy: true });
    const failed = [];
    for (const v of targets) {
      const res = await apiDelete(`/api/v1/catalog/variants/${v.id}/`);
      if (!res.ok) failed.push(`${variantName(v, options)}: ${res.error}`);
    }
    setModal(null);
    await refresh({ stock: true });
    setNotice(
      failed.length
        ? {
            kind: "error",
            text: `${targets.length - failed.length} deleted, ${failed.length} not deleted.`,
            failed,
          }
        : {
            kind: "success",
            text: `Deleted ${targets.length} variant${targets.length === 1 ? "" : "s"}.`,
          }
    );
  };

  const stop = (e) => e.stopPropagation();
  const openEditor = (v) => canEdit && setModal({ type: "variant", id: v.id });

  const priceCell = (v) => {
    const value = priceDrafts[v.id] ?? v.price;
    const edited = v.id in priceDrafts;
    const bad = edited && !isMoney(value);
    return (
      <div className="relative w-[130px]" onClick={stop}>
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          $
        </span>
        <input
          value={value}
          onChange={(e) => setPriceDraft(v, e.target.value)}
          onBlur={() => edited && isMoney(value) && setPriceDraft(v, Number(value).toFixed(2))}
          inputMode="decimal"
          aria-label={`Price for ${variantName(v, options)} in AUD`}
          aria-invalid={bad}
          title={bad ? "Enter a price, like 12.50." : undefined}
          className={`${cellInput} pl-6 ${edited ? "border-amber-400 bg-amber-50" : ""} ${bad ? "border-red-500" : ""}`}
        />
      </div>
    );
  };

  const stockCell = (v) => {
    if (!canSeeStock) return <span className="text-slate-400">—</span>;
    if (stockState === "loading") return <span className="text-xs text-slate-400">Loading...</span>;
    if (stockState === "error") return <span className="text-xs text-red-600">Unavailable</span>;
    const stock = stockFor(v);
    const key = `${v.id}|${location}`;
    const label = !stock.tracked
      ? "Not tracked"
      : stock.available == null
        ? "Not stocked"
        : String(stock.available);
    if (location === "all" || !canSetStock || !canEdit) {
      return (
        <span
          className={stock.tracked && stock.available != null ? "text-slate-900" : "text-slate-500"}
        >
          {label}
          {stock.tracked && stock.available < 0 && (
            <span className="ml-1 text-xs text-red-700">(oversold)</span>
          )}
        </span>
      );
    }
    const edited = key in stockDrafts;
    const value = stockDrafts[key] ?? (stock.available == null ? "" : String(stock.available));
    return (
      <div onClick={stop} className="w-24">
        <input
          value={value}
          onChange={(e) => setStockDraft(v, e.target.value)}
          placeholder={stock.tracked ? "Not stocked" : "Not tracked"}
          inputMode="numeric"
          aria-label={`Available at ${locationName} for ${variantName(v, options)}`}
          className={`${cellInput} ${edited ? "border-amber-400 bg-amber-50" : ""} ${edited && !isWhole(value) ? "border-red-500" : ""}`}
        />
      </div>
    );
  };

  const imageButton = (count, label) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (canEdit) setModal({ type: "image", count });
      }}
      aria-label={label}
      className="flex h-[56px] w-[72px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-blue-500 hover:border-blue-400"
    >
      <svg
        viewBox="0 0 20 20"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="14" height="12" rx="2" />
        <path d="M3 13l4-4 3 3 2-2 5 5" />
      </svg>
    </button>
  );

  const publishingCell = () => (
    <span
      className="inline-flex items-center gap-1 text-xs text-slate-600"
      title="Set on the product"
    >
      <svg
        viewBox="0 0 20 20"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="7" />
      </svg>
      {channelCount ?? 0}
    </span>
  );

  const row = (v, indent) => (
    <tr
      key={v.id}
      onClick={() => openEditor(v)}
      className={`border-t border-slate-100 ${canEdit ? "cursor-pointer hover:bg-slate-50" : ""}`}
    >
      <td className={`py-2 pr-2 ${indent ? "pl-10" : "pl-4"}`} onClick={stop}>
        <TriCheckbox
          checked={selected.includes(v.id)}
          onChange={(e) => toggleIds([v.id], e.target.checked)}
          label={`Select ${variantName(v, options)}`}
        />
      </td>
      <td className="px-2 py-2">{imageButton(1, `Image for ${variantName(v, options)}`)}</td>
      <td className="px-2 py-2">
        {canEdit ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEditor(v);
            }}
            className="text-left text-sm font-medium text-slate-900 hover:underline"
          >
            {variantName(v, options)}
          </button>
        ) : (
          <span className="text-sm font-medium text-slate-900">{variantName(v, options)}</span>
        )}
        <span className="block text-xs text-slate-500">{v.sku ? `SKU ${v.sku}` : "No SKU"}</span>
      </td>
      <td className="px-2 py-2">{priceCell(v)}</td>
      <td className="px-2 py-2">{stockCell(v)}</td>
      <td className="px-2 py-2" onClick={stop}>
        {publishingCell()}
      </td>
    </tr>
  );

  const groups =
    groupBy && options.length > 1
      ? (options.find((o) => o.name === groupBy)?.values || [])
          .map((value) => ({ value, rows: shown.filter((v) => v.options?.[groupBy] === value) }))
          .filter((g) => g.rows.length)
      : null;

  const groupRow = (g) => {
    const ids = g.rows.map((v) => v.id);
    const open = expanded[g.value];
    const prices = g.rows.map((v) => Number(priceDrafts[v.id] ?? v.price));
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const tracked = g.rows.filter((v) => stockFor(v).tracked);
    const total = tracked.reduce((n, v) => n + (stockFor(v).available || 0), 0);
    return (
      <tr key={`group-${g.value}`} className="border-t border-slate-200 bg-slate-50/60">
        <td className="py-2 pl-4 pr-2">
          <TriCheckbox
            checked={ids.every((id) => selected.includes(id))}
            indeterminate={ids.some((id) => selected.includes(id))}
            onChange={(e) => toggleIds(ids, e.target.checked)}
            label={`Select all ${g.rows.length} ${g.value} variants`}
          />
        </td>
        <td className="px-2 py-2">
          {imageButton(g.rows.length, `Image for the ${g.rows.length} ${g.value} variants`)}
        </td>
        <td className="px-2 py-2">
          <button
            type="button"
            onClick={() => setExpanded((prev) => ({ ...prev, [g.value]: !open }))}
            aria-expanded={Boolean(open)}
            className="flex items-center gap-1.5 text-left text-sm font-semibold text-slate-900"
          >
            <span aria-hidden>{open ? "▾" : "▸"}</span>
            {g.value}
          </button>
          <span className="block pl-4 text-xs text-slate-500">
            {g.rows.length} variant{g.rows.length === 1 ? "" : "s"}
          </span>
        </td>
        <td className="px-2 py-2">
          <div className="relative w-[130px]">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              $
            </span>
            <input
              value={groupPrices[g.value] ?? ""}
              placeholder={low === high ? low.toFixed(2) : `${low.toFixed(2)}–${high.toFixed(2)}`}
              onChange={(e) => {
                const value = e.target.value;
                setGroupPrices((prev) => ({ ...prev, [g.value]: value }));
                g.rows.forEach((v) => setPriceDraft(v, value));
              }}
              inputMode="decimal"
              aria-label={`Price for all ${g.rows.length} ${g.value} variants`}
              aria-describedby={`group-help-${g.value}`}
              className={`${cellInput} pl-6`}
            />
          </div>
          <span id={`group-help-${g.value}`} className="mt-0.5 block text-[11px] text-slate-500">
            Applies to {g.rows.length} variant{g.rows.length === 1 ? "" : "s"}
          </span>
        </td>
        <td className="px-2 py-2 text-sm text-slate-700">
          {!canSeeStock || stockState !== "ready" ? "—" : tracked.length ? total : "Not tracked"}
          <span className="block text-[11px] text-slate-500">Total, read-only</span>
        </td>
        <td className="px-2 py-2">{publishingCell()}</td>
      </tr>
    );
  };

  const totals = shown.filter((v) => stockFor(v).tracked);
  const totalAvailable = totals.reduce((n, v) => n + (stockFor(v).available || 0), 0);
  const untrackedCount = shown.length - totals.length;
  const selectClass =
    "h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10";

  return (
    <Card
      title="Variants"
      hint="Options such as pack size or volume, each with its own price, SKU and stock. Each variant keeps its own stock."
      action={
        canEdit && (
          <button
            type="button"
            onClick={() => setModal({ type: "variant", id: null })}
            className={outlineButton}
          >
            + Add variant
          </button>
        )
      }
    >
      {/* Options */}
      <div className="rounded-xl border border-slate-200">
        {options.length ? (
          options.map((o) => (
            <div
              key={o.name}
              className="flex items-start gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0"
            >
              <span
                aria-hidden="true"
                className="mt-1 flex h-5 w-4 shrink-0 cursor-grab flex-col flex-wrap items-center justify-center gap-[3px] text-slate-400"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className="h-[3px] w-[3px] rounded-full bg-slate-400" />
                ))}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{o.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {o.values.map((value) => (
                    <span
                      key={value}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm text-slate-800"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setModal({ type: "options" })}
                  className="shrink-0 text-sm font-semibold text-charcoal-navy hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="px-4 py-3 text-sm text-slate-500">
            No options yet. Add one, such as Pack size (Single, 4-pack, Case) or Volume (375ML,
            700ML).
          </p>
        )}
        {canEdit && (
          <div className="flex flex-wrap gap-3 border-t border-slate-200 px-4 py-2.5">
            {options.length < MAX_PRODUCT_OPTIONS ? (
              <OptionPicker
                label={options.length ? "Add another option" : "Add options like size or colour"}
                usedNames={options.map((o) => o.name)}
                onPick={(name) => setModal({ type: "options", add: name })}
              />
            ) : (
              <p className="text-sm text-slate-500">
                A product can have up to {MAX_PRODUCT_OPTIONS} options. Edit or remove one to add
                another.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {options.length > 1 ? (
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            aria-label="Group variants by"
            className={selectClass}
          >
            <option value="">No grouping</option>
            {options.map((o) => (
              <option key={o.name} value={o.name}>
                Group by {o.name}
              </option>
            ))}
          </select>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setToolbarOpen((v) => !v)}
          aria-expanded={toolbarOpen}
          aria-label="Search and filter variants"
          title="Search and filter"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="M17 17l-4-4" />
          </svg>
        </button>
      </div>
      {toolbarOpen && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, option value or SKU"
            aria-label="Search variants"
            className={`${selectClass} min-w-48 flex-1`}
          />
          {options.map((o) => (
            <select
              key={o.name}
              value={optionFilters[o.name] || ""}
              onChange={(e) => setOptionFilters((prev) => ({ ...prev, [o.name]: e.target.value }))}
              aria-label={`Filter by ${o.name}`}
              className={selectClass}
            >
              <option value="">Any {o.name}</option>
              {o.values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          ))}
          {canSeeStock && (
            <>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                aria-label="Location for stock"
                className={selectClass}
              >
                <option value="all">All locations</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                aria-label="Filter by stock status"
                className={selectClass}
              >
                <option value="">Any stock status</option>
                {STOCK_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}
      {activeFilters.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
            >
              {f.label}
              <button
                type="button"
                onClick={f.clear}
                aria-label={`Remove filter ${f.label}`}
                className="text-slate-500 hover:text-slate-900"
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-charcoal-navy hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
      {canSeeStock && location === "all" && canSetStock && canEdit && (
        <p className="mt-2 text-xs text-slate-500">Choose a location to edit stock in the table.</p>
      )}
      {stockState === "error" && <p className="mt-2 text-xs text-red-600">{stockError}</p>}

      {/* Selection bar */}
      {selected.length > 0 && canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white">
          <span className="font-semibold">{selected.length} selected</span>
          <button
            type="button"
            onClick={() => setModal({ type: "bulk" })}
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20"
          >
            Bulk edit
          </button>
          <button
            type="button"
            disabled
            title={`Per-variant publishing: ${notYet.toLowerCase()}`}
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold opacity-50"
          >
            Manage publishing ({notYet})
          </button>
          <button
            type="button"
            onClick={() => setModal({ type: "delete" })}
            className="rounded-full bg-red-500/80 px-3 py-1 text-xs font-semibold hover:bg-red-500"
          >
            Delete variants
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="ml-auto text-xs font-semibold text-white/80 hover:text-white"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
            <tr>
              <th className="py-2 pl-4 pr-2">
                <TriCheckbox
                  checked={allShownSelected}
                  indeterminate={someShownSelected}
                  onChange={(e) => toggleIds(shownIds, e.target.checked)}
                  label={`Select all ${shown.length} shown variants`}
                />
              </th>
              <th className="px-2 py-2">Image</th>
              <th className="px-2 py-2">Variant</th>
              <th className="px-2 py-2">Price (AUD)</th>
              <th className="px-2 py-2">
                Available{location === "all" ? "" : ` at ${locationName}`}
              </th>
              <th className="px-2 py-2">Publishing</th>
            </tr>
          </thead>
          <tbody>
            {groups
              ? groups.flatMap((g) => [
                  groupRow(g),
                  ...(expanded[g.value] ? g.rows.map((v) => row(v, true)) : []),
                ])
              : shown.map((v) => row(v, false))}
          </tbody>
        </table>
        {!variants.length && (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            This product has no variants.
          </p>
        )}
        {variants.length > 0 && !shown.length && (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            No variants match these filters.{" "}
            <button
              type="button"
              onClick={clearFilters}
              className="font-semibold text-charcoal-navy hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Unsaved inline edits */}
      {draftCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
          <span className="font-medium text-amber-900">
            ● {draftCount} unsaved change{draftCount === 1 ? "" : "s"} in the table
          </span>
          <button
            type="button"
            onClick={discardDrafts}
            disabled={saving}
            className={`${ghostButton} ml-auto h-8`}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={saveDrafts}
            disabled={saving || draftProblems.length > 0}
            className={`${primaryButton} h-8`}
          >
            {saving ? "Saving..." : "Save table changes"}
          </button>
          {draftProblems.length > 0 && (
            <ul role="alert" className="w-full list-disc pl-5 text-xs text-red-600">
              {draftProblems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className={`mt-3 rounded-xl border px-3 py-2 text-sm ${notice.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {notice.text}
          {notice.failed && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {notice.failed.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Footer */}
      {canSeeStock && (
        <p className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-700">
          {stockState === "ready" ? (
            <>
              Total inventory at {locationName}:{" "}
              <span className="font-semibold">{totalAvailable} available</span>{" "}
              <span className="text-xs text-slate-500">
                (
                {shown.length === variants.length
                  ? "all variants"
                  : `${shown.length} filtered variants`}
                {untrackedCount ? `; ${untrackedCount} not tracked` : ""}. Saved stock only.)
              </span>
            </>
          ) : stockState === "loading" ? (
            "Loading stock..."
          ) : (
            "Total inventory: Unavailable"
          )}
        </p>
      )}

      {modal?.type === "options" && (
        <OptionsEditor
          productId={productId}
          options={options}
          variants={variants}
          startWithNew={modal.add ?? null}
          onClose={() => setModal(null)}
          onApplied={async () => {
            setModal(null);
            await refresh({ stock: true });
            setNotice({ kind: "success", text: "Options and variants saved." });
          }}
        />
      )}
      {modal?.type === "variant" && (
        <VariantEditor
          productId={productId}
          variant={variants.find((v) => v.id === modal.id) || null}
          options={options}
          variants={variants}
          locations={locations}
          items={items}
          canSeeStock={canSeeStock}
          canSetStock={canSetStock}
          onClose={() => setModal(null)}
          onSaved={async ({ keepOpen }) => {
            if (!keepOpen) setModal(null);
            await refresh({ stock: true });
            if (!keepOpen)
              setNotice({ kind: "success", text: modal.id ? "Variant saved." : "Variant added." });
          }}
        />
      )}
      {modal?.type === "bulk" && (
        <BulkEditor
          rows={selectedVariants}
          options={options}
          locations={locations}
          location={location}
          items={items}
          canSetStock={canSetStock && canSeeStock}
          productTitle={productTitle}
          productImage={productImage}
          onClose={() => setModal(null)}
          onSaved={async ({ stock, closing, count }) => {
            await refresh({ stock });
            if (closing) {
              setModal(null);
              setNotice({
                kind: "success",
                text: `Saved ${count} variant${count === 1 ? "" : "s"}.`,
              });
            }
          }}
        />
      )}
      {modal?.type === "delete" && (
        <Modal
          title={`Delete ${selectedVariants.length} variant${selectedVariants.length === 1 ? "" : "s"}?`}
          onClose={() => !modal.busy && setModal(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={modal.busy}
                className={ghostButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                disabled={modal.busy || selectedVariants.length >= variants.length}
                className="h-9 rounded-full bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {modal.busy ? "Deleting..." : `Delete ${selectedVariants.length}`}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-700">
            These variants will be deleted. This can't be undone:
          </p>
          <ul className="mt-2 max-h-48 list-disc overflow-y-auto pl-5 text-sm text-slate-800">
            {selectedVariants.map((v) => (
              <li key={v.id}>
                {variantName(v, options)}{" "}
                {v.sku && <span className="text-xs text-slate-500">({v.sku})</span>}
              </li>
            ))}
          </ul>
          {selectedVariants.length >= variants.length && (
            <p className="mt-2 text-sm text-red-600">
              A product needs at least one variant. Leave one unselected.
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Variants used by orders or with stock records can't be deleted; those are reported back.
          </p>
        </Modal>
      )}
      {modal?.type === "image" && (
        <Modal
          title="Variant image"
          onClose={() => setModal(null)}
          footer={
            <button type="button" onClick={() => setModal(null)} className={ghostButton}>
              Close
            </button>
          }
        >
          <p className="text-sm text-slate-700">
            Variant images are not available yet.{" "}
            {modal.count > 1 && `This would apply to ${modal.count} variants. `}
            Product images are managed in Media above.
          </p>
        </Modal>
      )}
    </Card>
  );
}

/* ---------- page ---------- */

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "-");

// The "Add product" page
export default function AdminAddProduct() {
  return <ProductForm />;
}

// One form for adding a product and for editing one (`productId` set)
export function ProductForm({ productId }) {
  const fieldLabels = useFieldLabels();
  const navigate = useNavigate();
  const editing = Boolean(productId);
  const session = useSession();
  const activeStore = getActiveStore(session);

  // What the user's roles allow (the backend checks each of these too)
  const canEdit = can(session, "products.manage");
  const canDelete = can(session, "products.delete");
  const canSeeStock = can(session, "inventory.view");
  const canSetStock = can(session, "inventory.manage");
  const canSeeSales = can(session, "reports.view");

  // 1 Basic info
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");

  // 2 Photos: [{ id, file, url (preview), uploadedUrl, isSaved, name, size }], in display order
  const [photos, setPhotos] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [photoErrors, setPhotoErrors] = useState([]); // [{ name, message }] from the last upload
  const [uploadingPhotoId, setUploadingPhotoId] = useState(null);
  const [brokenImages, setBrokenImages] = useState([]);
  const mainFileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);
  const [replacingPhotoId, setReplacingPhotoId] = useState(null);

  // 3 Pricing
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [showDisplayPrices, setShowDisplayPrices] = useState(false);
  const [isTaxable, setIsTaxable] = useState(true);

  // 4 Stock
  const [sku, setSku] = useState("");
  const [weight, setWeight] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");

  // 5 Organize
  const [categoryId, setCategoryId] = useState("");
  const [productType, setProductType] = useState("");
  const [vendor, setVendor] = useState("");
  const [collections, setCollections] = useState([]); // collection names
  const [tags, setTags] = useState([]);

  // 6 Visibility
  const [status, setStatus] = useState("draft");

  // 7 Sales channels (ids)
  const [channelIds, setChannelIds] = useState([]);

  // Sidebar: channel modal, the shared "+" popover, known types/vendors and recent sales
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [channelDraft, setChannelDraft] = useState([]);
  const [adding, setAdding] = useState(null); // "type" | "vendor" | "collections" | "tags"
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState("");
  const [knownTypes, setKnownTypes] = useState([]);
  const [knownVendors, setKnownVendors] = useState([]);
  const [sales, setSales] = useState(null);

  // Types and vendors already used by the store's products, for the dropdowns
  useEffect(() => {
    let cancelled = false;
    apiGet("/api/v1/catalog/products/").then((res) => {
      if (cancelled || !res.ok) return;
      setKnownTypes(uniqueText(listOf(res).map((p) => p.product_type)));
      setKnownVendors(uniqueText(listOf(res).map((p) => p.vendor)));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Net sales of this product over the last 30 days, from the Reports API
  useEffect(() => {
    if (!editing || !canSeeSales) return undefined;
    let cancelled = false;
    apiGet(`/api/v1/reports/net-sales-by-product/?product=${productId}`).then((res) => {
      if (!cancelled)
        setSales(res.ok ? res.data : { error: res.error || "Sales couldn't be loaded." });
    });
    return () => {
      cancelled = true;
    };
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 8 Page layout
  const [pageLayout, setPageLayout] = useState("default");

  // 9 Google preview
  const [editingSeo, setEditingSeo] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [extra, setExtra] = useState(emptyExtraFields); // the ten extra text fields, by key
  const [handle, setHandle] = useState(""); // URL handle: products/<handle>

  // The active store's own lists
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [storeCollections, setStoreCollections] = useState([]);
  // Automated collections fill themselves from their conditions: shown here, not picked
  const [automatedCollections, setAutomatedCollections] = useState([]);
  const [channels, setChannels] = useState([]);
  const displayedChannels = useMemo(() => {
    return TARGET_SALES_CHANNELS.map((target) => {
      const found = channels.find(
        (c) =>
          (c.type && c.type.toLowerCase() === target.type.toLowerCase()) ||
          (c.name && c.name.trim().toLowerCase() === target.name.toLowerCase())
      );
      return found ? { ...found, name: target.name } : null;
    }).filter(Boolean);
  }, [channels]);
  // Lists that failed to load: saving leaves those fields alone instead of clearing them
  const [failedLists, setFailedLists] = useState([]);

  // Edit mode: the saved product's variants, its stock per location id, and its dates
  const [variants, setVariants] = useState([]);
  // Edit mode: saved option names and value order, unsaved Variants edits, and a counter that reloads its stock
  const [productOptions, setProductOptions] = useState([]);
  const [variantsDirty, setVariantsDirty] = useState(false);
  const [stockVersion, setStockVersion] = useState(0);
  const [stockByLocation, setStockByLocation] = useState({});
  // Edit mode: the first variant's full stock levels per location id (on hand, committed...)
  const [levels, setLevels] = useState({});
  const [savedStatus, setSavedStatus] = useState("draft");
  const [dates, setDates] = useState({ createdAt: null, updatedAt: null });
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Unsaved changes: the form differs from how it was when loaded or last saved
  const [baseline, setBaseline] = useState(null);
  const [needsBaseline, setNeedsBaseline] = useState(false);

  // Put a saved product (API shape) into the form
  const fill = (p) => {
    const first = p.variants?.[0];
    setName(p.title || "");
    setAbout(p.description || "");
    setPhotos(
      [...(p.images || [])]
        .sort((a, b) => a.position - b.position)
        .map((img, i) => ({
          id: `saved-${i}-${img.url}`,
          url: img.url,
          uploadedUrl: img.url,
          isSaved: true,
          name: getFilenameFromUrl(img.url),
          size: null,
        }))
    );
    const firstValues = firstFields(first);
    setPrice(firstValues.price);
    setCompareAt(firstValues.compareAt);
    setShowDisplayPrices(firstValues.compareAt !== "");
    setIsTaxable(p.is_taxable ?? true);
    setSku(firstValues.sku);
    setWeight(firstValues.weight);
    setCategoryId(p.category_id || "");
    setProductType(p.product_type || "");
    setVendor(p.vendor || "");
    setCollections(p.collections || []);
    setTags(p.tags || []);
    setStatus(p.status || "draft");
    setSavedStatus(p.status || "draft");
    setChannelIds(p.sales_channels || []);
    setPageLayout(p.theme_template || "default");
    setSeoTitle(p.seo_title || "");
    setSeoDescription(p.seo_description || "");
    setExtra(Object.fromEntries(EXTRA_FIELDS.map((f) => [f.key, p[f.key] || ""])));
    setHandle(p.handle || slugify(p.title));
    setVariants(p.variants || []);
    setProductOptions(p.options || []);
    setDates({ createdAt: p.createdAt, updatedAt: p.updatedAt });
  };

  useEffect(() => {
    let cancelled = false;

    // Without inventory access there's no stock to show: skip those requests instead of reporting them as failed
    const noStock = { ok: true, data: [] };

    Promise.all([
      canSeeStock ? apiGet("/api/v1/inventory/locations/") : noStock,
      apiGet("/api/v1/catalog/categories/"),
      apiGet("/api/v1/catalog/collections/"),
      apiGet("/api/v1/catalog/sales-channels/"),
      editing ? apiGet(`/api/v1/catalog/products/${productId}/`) : null,
      editing && canSeeStock ? apiGet(`/api/v1/inventory/items/?product=${productId}`) : noStock,
    ]).then(([locationsRes, categoriesRes, collectionsRes, channelsRes, productRes, stockRes]) => {
      if (cancelled) return;
      const locationList = listOf(locationsRes);
      const channelList = listOf(channelsRes);

      setLocations(locationList);
      setCategories(listOf(categoriesRes));
      const storeCollectionList = listOf(collectionsRes);
      setStoreCollections(
        storeCollectionList.filter((c) => c.type !== "automated").map((c) => c.name)
      );
      setAutomatedCollections(
        storeCollectionList.filter((c) => c.type === "automated").map((c) => c.name)
      );
      setChannels(channelList);

      const lists = {
        locations: locationsRes,
        categories: categoriesRes,
        collections: collectionsRes,
        channels: channelsRes,
      };
      const failed = Object.keys(lists).filter((key) => !lists[key].ok);
      setFailedLists(failed);
      if (failed.length) {
        setError(
          `Some of your store's lists couldn't be loaded: ${lists[failed[0]].error} Reload the page to try again.`
        );
      }

      if (!editing) {
        setLocationId(locationList[0]?.id || "");
        // New products go on the online store by default
        setChannelIds(channelList.filter((c) => c.type === "online").map((c) => c.id));
        setNeedsBaseline(true);
        return;
      }

      setLoading(false);
      if (!productRes.ok) {
        setLoadError(productRes.error || "We couldn't load this product.");
        return;
      }
      fill(productRes.data);

      // Stock of the product's first variant, per location; the form opens on the first stocked location
      const firstVariant = productRes.data.variants?.[0]?.id;
      const stock = {};
      const stockLevels = {};
      listOf(stockRes)
        .filter((item) => item.variant === firstVariant)
        .forEach((item) => {
          stock[item.location] = item.available;
          stockLevels[item.location] = item;
        });
      if (!stockRes.ok) setError(`The stock couldn't be loaded: ${stockRes.error}`);
      const stockedLocation = Object.keys(stock)[0];
      setStockByLocation(stock);
      setLevels(stockLevels);
      setLocationId(stockedLocation || locationList[0]?.id || "");
      setQuantity(stockedLocation ? String(stock[stockedLocation]) : "");
      setNeedsBaseline(true);
    });

    return () => {
      cancelled = true;
    };
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => photos.forEach((p) => p.file && URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const snapshot = JSON.stringify([
    name,
    about,
    photos.map((p) => p.id),
    // Edit mode compares these with the saved first variant instead (firstDirty), so Variants saves keep them in step
    editing ? null : [price, compareAt, sku, weight],
    isTaxable,
    locationId,
    quantity,
    categoryId,
    productType,
    vendor,
    collections,
    tags,
    status,
    channelIds,
    pageLayout,
    seoTitle,
    seoDescription,
    handle,
    extra,
  ]);
  if (needsBaseline) {
    setBaseline(snapshot);
    setNeedsBaseline(false);
  }
  const savedFirst = firstFields(variants[0]);
  const firstDirty =
    editing &&
    Boolean(variants[0]) &&
    (price !== savedFirst.price ||
      compareAt !== savedFirst.compareAt ||
      sku !== savedFirst.sku ||
      weight !== savedFirst.weight);
  const dirty = (baseline !== null && snapshot !== baseline) || firstDirty || variantsDirty;

  // The Variants section saved: take its fresh variants, and refresh any first-variant field the user hasn't edited
  const variantsSaved = (fresh, options) => {
    const before = firstFields(variants[0]);
    const after = firstFields(fresh[0]);
    if (fresh[0] && variants[0] && fresh[0].id === variants[0].id) {
      if (price === before.price) setPrice(after.price);
      if (compareAt === before.compareAt) setCompareAt(after.compareAt);
      if (sku === before.sku) setSku(after.sku);
      if (weight === before.weight) setWeight(after.weight);
    }
    setVariants(fresh);
    if (options) setProductOptions(options);
  };

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const categoryRows = useMemo(() => categoryOptions(categories), [categories]);
  const statusInfo = STATUSES.find((s) => s.value === status) || STATUSES[1];

  // What a product needs before it can go Active
  const missingForActive = [
    price === "" && "A selling price",
    photos.length === 0 && "At least one main image",
  ].filter(Boolean);

  const leave = () => {
    if (!dirty || window.confirm("Leave without saving? Your changes will be lost.")) {
      navigate(PRODUCTS_URL);
    }
  };

  // Edit mode: switching location shows the stock already kept there
  const chooseLocation = (id) => {
    setLocationId(id);
    if (editing) setQuantity(id in stockByLocation ? String(stockByLocation[id]) : "");
  };

  /* photos */
  const addPhotos = (fileList) => {
    const images = [];
    const rejected = [];
    Array.from(fileList || []).forEach((file) => {
      const message = photoError(file);
      if (message) {
        let detailedMsg = message;
        if (file.size > MAX_PHOTO_SIZE) {
          detailedMsg = `File size (${formatFileSize(file.size)}) exceeds the 1MB limit. Image is too large. Maximum size is 1MB per image.`;
        } else if (!file.type || !PHOTO_TYPES.includes(file.type)) {
          detailedMsg = `Unsupported format (${file.type || file.name.split(".").pop() || "unknown"}). Please use JPG, PNG, or WEBP.`;
        }
        rejected.push({ name: file.name, message: detailedMsg });
      } else {
        images.push(file);
      }
    });

    setPhotoErrors(rejected);
    if (!images.length) return;

    setPhotos((prev) => [
      ...prev,
      ...images.map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
        isSaved: false,
        name: file.name,
        size: file.size,
      })),
    ]);
  };

  const removePhoto = (id) =>
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo?.file) URL.revokeObjectURL(photo.url);
      setBrokenImages((b) => b.filter((item) => item !== id));
      return prev.filter((p) => p.id !== id);
    });

  const replacePhoto = (id, file) => {
    if (!file) return;
    const message = photoError(file);
    if (message) {
      let detailedMsg = message;
      if (file.size > MAX_PHOTO_SIZE) {
        detailedMsg = `File size (${formatFileSize(file.size)}) exceeds the 1MB limit. Image is too large. Maximum size is 1MB per image.`;
      } else if (!file.type || !PHOTO_TYPES.includes(file.type)) {
        detailedMsg = `Unsupported format (${file.type || file.name.split(".").pop() || "unknown"}). Please use JPG, PNG, or WEBP.`;
      }
      setPhotoErrors([{ name: file.name, message: detailedMsg }]);
      return;
    }
    setPhotoErrors([]);

    setPhotos((prev) => {
      const index = prev.findIndex((p) => p.id === id);
      if (index === -1) return prev;
      const oldPhoto = prev[index];
      if (oldPhoto?.file) URL.revokeObjectURL(oldPhoto.url);
      setBrokenImages((b) => b.filter((item) => item !== id));

      const updated = [...prev];
      updated[index] = {
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
        isSaved: false,
        name: file.name,
        size: file.size,
      };
      return updated;
    });
  };

  const handleStartReplace = (id) => {
    setReplacingPhotoId(id);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = "";
      replaceFileInputRef.current.click();
    }
  };

  const handleReplaceFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && replacingPhotoId) {
      replacePhoto(replacingPhotoId, file);
    }
    setReplacingPhotoId(null);
    e.target.value = "";
  };

  const handleImageError = (id) => {
    setBrokenImages((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const makeCover = (id) =>
    setPhotos((prev) => [prev.find((p) => p.id === id), ...prev.filter((p) => p.id !== id)]);

  const isChannelChecked = (ch) => {
    if (channelIds.includes(ch.id)) return true;
    const matchingChannels = channels.filter(
      (c) =>
        (c.type && ch.type && c.type.toLowerCase() === ch.type.toLowerCase()) ||
        (c.name && ch.name && c.name.trim().toLowerCase() === ch.name.trim().toLowerCase())
    );
    return matchingChannels.some((c) => channelIds.includes(c.id));
  };

  const toggleChannel = (ch) => {
    const matchingChannels = channels.filter(
      (c) =>
        (c.type && ch.type && c.type.toLowerCase() === ch.type.toLowerCase()) ||
        (c.name && ch.name && c.name.trim().toLowerCase() === ch.name.trim().toLowerCase())
    );
    const matchingIds = matchingChannels.map((c) => c.id);
    const checked = isChannelChecked(ch);
    if (checked) {
      setChannelIds((prev) => prev.filter((id) => !matchingIds.includes(id) && id !== ch.id));
    } else {
      setChannelIds((prev) => [...prev.filter((id) => !matchingIds.includes(id)), ch.id]);
    }
  };

  const fail = (message, errors = {}) => {
    setSaving(false);
    setFieldErrors(errors);
    setError(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Upload any photos not sent yet, keeping their order; returns the urls, or null on failure
  const uploadPhotos = async () => {
    const urls = [];
    const updated = [...photos];

    for (let i = 0; i < updated.length; i += 1) {
      const photo = updated[i];
      if (!photo.uploadedUrl) {
        setUploadingPhotoId(photo.id);
        const res = await apiUpload("/api/v1/catalog/products/images/", "image", photo.file);
        if (!res.ok) {
          setUploadingPhotoId(null);
          setPhotos(updated);
          return { error: `${photo.name || photo.file.name}: ${res.error}` };
        }
        updated[i] = { ...photo, uploadedUrl: res.data.url, isSaved: true };
      }
      urls.push(updated[i].uploadedUrl);
    }

    setUploadingPhotoId(null);
    setPhotos(updated);
    return { urls };
  };

  /* save */
  const handleSave = async () => {
    const errors = {};
    if (!name.trim()) errors.title = "Give your product a name.";
    if (price !== "" && !(parseFloat(price) >= 0)) errors.price = "Enter a price of 0 or more.";
    if (compareAt !== "" && !(parseFloat(compareAt) >= 0))
      errors.compareAt = "Enter a compare-at price of 0 or more.";
    if (quantity !== "" && !(Number.isInteger(Number(quantity)) && Number(quantity) >= 0)) {
      errors.quantity = "Enter a whole number of 0 or more.";
    }
    if (quantity !== "" && !locationId) errors.location = "Choose a location for this stock.";
    // Only blocks going Active; an already Active product can still be saved
    if (status === "active" && savedStatus !== "active" && missingForActive.length) {
      errors.status = `Before making this product Active, add: ${missingForActive.join(", ").toLowerCase()}.`;
    }

    if (Object.keys(errors).length) {
      fail("Please fix the highlighted fields.", errors);
      return;
    }

    setSaving(true);
    setError("");
    setSavedMessage("");
    setFieldErrors({});

    const uploaded = await uploadPhotos();
    if (uploaded.error) {
      fail("A photo couldn't be uploaded.", { images: uploaded.error });
      return;
    }

    // Edit mode only writes stock that actually changed
    // Roles without inventory rights never send stock
    const stockChanged =
      canSetStock &&
      quantity !== "" &&
      (!editing || Number(quantity) !== stockByLocation[locationId]);

    // Sent for the active store: lib/api adds its id to every request (X-Store-Id)
    const payload = {
      title: name.trim(),
      description: about.trim(),
      images: uploaded.urls,
      location: stockChanged ? locationId || null : null,
      quantity: stockChanged ? Number(quantity) : null,
      product_type: productType.trim(),
      vendor: vendor.trim(),
      collections,
      tags,
      status,
      theme_template: pageLayout,
      seo_title: seoTitle.trim(),
      seo_description: seoDescription.trim(),
      handle: (handle || slugify(name)).trim(),
      ...Object.fromEntries(EXTRA_FIELDS.map((f) => [f.key, extra[f.key].trim()])),
    };
    payload.is_taxable = isTaxable;
    if (!failedLists.includes("categories")) payload.category_id = categoryId || null;
    if (!failedLists.includes("channels")) payload.sales_channels = channelIds;

    if (editing) {
      // The price and SKU fields belong to the first variant. They're saved on that variant alone, and the
      // product PATCH carries no variant list, so no other variant can be removed by this save
      if (firstDirty) {
        const firstRes = await apiPatch(`/api/v1/catalog/variants/${variants[0].id}/`, {
          sku: sku.trim(),
          ...(price !== "" && { price }),
          compare_at_price: compareAt === "" ? null : compareAt,
          weight: weight === "" ? "0" : weight,
        });
        if (!firstRes.ok) {
          const fe = firstRes.fieldErrors || {};
          fail(firstRes.formError || Object.values(fe)[0] || "Please fix the highlighted fields.", {
            sku: fe.sku,
            price: fe.price,
            compareAt: fe.compare_at_price,
            weight: fe.weight,
          });
          return;
        }
      }
    } else {
      payload.price = price === "" ? null : price;
      payload.compare_at_price = compareAt === "" ? null : compareAt;
      payload.sku = sku.trim();
      payload.weight = weight === "" ? "0" : weight;
    }

    // Edit mode updates this product (PATCH, scoped to the active store), never creates another
    const res = editing
      ? await apiPatch(`/api/v1/catalog/products/${productId}/`, payload)
      : await apiPost("/api/v1/catalog/products/", payload);

    if (!res.ok) {
      const firstFieldErr = Object.values(res.fieldErrors || {})[0];
      fail(
        res.formError || firstFieldErr || "Please fix the highlighted fields.",
        res.fieldErrors || {}
      );
      return;
    }

    setSaving(false);
    if (!editing) {
      navigate(PRODUCTS_URL);
      return;
    }

    fill(res.data);
    if (stockChanged) {
      // Reload the levels: the saved quantity may have created this location's first stock row
      setStockByLocation((prev) => ({ ...prev, [locationId]: Number(quantity) }));
      const stockRes = await apiGet(`/api/v1/inventory/items/?product=${productId}`);
      if (stockRes.ok) {
        const firstVariant = res.data.variants?.[0]?.id;
        const stockLevels = {};
        listOf(stockRes)
          .filter((item) => item.variant === firstVariant)
          .forEach((item) => (stockLevels[item.location] = item));
        setLevels(stockLevels);
      }
      setStockVersion((n) => n + 1);
    }
    setNeedsBaseline(true);
    setSavedMessage("Changes saved.");
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Delete "${name.trim() || "this product"}"? This can't be undone.\n\nTo hide it but keep its records, cancel and set its status to Archived instead.`
      )
    )
      return;
    setDeleting(true);
    setError("");
    setSavedMessage("");
    const res = await apiDelete(`/api/v1/catalog/products/${productId}/`);
    setDeleting(false);
    if (!res.ok) {
      setError(res.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate(PRODUCTS_URL);
  };

  // The handle follows the name until the owner edits it
  const changeName = (value) => {
    if (!handle || handle === slugify(name)) setHandle(slugify(value));
    setName(value);
  };

  const storeBrand = (activeStore?.storeName || "SIPNOW").toUpperCase();
  const storeDomain = storeBaseUrl(activeStore);
  const currentHandle = handle || slugify(name) || "product-handle";
  const shownSeoTitle = seoTitle || name || "Your product name";
  const shownSeoDescription =
    seoDescription ||
    about ||
    "Add a short description so shoppers know what makes this product special.";

  if (loading || loadError) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <AdminHeader />
        <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
          <AdminSidebar />
          <main className="flex-1 min-w-0 bg-white px-4 sm:px-6 py-10">
            {loading ? (
              <p className="text-sm text-slate-500">Loading product...</p>
            ) : (
              <>
                <p className="text-sm text-red-700">{loadError}</p>
                <Link to={PRODUCTS_URL} className="mt-3 inline-block text-sm font-medium underline">
                  Back to products
                </Link>
              </>
            )}
          </main>
        </div>
      </div>
    );
  }

  // Right sidebar. Status also shows near the top on phones (statusSection("main"))
  const statusSection = (key) => (
    <div>
      <label
        htmlFor={`status-${key}`}
        className="mb-2 block text-[15px] font-semibold text-slate-900"
      >
        Status
      </label>
      <ChevronSelect id={`status-${key}`} value={status} onChange={setStatus}>
        {STATUSES.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </ChevronSelect>
      <p className="mt-2 text-xs text-slate-500">{statusInfo.text}</p>
      {status === "active" && missingForActive.length > 0 && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
        >
          <p className="font-semibold">⚠ Before this product can be Active, add:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {missingForActive.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <FieldError message={fieldErrors.status} />
    </div>
  );

  const checkedChannels = displayedChannels.filter(isChannelChecked).length;
  const channelSummary = !displayedChannels.length
    ? "Channels not connected yet"
    : checkedChannels === displayedChannels.length
      ? "All channels"
      : checkedChannels === 0
        ? "No channels"
        : `${checkedChannels} of ${displayedChannels.length} channels`;

  const openChannels = () => {
    setChannelDraft(displayedChannels.filter(isChannelChecked).map((c) => c.id));
    setChannelsOpen(true);
  };

  // Done: apply the ticked channels. Only the channels change, never the status
  const applyChannels = () => {
    displayedChannels.forEach((ch) => {
      if (channelDraft.includes(ch.id) !== isChannelChecked(ch)) toggleChannel(ch);
    });
    setChannelsOpen(false);
  };

  const closeAdding = () => {
    setAdding(null);
    setAddError("");
  };

  // A value picked or typed in the "+" popover. Type, vendor and tags save with the product;
  // a new collection is created straight away, after the user confirms
  const addValue = async (field, raw) => {
    const value = raw.trim();
    if (!value) return;
    if (field === "type") {
      setProductType(value);
      setKnownTypes((prev) => uniqueText([...prev, value]));
    } else if (field === "vendor") {
      setVendor(value);
      setKnownVendors((prev) => uniqueText([...prev, value]));
    } else if (field === "tags") {
      if (!tags.some((t) => sameText(t, value))) setTags([...tags, value]);
    } else {
      const existing = [...storeCollections, ...automatedCollections].find((c) =>
        sameText(c, value)
      );
      if (existing) {
        if (
          !automatedCollections.includes(existing) &&
          !collections.some((c) => sameText(c, existing))
        ) {
          setCollections([...collections, existing]);
        }
      } else {
        if (
          !window.confirm(
            `Create a new collection called "${value}"? It's created now, before you save the product. Collections don't apply discounts.`
          )
        )
          return;
        setAddBusy(true);
        setAddError("");
        const res = await apiPost("/api/v1/catalog/collections/", { name: value });
        setAddBusy(false);
        if (!res.ok) {
          setAddError(res.error || "The collection couldn't be created.");
          return;
        }
        const created = res.data?.name || value;
        setStoreCollections((prev) => uniqueText([...prev, created]));
        setCollections((prev) => [...prev, created]);
      }
    }
    closeAdding();
  };

  // Label row with a "+" button that opens the shared search popover
  const addRow = (field, label, options, selected) => (
    <div className="relative mb-2 flex items-center justify-between">
      <span className="text-[15px] font-semibold text-slate-900">{label}</span>
      <CircleAddButton
        label={`Add ${label.toLowerCase()}`}
        onClick={() => (adding === field ? closeAdding() : setAdding(field))}
      />
      {adding === field && (
        <AddValuePopover
          title={label}
          options={options}
          selected={selected}
          onPick={(value) => addValue(field, value)}
          onClose={closeAdding}
          busy={addBusy}
          error={addError}
        />
      )}
    </div>
  );

  const manualCollections = collections.filter((c) => !automatedCollections.includes(c));
  const typeOptions = uniqueText([...knownTypes, productType]);
  const vendorOptions = uniqueText([...knownVendors, vendor]);
  const salesRow = sales?.rows?.[0];
  const formatMoney = (value) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: sales?.currency_code || "AUD",
    }).format(Number(value) || 0);

  const sidebar = (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <section className="hidden p-5 xl:block">{statusSection("side")}</section>

      <section className="p-5 xl:border-t xl:border-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-slate-900">Publishing</h2>
          <button
            type="button"
            onClick={openChannels}
            disabled={!displayedChannels.length}
            aria-label="Manage sales channels"
            title="Manage sales channels"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <svg
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M3 6h9M15 6h2M3 14h3M9 14h8" strokeLinecap="round" />
              <circle cx="13.5" cy="6" r="1.8" />
              <circle cx="7.5" cy="14" r="1.8" />
            </svg>
          </button>
        </div>
        {/* No issue-count badge: the backend doesn't report channel issues */}
        <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <svg
            viewBox="0 0 20 20"
            className="h-4.5 w-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <circle cx="10" cy="5" r="2.2" />
            <circle cx="5" cy="14" r="2.2" />
            <circle cx="15" cy="14" r="2.2" />
            <path d="M9 7l-3 5M11 7l3 5M7.2 14h5.6" />
          </svg>
          {channelSummary}
        </p>
        <FieldError message={fieldErrors.sales_channels} />
      </section>

      <section className="border-t border-slate-200 px-5 py-5">
        <h2 className="mb-2 text-[15px] font-semibold text-slate-900">Sales</h2>
        {!editing ? (
          <p className="text-sm text-slate-600">No recent sales of this product</p>
        ) : !canSeeSales ? (
          <p className="text-sm text-slate-500">Your role can't view sales.</p>
        ) : sales === null ? (
          <p className="text-sm text-slate-500">Loading sales...</p>
        ) : sales.error ? (
          <p className="text-sm text-red-600">{sales.error}</p>
        ) : !salesRow || !Number(salesRow.units) ? (
          <p className="text-sm text-slate-600">No recent sales of this product</p>
        ) : (
          <>
            <p className="text-sm text-slate-800">
              <span className="font-semibold">{salesRow.units}</span> units sold ·{" "}
              <span className="font-semibold">{formatMoney(salesRow.net_sales)}</span> net sales
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Last 30 days. Net sales = gross sales minus discounts.
            </p>
          </>
        )}
        {editing && canSeeSales && (
          <Link
            to="/admin/online-store/reports/net-sales-by-product"
            className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
          >
            View details
          </Link>
        )}
      </section>

      <section className="space-y-5 border-t border-slate-200 px-5 py-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          Product organization
          <span
            tabIndex={0}
            title="Type, vendor, collections and tags help staff and shoppers find and sort products. Being in a collection doesn't apply a discount."
            aria-label="Type, vendor, collections and tags help staff and shoppers find and sort products. Being in a collection doesn't apply a discount."
            className="inline-flex h-4.5 w-4.5 cursor-help items-center justify-center rounded-full border-[1.5px] border-slate-600 text-[10px] font-bold text-slate-700"
          >
            i
          </span>
        </h2>

        <div>
          <label
            htmlFor="product-category"
            className="mb-2 block text-[15px] font-semibold text-slate-900"
          >
            Category
          </label>
          <ChevronSelect id="product-category" value={categoryId} onChange={setCategoryId}>
            <option value="">{categoryRows.length ? "No category" : "No categories yet"}</option>
            {categoryRows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </ChevronSelect>
          <FieldError message={fieldErrors.category_id} />
        </div>

        <div>
          {addRow("type", "Type", typeOptions, [])}
          <ChevronSelect value={productType} onChange={setProductType} label="Type">
            <option value="">No type</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </ChevronSelect>
          <FieldError message={fieldErrors.product_type} />
        </div>

        <div>
          {addRow("vendor", "Vendor", vendorOptions, [])}
          <ChevronSelect value={vendor} onChange={setVendor} label="Vendor">
            <option value="">No vendor</option>
            {vendorOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </ChevronSelect>
          <FieldError message={fieldErrors.vendor} />
        </div>

        <div>
          {addRow("collections", "Collections", storeCollections, collections)}
          <ChipBox
            values={manualCollections}
            onRemove={(c) => setCollections(collections.filter((x) => x !== c))}
            empty="No collections"
          />
          {collections.some((c) => automatedCollections.includes(c)) && (
            <p className="mt-1.5 text-[12px] text-slate-500">
              Also in, by their conditions:{" "}
              {collections.filter((c) => automatedCollections.includes(c)).join(", ")}
            </p>
          )}
          <FieldError message={fieldErrors.collections} />
        </div>

        <div>
          {addRow("tags", "Tags", [], tags)}
          <ChipBox
            values={tags}
            onRemove={(t) => setTags(tags.filter((x) => x !== t))}
            empty="No tags"
          />
          <FieldError message={fieldErrors.tags} />
        </div>
      </section>

      {channelsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setChannelsOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setChannelsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="channels-title"
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl"
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 id="channels-title" className="text-base font-semibold text-slate-900">
                Manage sales channels
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Choosing a channel doesn't change the product's status. A Draft product stays hidden
                until it's Active.
              </p>
            </div>
            <div className="space-y-1 px-5 py-3">
              {displayedChannels.map((ch, i) => (
                <label
                  key={ch.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    autoFocus={i === 0}
                    checked={channelDraft.includes(ch.id)}
                    onChange={(e) =>
                      setChannelDraft((prev) =>
                        e.target.checked ? [...prev, ch.id] : prev.filter((id) => id !== ch.id)
                      )
                    }
                    className="h-4 w-4 accent-charcoal-navy"
                  />
                  {ch.name}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button
                type="button"
                onClick={() => setChannelsOpen(false)}
                className="h-9 rounded-full px-4 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyChannels}
                className="h-9 rounded-full px-5 text-sm font-semibold text-white"
                style={{ backgroundColor: NAVY }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />

        <main className="flex-1 min-w-0 overflow-x-clip bg-slate-50">
          {/* STICKY ACTION BAR */}
          <div className="sticky top-14 z-30 border-b border-slate-200 bg-slate-50 md:top-0">
            <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={leave}
                  aria-label="Back to products"
                  title="Back to products"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:bg-slate-100"
                >
                  <svg
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={leave}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Products
                </button>
                {dirty && (
                  <span className="hidden md:inline text-xs font-medium text-amber-700">
                    ● Unsaved changes
                  </span>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {!canEdit && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    View only
                  </span>
                )}
                {editing && canEdit && (
                  <button
                    type="button"
                    onClick={leave}
                    disabled={saving || deleting}
                    className="h-9 rounded-full px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                {editing ? (
                  canDelete && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting || saving}
                      className="h-9 rounded-full border border-red-200 px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={leave}
                    className="h-9 rounded-full px-4 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Discard
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || deleting}
                    className="h-9 rounded-full px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: NAVY }}
                  >
                    {saving ? "Saving..." : editing ? "Save changes" : "Save product"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-300 px-4 py-6 sm:px-6">
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="min-w-0 break-words text-[30px] font-semibold leading-tight tracking-tight text-slate-900">
                  {name.trim() || (editing ? "Product" : "New product")}
                </h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.badge}`}
                >
                  {statusInfo.label}
                </span>
              </div>
              {(!canEdit || !editing) && (
                <p className="mt-1 text-sm text-slate-500">
                  {!canEdit
                    ? "Your role can view this product but not change it."
                    : "Only the title is required. You can come back and fill in the rest later."}
                </p>
              )}
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {savedMessage && (
              <div
                role="status"
                className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              >
                {savedMessage}
              </div>
            )}

            {/* View-only roles: every field and button inside is disabled */}
            <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px] xl:items-start">
                <div className="min-w-0 space-y-5">
                  {/* 1 BASIC INFO */}
                  <Card>
                    <div className="space-y-4">
                      <Field label="Title" error={fieldErrors.title}>
                        <input
                          value={name}
                          onChange={(e) => changeName(e.target.value)}
                          placeholder="e.g. Zonzo Chardonnay 2023 750ml"
                          className={`${inputClass} ${withError(fieldErrors.title)}`}
                          autoFocus
                        />
                      </Field>

                      <Field
                        label="Description"
                        help={`${about.length} characters`}
                        error={fieldErrors.description}
                      >
                        <textarea
                          value={about}
                          onChange={(e) => setAbout(e.target.value)}
                          rows={6}
                          placeholder="Tell shoppers what it is, what it's made of and why they'll love it."
                          className={`${inputClass} h-auto resize-y py-2.5 leading-relaxed ${withError(fieldErrors.description)}`}
                        />
                      </Field>
                    </div>
                  </Card>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] xl:hidden">
                    {statusSection("main")}
                  </div>

                  {/* 2 MEDIA */}
                  <Card
                    title="Media"
                    hint="Add clear photos of your product. The first photo is the primary cover shoppers see."
                    action={
                      <button
                        type="button"
                        onClick={() => mainFileInputRef.current?.click()}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-navy shadow-2xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Add media
                      </button>
                    }
                  >
                    {/* Hidden file input for adding multiple images */}
                    <input
                      ref={mainFileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      disabled={saving}
                      onChange={(e) => {
                        addPhotos(e.target.files);
                        e.target.value = "";
                      }}
                    />

                    {/* Hidden file input for replacing an individual image */}
                    <input
                      ref={replaceFileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={saving}
                      onChange={handleReplaceFileChange}
                    />

                    {/* Photos Grid or Empty Drag & Drop Area */}
                    {photos.length === 0 ? (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragging(false);
                          if (!saving) addPhotos(e.dataTransfer.files);
                        }}
                        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                          dragging
                            ? "border-charcoal-navy bg-slate-100"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-50"
                        }`}
                      >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <svg
                            className="h-6 w-6 text-slate-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.7"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-charcoal-navy">
                          Upload product images
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Drag and drop images here, or browse files from your computer
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Accepted formats: JPG, PNG, WEBP (up to 1MB each)
                        </p>
                        <button
                          type="button"
                          onClick={() => mainFileInputRef.current?.click()}
                          disabled={saving}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-charcoal-navy px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1e2842] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.5"
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          Select images
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
                        {photos.map((photo, i) => {
                          const isCover = i === 0;
                          const isBroken = brokenImages.includes(photo.id);
                          const isUploading = uploadingPhotoId === photo.id;

                          return (
                            <div
                              key={photo.id}
                              className={`group relative aspect-square overflow-hidden rounded-xl border bg-slate-50 transition ${
                                isCover
                                  ? "border-charcoal-navy ring-2 ring-[#14130F]/15 col-span-2 row-span-2"
                                  : "border-slate-200 hover:border-slate-400"
                              }`}
                            >
                              {/* Image or Broken fallback */}
                              {isBroken ? (
                                <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center text-slate-400">
                                  <svg
                                    className="mb-1 h-7 w-7 text-slate-300"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="1.5"
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                  </svg>
                                  <span className="text-[11px] font-medium text-slate-600">
                                    Image unavailable
                                  </span>
                                  <span className="truncate max-w-30 text-[10px] text-slate-400">
                                    {photo.name}
                                  </span>
                                </div>
                              ) : (
                                <img
                                  src={photo.url}
                                  alt={photo.name || "Product image"}
                                  loading="lazy"
                                  onError={() => handleImageError(photo.id)}
                                  className="h-full w-full object-cover transition duration-200 group-hover:scale-102"
                                />
                              )}

                              {/* Uploading Spinner Overlay */}
                              {isUploading && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-2xs">
                                  <svg
                                    className="mb-1.5 h-6 w-6 animate-spin text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    />
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8v8H4z"
                                    />
                                  </svg>
                                  <span className="text-[11px] font-semibold">Uploading…</span>
                                </div>
                              )}

                              {/* Top Badges */}
                              <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1.5 pointer-events-none">
                                {isCover && (
                                  <span className="rounded-md bg-charcoal-navy px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                    ★ Primary
                                  </span>
                                )}
                                {photo.isSaved ? (
                                  <span className="rounded-md border border-emerald-200 bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-2xs">
                                    Saved
                                  </span>
                                ) : (
                                  <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                                    New preview
                                  </span>
                                )}
                              </div>

                              {/* Bottom info banner & action buttons */}
                              <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end bg-linear-to-t from-black/85 via-black/50 to-transparent p-2.5 text-white">
                                {/* File information */}
                                <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium leading-tight text-slate-100">
                                  <span className="truncate max-w-35" title={photo.name}>
                                    {photo.name || "image"}
                                  </span>
                                  {photo.size && (
                                    <span className="ml-1 shrink-0 text-[10px] text-slate-300">
                                      {formatFileSize(photo.size)}
                                    </span>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap items-center justify-end gap-1.5">
                                  {!isCover && (
                                    <button
                                      type="button"
                                      onClick={() => makeCover(photo.id)}
                                      disabled={saving}
                                      className="rounded-md bg-white/90 hover:bg-white px-2 py-1 text-[10px] font-semibold text-charcoal-navy shadow-sm transition disabled:opacity-50"
                                      title="Set as primary product image"
                                    >
                                      Make primary
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleStartReplace(photo.id)}
                                    disabled={saving}
                                    className="rounded-md bg-white/90 hover:bg-white px-2 py-1 text-[10px] font-semibold text-slate-800 shadow-sm transition disabled:opacity-50"
                                    title="Replace with another image"
                                  >
                                    Replace
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removePhoto(photo.id)}
                                    disabled={saving}
                                    className="rounded-md bg-red-600/90 hover:bg-red-600 px-2 py-1 text-[10px] font-semibold text-white shadow-sm transition disabled:opacity-50"
                                    title="Remove this image"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add More Drop Target inside Grid */}
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragging(true);
                          }}
                          onDragLeave={() => setDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragging(false);
                            if (!saving) addPhotos(e.dataTransfer.files);
                          }}
                          onClick={() => {
                            if (!saving) mainFileInputRef.current?.click();
                          }}
                          className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-3 text-center transition ${
                            dragging
                              ? "border-charcoal-navy bg-slate-100"
                              : "border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-slate-50"
                          } ${saving ? "pointer-events-none opacity-50" : ""}`}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/80 text-charcoal-navy">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.5"
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                          </div>
                          <span className="text-xs font-semibold text-charcoal-navy">
                            Add image
                          </span>
                          <span className="text-[10px] text-slate-400">or drop here</span>
                        </div>
                      </div>
                    )}

                    {/* Validation Error Alerts */}
                    {photoErrors.length > 0 && (
                      <div
                        role="alert"
                        className="mt-3 flex items-start justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                      >
                        <div>
                          <p className="font-semibold text-red-800">
                            {photoErrors.length === 1
                              ? "1 file could not be added:"
                              : `${photoErrors.length} files could not be added:`}
                          </p>
                          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                            {photoErrors.map((item, i) => (
                              <li key={`${item.name}-${i}`}>
                                <span className="font-medium break-all">{item.name}</span>:{" "}
                                {item.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPhotoErrors([])}
                          className="ml-3 inline-flex h-5 w-5 items-center justify-center rounded text-red-500 hover:bg-red-100 hover:text-red-700"
                          aria-label="Dismiss errors"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <FieldError message={fieldErrors.images} />
                  </Card>

                  {/* 3 PRICING */}
                  <Card title="Pricing" hint="What customers pay, in Australian dollars (AUD).">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field label="Selling price (AUD)" error={fieldErrors.price}>
                        <MoneyInput value={price} onChange={setPrice} error={fieldErrors.price} />
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDisplayPrices((v) => !v)}
                      aria-expanded={showDisplayPrices}
                      className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-charcoal-navy hover:underline"
                    >
                      Additional display prices
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className={`h-4 w-4 transition-transform ${showDisplayPrices ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      >
                        <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
                      </svg>
                    </button>
                    {showDisplayPrices && (
                      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-charcoal-navy">
                            Compare-at price
                            <span
                              title="To show a reduced price, move the product's original price into Compare-at price. Enter a lower value into Price."
                              aria-label="To show a reduced price, move the product's original price into Compare-at price. Enter a lower value into Price."
                              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-400 text-[10px] font-bold text-slate-500"
                            >
                              ?
                            </span>
                          </span>
                          <MoneyInput
                            value={compareAt}
                            onChange={setCompareAt}
                            error={fieldErrors.compareAt}
                          />
                          <FieldError message={fieldErrors.compareAt} />
                          {!fieldErrors.compareAt &&
                            compareAt !== "" &&
                            parseFloat(compareAt) >= 0 &&
                            !(parseFloat(compareAt) > (parseFloat(price) || 0)) && (
                              <span className="mt-1 block text-xs text-amber-600">
                                Compare-at price should be higher than Price to show a discount
                              </span>
                            )}
                        </div>
                      </div>
                    )}
                    <label className="mt-4 flex items-center gap-2 text-[13px] text-charcoal-navy">
                      <input
                        type="checkbox"
                        checked={isTaxable}
                        onChange={(e) => setIsTaxable(e.target.checked)}
                      />
                      Charge GST on this product
                    </label>

                    <div className="mt-5 border-t border-slate-200 pt-4">
                      <p className="text-[13px] font-semibold text-charcoal-navy">
                        Internal costs{" "}
                        <span className="font-normal text-slate-500">
                          (never shown to customers)
                        </span>
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {["Cost per item", "Profit", "Margin"].map((label) => (
                          <Field key={label} label={label}>
                            <input
                              disabled
                              placeholder="Not available yet"
                              className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                            />
                          </Field>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <VariantsSection
                    productId={editing ? productId : null}
                    productTitle={name}
                    productImage={photos[0]?.url || null}
                    options={productOptions}
                    variants={variants}
                    locations={locations}
                    canEdit={canEdit}
                    canSeeStock={canSeeStock}
                    canSetStock={canSetStock}
                    stockVersion={stockVersion}
                    channelCount={checkedChannels}
                    onSaved={variantsSaved}
                    onDirtyChange={setVariantsDirty}
                  />

                  {/* 4 STOCK */}
                  <Card
                    title="Inventory"
                    hint="Your stock codes, and how many you have at each location."
                    action={
                      canSeeStock && (
                        <Link
                          to="/admin/online-store/inventory"
                          className="inline-flex h-8 items-center rounded-full border border-charcoal-navy/20 bg-white px-3.5 text-xs font-semibold text-charcoal-navy hover:bg-charcoal-navy hover:text-white"
                        >
                          Adjust stock and history
                        </Link>
                      )
                    }
                  >
                    {variants.length > 1 && (
                      <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        This product has {variants.length} variants. The SKU, price and stock here
                        are for the first one ({variants[0].sku || "no SKU"}). Each variant keeps
                        its own stock; manage them all in Variants above.
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field label="SKU" help="Your own stock code" error={fieldErrors.sku}>
                        <input
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          placeholder="e.g. WINE-ZC-750"
                          className={`${inputClass} ${withError(fieldErrors.sku)}`}
                        />
                      </Field>
                      <Field label="Barcode" help="GTIN, EAN or UPC">
                        <input
                          disabled
                          placeholder="Not available yet"
                          className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                        />
                      </Field>
                      <Field
                        label="Weight"
                        help="Per item, in your store's weight unit. Used for shipping rates."
                        error={fieldErrors.weight}
                      >
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="0"
                          className={`${inputClass} ${withError(fieldErrors.weight)}`}
                        />
                      </Field>
                      {!canSeeStock ? (
                        <p className="text-sm text-slate-500 sm:col-span-2 sm:self-end">
                          Stock levels are managed by people with inventory access.
                        </p>
                      ) : (
                        <>
                          <div>
                            <Field
                              label="Location"
                              help={locations.length ? "Where this stock is kept" : undefined}
                              error={fieldErrors.location}
                            >
                              <select
                                value={locationId}
                                onChange={(e) => chooseLocation(e.target.value)}
                                disabled={!locations.length}
                                className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400 ${withError(fieldErrors.location)}`}
                              >
                                {locations.length ? (
                                  locations.map((l) => (
                                    <option key={l.id} value={l.id}>
                                      {l.name}
                                    </option>
                                  ))
                                ) : (
                                  <option value="">No locations yet</option>
                                )}
                              </select>
                            </Field>
                            {!locations.length && !fieldErrors.location && (
                              <span className="mt-1 block text-xs text-slate-500">
                                Add one under{" "}
                                <Link
                                  to="/admin/online-store/inventory"
                                  className="font-medium text-charcoal-navy underline"
                                >
                                  Inventory
                                </Link>
                              </span>
                            )}
                          </div>
                          <Field
                            label="Available quantity"
                            help={
                              canSetStock
                                ? "Units that can be sold now"
                                : "Your role can see stock but not change it"
                            }
                            error={fieldErrors.quantity}
                          >
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={quantity}
                              onChange={(e) => setQuantity(e.target.value)}
                              disabled={!canSetStock}
                              placeholder="0"
                              className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400 ${withError(fieldErrors.quantity)}`}
                            />
                          </Field>
                        </>
                      )}
                    </div>

                    {canSeeStock && editing && (
                      <div className="mt-5 border-t border-slate-200 pt-4">
                        {!Object.keys(levels).length ? (
                          <p className="text-sm text-slate-600">
                            <span className="mr-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                              Not tracked
                            </span>
                            This variant has no stock records yet, so it never blocks a sale. Enter
                            an available quantity and save to start tracking it.
                          </p>
                        ) : !levels[locationId] ? (
                          <p className="text-sm text-slate-600">
                            No stock is kept at this location yet.
                          </p>
                        ) : (
                          <>
                            <div className="mb-3 flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-charcoal-navy">
                                Stock at {levels[locationId].location_name}
                              </span>
                              {(() => {
                                const a = levels[locationId].available;
                                const [label, cls] =
                                  a < 0
                                    ? ["⚠ Oversold", "bg-red-100 text-red-800"]
                                    : a === 0
                                      ? ["✕ Out of stock", "bg-red-50 text-red-700"]
                                      : ["✓ In stock", "bg-emerald-100 text-emerald-800"];
                                return (
                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}
                                  >
                                    {label}
                                  </span>
                                );
                              })()}
                            </div>
                            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                              {[
                                ["On hand", "on_hand", "All physical units here"],
                                ["Available", "available", "Can be sold now"],
                                ["Committed", "committed", "Reserved for unfulfilled orders"],
                                ["Unavailable", "unavailable", "Held back or damaged"],
                                ["Incoming", "incoming", "Expected, not received yet"],
                              ].map(([label, key, help]) => (
                                <div
                                  key={key}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                  title={help}
                                >
                                  <dt className="text-[11px] font-medium text-slate-500">
                                    {label}
                                  </dt>
                                  <dd className="text-lg font-bold text-charcoal-navy">
                                    {levels[locationId][key] ?? "Unavailable"}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                            <p className="mt-2 text-xs text-slate-500">
                              On hand = Available + Committed + Unavailable. Incoming isn't counted
                              until it's received. Reorder threshold and target stock: not available
                              yet.
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </Card>

                  {/* EXTRA DETAILS */}
                  <Card
                    title="Additional details"
                    hint="Optional notes about this product. Fill in only what applies; empty fields are left out."
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {withLabels(fieldLabels).map((f) => (
                        <Field key={f.key} label={f.label} error={fieldErrors[f.key]}>
                          <textarea
                            value={extra[f.key]}
                            onChange={(e) =>
                              setExtra((prev) => ({ ...prev, [f.key]: e.target.value }))
                            }
                            rows={2}
                            className={`${inputClass} h-auto resize-y py-2.5 leading-relaxed ${withError(fieldErrors[f.key])}`}
                          />
                        </Field>
                      ))}
                    </div>
                  </Card>

                  {/* 9 GOOGLE PREVIEW */}
                  <Card
                    title="Search engine listing"
                    hint="An illustrative preview only. Search engines decide how the product actually appears."
                    action={
                      <button
                        type="button"
                        onClick={() => setEditingSeo((v) => !v)}
                        className="h-8 rounded-full border border-charcoal-navy/20 bg-white px-3.5 text-xs font-semibold text-charcoal-navy hover:bg-charcoal-navy hover:text-white"
                      >
                        {editingSeo ? "Done" : "Edit"}
                      </button>
                    }
                  >
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-800">
                        {storeBrand}
                      </p>
                      <p className="break-all text-xs text-slate-600">
                        {storeDomain} › products › {currentHandle}
                      </p>
                      <p className="mt-0.5 truncate text-lg text-[#1a0dab]">{shownSeoTitle}</p>
                      <p className="line-clamp-2 text-sm text-slate-600">{shownSeoDescription}</p>
                      {price !== "" && !isNaN(Number(price)) && (
                        <p className="mt-1 text-xs text-slate-500">
                          ${Number(price).toFixed(2)} AUD
                        </p>
                      )}
                    </div>

                    {(editingSeo ||
                      fieldErrors.seo_title ||
                      fieldErrors.seo_description ||
                      fieldErrors.handle) && (
                      <div className="mt-4 space-y-4">
                        <Field
                          label="SEO title"
                          help={`${seoTitle.length} of 70 characters`}
                          error={fieldErrors.seo_title}
                        >
                          <input
                            value={seoTitle}
                            maxLength={70}
                            onChange={(e) => setSeoTitle(e.target.value)}
                            placeholder={name}
                            className={`${inputClass} ${withError(fieldErrors.seo_title)}`}
                          />
                        </Field>
                        <Field
                          label="SEO description"
                          help={`${seoDescription.length} of 160 characters`}
                          error={fieldErrors.seo_description}
                        >
                          <textarea
                            value={seoDescription}
                            maxLength={160}
                            rows={3}
                            onChange={(e) => setSeoDescription(e.target.value)}
                            className={`${inputClass} h-auto resize-none py-2.5 ${withError(fieldErrors.seo_description)}`}
                          />
                        </Field>
                        <Field
                          label="URL handle"
                          help={`${storeDomain}/products/${currentHandle}`}
                          error={fieldErrors.handle}
                        >
                          <div
                            className={`flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3.5 transition focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-900/10 ${withError(fieldErrors.handle)}`}
                          >
                            <span className="select-none text-sm text-slate-500">products/</span>
                            <input
                              value={handle}
                              onChange={(e) => setHandle(cleanHandle(e.target.value))}
                              placeholder={slugify(name)}
                              className="w-full bg-transparent text-sm text-slate-900 outline-none"
                            />
                          </div>
                        </Field>
                      </div>
                    )}
                  </Card>
                </div>

                <aside className="min-w-0 space-y-5">
                  {sidebar}
                  <Card
                    title="Page layout"
                    hint="Choose which product page template your store uses for this product."
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Product page template" error={fieldErrors.theme_template}>
                        <select
                          value={pageLayout}
                          onChange={(e) => setPageLayout(e.target.value)}
                          className={`${inputClass} ${withError(fieldErrors.theme_template)}`}
                        >
                          {PAGE_LAYOUTS.map((layout) => (
                            <option key={layout.value} value={layout.value}>
                              {layout.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </Card>
                  {editing && (
                    <>
                      <Card title="Activity">
                        <dl className="space-y-1 text-xs text-slate-600">
                          <div className="flex justify-between gap-3">
                            <dt>Created</dt>
                            <dd>{formatDate(dates.createdAt)}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt>Last updated</dt>
                            <dd>{formatDate(dates.updatedAt)}</dd>
                          </div>
                        </dl>
                        <p className="mt-3 text-xs text-slate-500">
                          A detailed history of who changed what is not available on this page yet.
                        </p>
                      </Card>
                    </>
                  )}
                </aside>
              </div>
            </fieldset>
          </div>
        </main>
      </div>
    </div>
  );
}
