import { describe, expect, it } from "vitest";
import {
  BLOG_CONTENT_SOURCE,
  BLOG_POSTS,
  IS_STATIC_CONTENT,
  getBlogPostBySlug,
  getBlogPosts,
} from "@/lib/blogPosts";

describe("blogPosts structured data source", () => {
  it("marks content clearly as static", () => {
    expect(BLOG_CONTENT_SOURCE).toBe("static");
    expect(IS_STATIC_CONTENT).toBe(true);
  });

  it("exports exactly 3 structured blog posts", () => {
    const posts = getBlogPosts();
    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBe(3);
  });

  it("each post has unique id and slug matching required structure", () => {
    const ids = new Set();
    const slugs = new Set();

    BLOG_POSTS.forEach((post) => {
      expect(post.id).toBeTruthy();
      expect(post.slug).toBeTruthy();
      expect(post.handle).toBe(post.slug);
      expect(post.title).toBeTruthy();
      expect(post.category).toBeTruthy();
      expect(post.date).toBeTruthy();
      expect(post.excerpt).toBeTruthy();
      expect(Array.isArray(post.content)).toBe(true);
      expect(post.content.length).toBeGreaterThan(0);

      ids.add(post.id);
      slugs.add(post.slug);
    });

    expect(ids.size).toBe(3);
    expect(slugs.size).toBe(3);
  });

  it("getBlogPostBySlug returns post by slug or handle case-insensitively", () => {
    const post = getBlogPostBySlug("how-to-build-a-successful-online-store");
    expect(post).toBeTruthy();
    expect(post.title).toBe("How to Build a Successful Online Store");

    const postUpper = getBlogPostBySlug("HOW-TO-BUILD-A-SUCCESSFUL-ONLINE-STORE");
    expect(postUpper).toBe(post);
  });

  it("getBlogPostBySlug returns null for invalid or empty slug", () => {
    expect(getBlogPostBySlug("non-existent-article")).toBeNull();
    expect(getBlogPostBySlug("")).toBeNull();
    expect(getBlogPostBySlug(null)).toBeNull();
  });
});
