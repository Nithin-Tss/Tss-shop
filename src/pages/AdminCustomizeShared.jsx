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
