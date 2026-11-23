import { useEffect, useState } from "react";

export const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-600";

export const smallButton =
  "rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-violet-600 hover:border-orange-600 disabled:opacity-30";

export const iconButton =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-600 hover:bg-white hover:text-orange-600";

// Customizer top bar: a dark editor bar with ghost buttons and one gold call to action
const tbBase =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed";
export const tbButton = `${tbBase} rounded-lg px-3 text-white/75 hover:bg-white/10 hover:text-white`;
export const tbPrimary = `${tbBase} rounded-full bg-brand-gold-400 px-5 font-semibold text-charcoal-navy hover:bg-brand-gold-300 disabled:bg-white/10 disabled:text-white/35`;
export const tbSegment =
  "flex h-8 w-9 items-center justify-center rounded-md text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent";

export const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

// Images for banners and slides: JPG, PNG or WEBP up to 1MB (checked again by the server)
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE = 1 * 1024 * 1024;

export function defaultsOf(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, spec]) => [key, structuredClone(spec.default)])
  );
}

// The "Cart icon" and "Wishlist heart" blocks of a section with product cards: the Product card block holds them itself
export const CARD_EXTRA_BLOCKS = ["cart_icon", "wishlist_heart"];

// A ref to a block from the preview: 2 (the block) or "2.1" (its part 1) -> { block, child }
export function parseBlockRef(value) {
  if (Number.isInteger(value)) return { block: value, child: null };
  if (typeof value === "string" && /^\d+\.\d+$/.test(value)) {
    const [block, child] = value.split(".").map(Number);
    return { block, child };
  }
  return { block: null, child: null };
}

// The thin line that shows where a dragged item will land
export function DropLine({ after }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1 right-1 z-10 h-0.75 rounded-full bg-charcoal-navy shadow-[0_0_0_3px_rgba(24,24,27,0.12)]"
      style={{ top: after ? "calc(100% - 1px)" : "-2px" }}
    />
  );
}

export function DragHandle({ label, onPointerDown, onKeyDown }) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className="flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:text-orange-600 active:cursor-grabbing"
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

// ---------------------------------------------------------------------------------------------------------
// Copy styles / Paste styles
// Only an option that is a style (colours, sizes, spacing, borders, radius, fonts) is copied: never text, images,
// links, products, collections or menus, and never the "Advanced" options (anchor, CSS class, visibility).
// ---------------------------------------------------------------------------------------------------------
const STYLE_TYPES = [
  "color",
  "color_optional",
  "range",
  "number",
  "select",
  "font",
  "font_size",
  "checkbox",
];
const STYLE_GROUPS = ["style", "text", "padding", "button", "layout"];
// "Layout" mixes sizes and structure: only its sizes, spacing, alignment and shape count as style
const LAYOUT_STYLE_KEY =
  /align|width|ratio|fit|size|gap|spacing|padding|radius|height|columns|position/i;

export function isStyleField(key, spec) {
  if (!spec || !STYLE_TYPES.includes(spec.type)) return false;
  const group = spec.group || "content";
  if (!STYLE_GROUPS.includes(group)) return false;
  if (spec.type === "checkbox" && /^(show|hide)_/.test(key)) return false;
  if (group === "layout")
    return spec.type === "range" || spec.type === "number" || LAYOUT_STYLE_KEY.test(key);
  return true;
}

// The style values of one section / block / card part: { key: value }
export function pickStyles(fields, values) {
  const picked = {};
  for (const [key, spec] of Object.entries(fields || {})) {
    if (isStyleField(key, spec) && key in (values || {}))
      picked[key] = structuredClone(values[key]);
  }
  return picked;
}

// "..." button with "Copy styles" and "Paste styles"
export function StyleMenu({ name, count = 1, onCopy, onPaste, className = "" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!e.target.closest("[data-style-menu]")) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div data-style-menu className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={iconButton}
        aria-label={`Copy or paste styles: ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Copy / paste styles"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-40 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onCopy();
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-slate-100"
          >
            Copy styles
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onPaste();
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-slate-100"
          >
            {count > 1 ? `Paste styles (${count})` : "Paste styles"}
          </button>
        </div>
      )}
    </div>
  );
}
