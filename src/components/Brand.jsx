// TSS Shop brand: the "T." lettermark and the TSS Shop wordmark. Styles live in index.css (.tss-mark, .tss-wordmark).
//
// tone="ink"   ink tile, white T: for cream and white grounds
// tone="paper" cream tile, ink T: for the dark sidebar and dark footer
// The brass full stop is the constant: it is the one brand accent in every lockup.

export function BrandMark({ size = 28, tone = "ink", className = "" }) {
  const tile = tone === "paper" ? "var(--brand-paper)" : "var(--brand-navy)";
  const glyph = tone === "paper" ? "var(--brand-navy)" : "#ffffff";
  return (
    <svg
      className={`tss-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="8" fill={tile} />
      <rect x="7.5" y="8.5" width="15" height="3.4" rx="0.6" fill={glyph} />
      <rect x="13.3" y="8.5" width="3.4" height="15" rx="0.6" fill={glyph} />
      <circle cx="22.4" cy="21.6" r="2.3" fill="var(--brand-orange)" />
    </svg>
  );
}

// serif: "Shop" in the Instrument Serif italic (marketing and auth only; the admin uses serif={false}).
export function Wordmark({
  tone = "ink",
  serif = true,
  markSize = 28,
  showMark = true,
  className = "",
  textClassName = "",
}) {
  return (
    <span
      className={`tss-wordmark ${className}`}
      data-tone={tone}
      data-serif={serif ? "true" : "false"}
    >
      {showMark && <BrandMark size={markSize} tone={tone} />}
      <span className={`tss-wordmark__text ${textClassName}`}>
        <span className="tss-wordmark__tss">TSS</span>
        <span className="tss-wordmark__shop">Shop</span>
      </span>
    </span>
  );
}
