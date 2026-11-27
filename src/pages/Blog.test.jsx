import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Blog from "@/pages/Blog";
import * as platformBlogApi from "@/lib/platformBlogApi";

describe("Blog component", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the blog list view with 3 articles and static badge in fallback mode", () => {
    render(
      <MemoryRouter initialEntries={["/blog"]}>
        <Routes>
          <Route path="/blog" element={<Blog />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("TSS Shop Blog")).toBeTruthy();
    expect(screen.getByText("Latest articles")).toBeTruthy();
    expect(screen.getByText(/Static articles · CMS in development/i)).toBeTruthy();

    expect(screen.getByText("How to Build a Successful Online Store")).toBeTruthy();
    expect(screen.getByText("Why Your Online Store Needs a Strong Brand")).toBeTruthy();
    expect(screen.getByText("Tips for Growing Your Online Business")).toBeTruthy();

    const readMoreLinks = screen.getAllByRole("link", { name: /Read more →/i });
    expect(readMoreLinks.length).toBe(3);
    expect(readMoreLinks[0].getAttribute("href")).toBe(
      "/blog/how-to-build-a-successful-online-store"
    );
  });

  it("renders the article detail view when slug matches an existing post", () => {
    render(
      <MemoryRouter initialEntries={["/blog/how-to-build-a-successful-online-store"]}>
        <Routes>
          <Route path="/blog/:slug" element={<Blog />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "How to Build a Successful Online Store" })
    ).toBeTruthy();
    expect(screen.getByText("E-commerce")).toBeTruthy();
    expect(screen.getByText("Static article")).toBeTruthy();
    expect(screen.getByText("1. Define your niche and target audience")).toBeTruthy();

    const backLinks = screen.getAllByRole("link", { name: /Back to all articles/i });
    expect(backLinks.length).toBeGreaterThanOrEqual(1);
    expect(backLinks[0].getAttribute("href")).toBe("/blog");
  });

  it("renders article not found view when slug does not exist", () => {
    render(
      <MemoryRouter initialEntries={["/blog/unknown-post"]}>
        <Routes>
          <Route path="/blog/:slug" element={<Blog />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Article not found")).toBeTruthy();
    const backBtn = screen.getByRole("link", { name: /Back to TSS Shop Blog/i });
    expect(backBtn).toBeTruthy();
    expect(backBtn.getAttribute("href")).toBe("/blog");
  });

  it("renders live dynamic articles when platform blog API returns data", async () => {
    vi.spyOn(platformBlogApi, "fetchPublicBlogPosts").mockResolvedValue({
      ok: true,
      data: {
        count: 1,
        posts: [
          {
            id: "dyn-1",
            title: "Dynamic AI Feature Release",
            slug: "dynamic-ai-feature-release",
            category: "Product Updates",
            excerpt: "Explore the newest platform features available today.",
            author: "Engineering Team",
            read_time: "4 min read",
            published_at: "2026-11-27T10:00:00Z",
          },
        ],
      },
    });
    vi.spyOn(platformBlogApi, "fetchPublicBlogCategories").mockResolvedValue({
      ok: true,
      data: { categories: ["Product Updates"] },
    });

    render(
      <MemoryRouter initialEntries={["/blog"]}>
        <Routes>
          <Route path="/blog" element={<Blog />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Dynamic AI Feature Release")).toBeTruthy();
    });

    expect(screen.getByText(/Live platform articles/i)).toBeTruthy();
    expect(screen.getByText("Explore the newest platform features available today.")).toBeTruthy();
  });

  it("renders dynamic article detail view with rich content", async () => {
    vi.spyOn(platformBlogApi, "fetchPublicBlogPostBySlug").mockResolvedValue({
      ok: true,
      data: {
        id: "dyn-2",
        title: "Scaling Modern Stores",
        slug: "scaling-modern-stores",
        category: "Architecture",
        excerpt: "Deep dive into multi-store infrastructure.",
        content: "<p>This is dynamic HTML content rendered securely.</p>",
        author: "Platform Lead",
        read_time: "7 min read",
        published_at: "2026-11-27T10:00:00Z",
      },
    });

    render(
      <MemoryRouter initialEntries={["/blog/scaling-modern-stores"]}>
        <Routes>
          <Route path="/blog/:slug" element={<Blog />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Scaling Modern Stores" })).toBeTruthy();
    });

    expect(screen.getByText("Live article")).toBeTruthy();
    expect(screen.getByText("By Platform Lead")).toBeTruthy();
    expect(screen.getByText("This is dynamic HTML content rendered securely.")).toBeTruthy();
  });
});
