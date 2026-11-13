import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { getActiveStore, getSession } from "@/lib/auth";

// One place that turns money into text: integer minor units in, Intl.NumberFormat out.
// No floats in the arithmetic (BigInt), no hardcoded symbols, no .toFixed(2).

const exponentCache = new Map();

/** Minor-unit digits for an ISO 4217 code (JPY 0, USD 2, KWD 3), from Intl's own data. */
export function exponentOf(code) {
  const key = String(code || "").toUpperCase();
  if (!exponentCache.has(key)) {
    let digits = 2;
    try {
      digits = new Intl.NumberFormat("en", { style: "currency", currency: key }).resolvedOptions()
        .maximumFractionDigits;
    } catch {
      /* unknown code: two places */
    }
    exponentCache.set(key, digits);
  }
  return exponentCache.get(key);
}

// "12.345" -> { int: 12345n, scale: 3 }; rejects anything that is not a plain decimal
function parseDecimal(value) {
  const text = String(value ?? "").trim();
  const m = /^(-?)(\d*)(?:\.(\d+))?$/.exec(text);
  if (!m || (!m[2] && !m[3])) return null;
  const frac = m[3] || "";
  return { int: BigInt(`${m[1]}${m[2] || "0"}${frac}`), scale: frac.length };
}

function roundedDivide(numerator, denominator) {
  // half away from zero, like the backend's ROUND_HALF_UP
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = (2n * n + d) / (2n * d);
  return negative ? -q : q;
}

/** A major-unit amount ("399.00") as integer minor units (39900n) of `code`. */
export function toMinor(amount, code) {
  const dec = parseDecimal(amount);
  if (!dec) return null;
  const exp = BigInt(exponentOf(code));
  return roundedDivide(dec.int * 10n ** exp, 10n ** BigInt(dec.scale));
}

/**
 * Convert minor units from one currency to another. `rate` is display units per 1 base unit as a decimal
 * string (like "0.01128"); markupPercent is added on top.
 */
export function convertMinor(minor, baseCurrency, displayCurrency, rate, markupPercent = 0) {
  const r = parseDecimal(rate);
  const markup = parseDecimal(markupPercent) || { int: 0n, scale: 0 };
  if (!r) return null;
  const shift = exponentOf(displayCurrency) - exponentOf(baseCurrency);
  let numerator = BigInt(minor) * r.int * (100n * 10n ** BigInt(markup.scale) + markup.int);
  let denominator = 10n ** BigInt(r.scale) * 100n * 10n ** BigInt(markup.scale);
  if (shift >= 0) numerator *= 10n ** BigInt(shift);
  else denominator *= 10n ** BigInt(-shift);
  return roundedDivide(numerator, denominator);
}

function minorToDecimalString(minor, code) {
  const exp = exponentOf(code);
  const negative = minor < 0n;
  const digits = (negative ? -minor : minor).toString().padStart(exp + 1, "0");
  const whole = digits.slice(0, digits.length - exp);
  const frac = digits.slice(digits.length - exp);
  return `${negative ? "-" : ""}${whole}${exp ? `.${frac}` : ""}`;
}

/**
 * formatPrice(amountMinor, baseCurrency, displayCurrency, locale, rate?)
 * Converts with `rate` (when the display currency differs and a rate is known) and formats with
 * Intl.NumberFormat. Without a rate the base currency is shown, never a wrong price.
 */
export function formatPrice(
  amountMinor,
  baseCurrency,
  displayCurrency,
  locale,
  rate = null,
  markupPercent = 0
) {
  if (amountMinor === null || amountMinor === undefined || amountMinor === "") return "";
  const base = String(baseCurrency || "INR").toUpperCase();
  let code = String(displayCurrency || base).toUpperCase();
  let minor = BigInt(amountMinor);
  if (code !== base) {
    const converted = rate ? convertMinor(minor, base, code, rate, markupPercent) : null;
    if (converted === null) code = base;
    else minor = converted;
  }
  const value = minorToDecimalString(minor, code);
  try {
    // Intl formats decimal strings exactly (no float round trip)
    return new Intl.NumberFormat(locale || undefined, { style: "currency", currency: code }).format(
      value
    );
  } catch {
    return `${code} ${value}`;
  }
}

/** An amount that is already in major units of `currency` (an API decimal string), formatted for display. */
export function formatAmount(amountMajor, currency, locale) {
  const minor = toMinor(amountMajor, currency);
  return minor === null ? "" : formatPrice(minor, currency, currency, locale);
}

/** Every ISO 4217 currency the browser knows, A to Z by code: { code, name, symbol }. */
export function currencyOptions() {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "currency" });
    return Intl.supportedValuesOf("currency").map((code) => ({
      code,
      name: names.of(code) || code,
      symbol:
        new Intl.NumberFormat("en", {
          style: "currency",
          currency: code,
          currencyDisplay: "narrowSymbol",
        })
          .formatToParts(0)
          .find((part) => part.type === "currency")?.value || code,
    }));
  } catch {
    return [];
  }
}

// The admin always shows money in the store's base currency (only the storefront converts). One request per
// store per page load, shared by every component that asks.
const knownCurrency = new Map();

export function useStoreCurrency() {
  const storeId = getActiveStore(getSession())?.storeId;
  const [code, setCode] = useState(knownCurrency.get(storeId) || "INR");

  useEffect(() => {
    if (!storeId || knownCurrency.has(storeId)) return undefined;
    let cancelled = false;
    apiGet(`/api/v1/stores/${storeId}/`).then((res) => {
      const found = res?.ok && (res.data?.baseCurrency || res.data?.currency);
      if (found) knownCurrency.set(storeId, String(found).toUpperCase());
      if (!cancelled && found) setCode(String(found).toUpperCase());
    });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  return code;
}
