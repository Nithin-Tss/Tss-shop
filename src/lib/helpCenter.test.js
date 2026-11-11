import { describe, expect, it } from "vitest";
import {
  ARTICLES,
  CATEGORIES,
  OPEN_PAGES,
  SUPPORT_URL,
  articlesIn,
  getArticle,
  searchArticles,
  topArticles,
} from "@/lib/helpCenter";

describe("help center content", () => {
  it("gives every article an open key that is in the path list (or none)", () => {
    for (const article of ARTICLES) {
      if (article.open === null) continue;
      expect(Object.keys(OPEN_PAGES), article.slug).toContain(article.open);
    }
  });

  it("only allows admin paths", () => {
    for (const page of Object.values(OPEN_PAGES)) {
      expect(page.path).toMatch(/^\/admin\/[a-z0-9/_-]*$/);
      expect(page.permission).toBeTruthy();
    }
  });

  it("has unique article slugs that never clash with a category slug", () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const category of CATEGORIES) expect(slugs).not.toContain(category.slug);
  });

  it("puts every article in a known category and gives it steps", () => {
    const known = CATEGORIES.map((c) => c.slug);
    for (const article of ARTICLES) {
      expect(known, article.slug).toContain(article.category);
      expect(article.steps.length, article.slug).toBeGreaterThan(0);
    }
  });

  it("lists at least 3 articles in each category, and the card shows 3", () => {
    expect(CATEGORIES.map((c) => c.title)).toEqual([
      "Online store",
      "Products",
      "Discounts",
      "Menus",
      "Pages",
    ]);
    for (const category of CATEGORIES) {
      expect(articlesIn(category.slug).length, category.slug).toBeGreaterThanOrEqual(3);
      expect(topArticles(category.slug), category.slug).toHaveLength(3);
    }
  });

  it("has no slides article", () => {
    expect(ARTICLES.some((a) => /slide/i.test(a.slug + a.title))).toBe(false);
  });

  it("keeps the renamed menu article", () => {
    expect(getArticle("create-menu")).not.toBeNull();
    expect(getArticle("menus")).toBeNull();
  });

  it("has a support address to replace", () => {
    expect(typeof SUPPORT_URL).toBe("string");
    expect(SUPPORT_URL.length).toBeGreaterThan(0);
  });
});

describe("searchArticles", () => {
  it("finds by title", () => {
    const slugs = searchArticles("announcement bar").map((a) => a.slug);
    expect(slugs).toContain("announcement-bar");
    expect(searchArticles("Delete a page").map((a) => a.slug)).toContain("delete-page");
  });

  it("finds by keyword that is not in the title", () => {
    expect(searchArticles("coupon").map((a) => a.slug)).toContain("create-discount");
    expect(searchArticles("meta description").map((a) => a.slug)).toContain("page-search-listing");
  });

  it("ignores case and extra spaces", () => {
    expect(searchArticles("  COUPON ").map((a) => a.slug)).toContain("create-discount");
  });

  it("needs every word to match", () => {
    expect(searchArticles("coupon zzzzzz")).toEqual([]);
  });

  it("returns nothing for an empty or unknown query", () => {
    expect(searchArticles("")).toEqual([]);
    expect(searchArticles("   ")).toEqual([]);
    expect(searchArticles("qwertyuiop")).toEqual([]);
  });

  it("lists title matches first", () => {
    expect(searchArticles("footer")[0].slug).toBe("footer");
  });
});
