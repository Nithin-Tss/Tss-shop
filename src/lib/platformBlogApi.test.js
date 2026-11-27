import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  fetchPublicBlogCategories,
  fetchPublicBlogPostBySlug,
  fetchPublicBlogPosts,
  getAdminBlogPost,
  listAdminBlogPosts,
  publishAdminBlogPost,
  unpublishAdminBlogPost,
  updateAdminBlogPost,
} from "./platformBlogApi";

describe("platformBlogApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls listAdminBlogPosts with query parameters", async () => {
    const spy = vi.spyOn(api, "apiGet").mockResolvedValue({ ok: true, data: { results: [] } });

    await listAdminBlogPosts({
      status: "published",
      category: "Guides",
      q: "test",
      limit: 10,
      offset: 0,
    });

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/v1/platform/blog/posts/?status=published&category=Guides&q=test&limit=10&offset=0"
      )
    );
  });

  it("calls getAdminBlogPost with post id", async () => {
    const spy = vi.spyOn(api, "apiGet").mockResolvedValue({ ok: true, data: { id: "123" } });

    await getAdminBlogPost("123");
    expect(spy).toHaveBeenCalledWith("/api/v1/platform/blog/posts/123/");
  });

  it("calls createAdminBlogPost with post data", async () => {
    const spy = vi.spyOn(api, "apiPost").mockResolvedValue({ ok: true, data: { id: "123" } });

    await createAdminBlogPost({ title: "New Article" });
    expect(spy).toHaveBeenCalledWith("/api/v1/platform/blog/posts/", { title: "New Article" });
  });

  it("calls updateAdminBlogPost with patch data", async () => {
    const spy = vi.spyOn(api, "apiPatch").mockResolvedValue({ ok: true, data: { id: "123" } });

    await updateAdminBlogPost("123", { title: "Updated" });
    expect(spy).toHaveBeenCalledWith("/api/v1/platform/blog/posts/123/", { title: "Updated" });
  });

  it("calls deleteAdminBlogPost", async () => {
    const spy = vi.spyOn(api, "apiDelete").mockResolvedValue({ ok: true });

    await deleteAdminBlogPost("123");
    expect(spy).toHaveBeenCalledWith("/api/v1/platform/blog/posts/123/");
  });

  it("calls publishAdminBlogPost and unpublishAdminBlogPost", async () => {
    const spy = vi.spyOn(api, "apiPost").mockResolvedValue({ ok: true });

    await publishAdminBlogPost("123");
    expect(spy).toHaveBeenCalledWith("/api/v1/platform/blog/posts/123/publish/", {});

    await unpublishAdminBlogPost("123");
    expect(spy).toHaveBeenCalledWith("/api/v1/platform/blog/posts/123/unpublish/", {});
  });

  it("calls fetchPublicBlogPosts with query params", async () => {
    const spy = vi.spyOn(api, "apiGet").mockResolvedValue({ ok: true, data: { posts: [] } });

    await fetchPublicBlogPosts({ category: "News", q: "search" });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/blog/?category=News&q=search")
    );
  });

  it("calls fetchPublicBlogPostBySlug and fetchPublicBlogCategories", async () => {
    const spy = vi.spyOn(api, "apiGet").mockResolvedValue({ ok: true, data: {} });

    await fetchPublicBlogPostBySlug("hello-world");
    expect(spy).toHaveBeenCalledWith("/api/v1/blog/hello-world/");

    await fetchPublicBlogCategories();
    expect(spy).toHaveBeenCalledWith("/api/v1/blog/categories/");
  });
});
