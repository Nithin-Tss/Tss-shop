export const inputClass =
  "h-10 w-full rounded-lg border border-[#DDD6FE] bg-white px-3 text-sm outline-none focus:border-[#0B1020]";

export const smallButton =
  "rounded-md border border-[#DDD6FE] bg-white px-2 py-1 text-xs text-[#3B3F8F] hover:border-[#0B1020] disabled:opacity-30";

export const iconButton =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#4C4F7A] hover:bg-white hover:text-[#0B1020]";

export const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

// Images for banners and slides: JPG, PNG or WEBP up to 5MB (checked again by the server)
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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
      className="pointer-events-none absolute left-1 right-1 z-10 h-[3px] rounded-full bg-[#0B1020] shadow-[0_0_0_3px_rgba(20,27,45,0.12)]"
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
      className="flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-[#A3ADBF] hover:text-[#0B1020] active:cursor-grabbing"
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
