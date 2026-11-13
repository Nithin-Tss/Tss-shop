import { describe, expect, it } from "vitest";
import { convertMinor, exponentOf, formatAmount, formatPrice, toMinor } from "./formatPrice";

describe("exponentOf", () => {
  it("knows zero-, two- and three-decimal currencies", () => {
    expect([exponentOf("JPY"), exponentOf("USD"), exponentOf("KWD")]).toEqual([0, 2, 3]);
  });
});

describe("toMinor", () => {
  it("is exact and rounds half up", () => {
    expect(toMinor("399.00", "INR")).toBe(39900n);
    expect(toMinor("399", "JPY")).toBe(399n);
    expect(toMinor("1.2345", "KWD")).toBe(1235n);
    expect(toMinor("0.005", "USD")).toBe(1n);
    expect(toMinor("abc", "USD")).toBeNull();
  });
});

describe("convertMinor", () => {
  it("converts INR to USD, JPY and KWD without float drift", () => {
    expect(convertMinor(39900n, "INR", "USD", "0.01128")).toBe(450n);
    expect(convertMinor(39900n, "INR", "JPY", "1.8")).toBe(718n);
    expect(convertMinor(10000n, "USD", "KWD", "0.307")).toBe(30700n);
  });
  it("adds a markup percentage", () => {
    expect(convertMinor(10000n, "USD", "EUR", "0.9", "2")).toBe(9180n);
  });
});

describe("formatPrice", () => {
  it("shows INR 399 as about $4.50 in USD, not $399", () => {
    const text = formatPrice(39900, "INR", "USD", "en-US", "0.01128");
    expect(text).toBe("$4.50");
    expect(text).not.toContain("399");
  });
  it("groups per locale", () => {
    expect(formatPrice(10000000, "INR", "INR", "en-IN")).toBe("₹1,00,000.00");
    expect(formatPrice(100000, "USD", "USD", "en-US")).toBe("$1,000.00");
  });
  it("uses the currency's own decimals", () => {
    expect(formatPrice(399, "JPY", "JPY", "ja-JP")).toMatch(/399$/);
    expect(formatPrice(1234, "KWD", "KWD", "en")).toContain("1.234");
  });
  it("falls back to the base currency when there is no rate", () => {
    expect(formatPrice(39900, "INR", "USD", "en-IN", null)).toBe("₹399.00");
  });
  it("formats API decimal strings in a currency", () => {
    expect(formatAmount("1234.5", "USD", "en-US")).toBe("$1,234.50");
    expect(formatAmount("", "USD", "en-US")).toBe("");
  });
});
