import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { sanitizeHtml } from "@/components/RichTextEditor";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/blogPosts";
import {
  fetchPublicBlogCategories,
  fetchPublicBlogPostBySlug,
  fetchPublicBlogPosts,
} from "@/lib/platformBlogApi";

function formatArticleDate(post) {
  if (post.date) return post.date;
  if (post.published_at) {
    try {
      return new Date(post.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }
  return "";
}

function BlogCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="p-6 space-y-4">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-6 w-3/4 bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-5/6 bg-gray-200 rounded" />
        <div className="flex justify-between pt-4">
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function Blog() {
  const { slug } = useParams();

  const staticDetail = slug ? getBlogPostBySlug(slug) : null;

  // Detail view state: pre-hydrate with static article if available
  const [detailPost, setDetailPost] = useState(() => staticDetail);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailNotFound, setDetailNotFound] = useState(() => (slug ? !staticDetail : false));
  const [detailIsStatic, setDetailIsStatic] = useState(() => !!staticDetail);

  // List view state: pre-hydrate with static posts so there is no layout shift or sync test failure
  const [posts, setPosts] = useState(() => getBlogPosts());
  const [listLoading, setListLoading] = useState(false);
  const [isDynamic, setIsDynamic] = useState(false);
  const [categories, setCategories] = useState(() => [
    "All",
    ...new Set(getBlogPosts().map((p) => p.category)),
  ]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Load article detail when slug is present
  useEffect(() => {
    if (!slug) return;
    let isMounted = true;

    async function loadPost() {
      // First attempt to fetch from dynamic platform API
      const res = await fetchPublicBlogPostBySlug(slug);
      if (!isMounted) return;

      if (res.ok && res.data) {
        setDetailPost(res.data);
        setDetailIsStatic(false);
        setDetailNotFound(false);
        setDetailLoading(false);
        return;
      }

      // If dynamic API call failed or returned 404, check static archive fallback
      const fallbackPost = getBlogPostBySlug(slug);
      if (fallbackPost) {
        setDetailPost(fallbackPost);
        setDetailIsStatic(true);
        setDetailNotFound(false);
        setDetailLoading(false);
        return;
      }

      // Neither found
      setDetailNotFound(true);
      setDetailLoading(false);
    }

    loadPost();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Load articles list and categories when on /blog
  useEffect(() => {
    if (slug) return;
    let isMounted = true;

    async function loadList() {
      const [postsRes, catRes] = await Promise.all([
        fetchPublicBlogPosts({
          category: selectedCategory !== "All" ? selectedCategory : undefined,
        }),
        fetchPublicBlogCategories(),
      ]);

      if (!isMounted) return;

      if (postsRes.ok && postsRes.data) {
        const livePosts = postsRes.data.posts || postsRes.data.results || [];
        setPosts(livePosts);
        setIsDynamic(true);
      } else {
        // Fallback to static articles
        const staticList = getBlogPosts();
        const filtered =
          selectedCategory === "All"
            ? staticList
            : staticList.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());
        setPosts(filtered);
        setIsDynamic(false);
      }

      if (catRes.ok && catRes.data?.categories?.length) {
        const unique = ["All", ...new Set(catRes.data.categories)];
        setCategories(unique);
      }

      setListLoading(false);
    }

    loadList();

    return () => {
      isMounted = false;
    };
  }, [slug, selectedCategory]);

  // Render Article Detail View
  if (slug) {
    if (detailLoading) {
      return (
        <main className="min-h-screen bg-gray-50">
          <section className="bg-[#111827] px-6 py-20 text-white">
            <div className="mx-auto max-w-4xl animate-pulse space-y-4">
              <div className="h-4 w-32 bg-gray-700 rounded" />
              <div className="h-10 w-2/3 bg-gray-700 rounded" />
              <div className="h-4 w-40 bg-gray-700 rounded" />
            </div>
          </section>
          <section className="px-6 py-12">
            <div className="mx-auto max-w-4xl">
              <div className="rounded-2xl bg-white p-10 shadow-sm animate-pulse space-y-6">
                <div className="h-52 bg-gray-200 rounded-xl" />
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-5/6 bg-gray-200 rounded" />
              </div>
            </div>
          </section>
        </main>
      );
    }

    if (detailNotFound || !detailPost) {
      return (
        <main className="min-h-screen bg-gray-50">
          <section className="bg-[#111827] px-6 py-20 text-white">
            <div className="mx-auto max-w-6xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-violet-600">
                TSS Shop Blog
              </p>
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Article not found</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-300">
                The article you are looking for does not exist in our static archive.
              </p>
              <div className="mt-8">
                <Link
                  to="/blog"
                  className="inline-block rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  ← Back to TSS Shop Blog
                </Link>
              </div>
            </div>
          </section>
        </main>
      );
    }

    const postDate = formatArticleDate(detailPost);
    const readTime = detailPost.read_time || detailPost.readTime || "5 min read";

    return (
      <main className="min-h-screen bg-gray-50">
        {/* Article Detail Hero */}
        <section className="bg-[#111827] px-6 py-16 text-white md:py-20">
          <div className="mx-auto max-w-4xl">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-300 transition hover:text-white"
            >
              ← Back to all articles
            </Link>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold uppercase tracking-widest text-violet-400">
                {detailPost.category}
              </span>
              {detailIsStatic ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-800/60 bg-violet-950/70 px-2.5 py-0.5 text-xs font-medium text-violet-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  Static article
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/70 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live article
                </span>
              )}
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
              {detailPost.title}
            </h1>

            <div className="mt-4 flex items-center gap-3 text-sm text-gray-400">
              {postDate && <span>{postDate}</span>}
              {postDate && <span>•</span>}
              <span>{readTime}</span>
              {detailPost.author && (
                <>
                  <span>•</span>
                  <span>By {detailPost.author}</span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Article Detail Content */}
        <section className="px-6 py-12 md:py-16">
          <div className="mx-auto max-w-4xl">
            <article className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-10 md:p-12">
              {detailPost.featured_image ? (
                <div className="mb-8 overflow-hidden rounded-xl bg-gray-100 max-h-96">
                  <img
                    src={detailPost.featured_image}
                    alt={detailPost.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="mb-8 flex h-52 items-center justify-center rounded-xl bg-[#111827]">
                  <span className="text-6xl font-bold text-white">TSS</span>
                </div>
              )}

              {detailPost.excerpt && (
                <p className="border-l-4 border-violet-600 pl-4 text-lg font-medium leading-8 text-gray-700 italic">
                  {detailPost.excerpt}
                </p>
              )}

              {Array.isArray(detailPost.content) ? (
                <div className="mt-8 space-y-6">
                  {detailPost.content.map((section, idx) => (
                    <div key={idx} className="space-y-2">
                      <h2 className="text-xl font-bold text-gray-900">{section.heading}</h2>
                      <p className="leading-7 text-gray-600">{section.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="mt-8 space-y-4 text-gray-700 leading-7 prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(detailPost.content || "") }}
                />
              )}

              <div className="mt-12 flex items-center justify-between border-t border-gray-100 pt-6">
                <Link to="/blog" className="text-sm font-semibold text-violet-600 hover:underline">
                  ← Back to all articles
                </Link>

                {postDate && <span className="text-xs text-gray-400">Published {postDate}</span>}
              </div>
            </article>
          </div>
        </section>
      </main>
    );
  }

  // Default: Blog Posts Listing View
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-[#111827] px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-violet-600">
            TSS Shop Blog
          </p>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Ideas, insights & inspiration
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-300">
            Discover helpful insights, practical tips, and ideas to help you build and grow your
            online business.
          </p>
        </div>
      </section>

      {/* Blog posts */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-violet-600">
                Latest articles
              </p>

              <h2 className="mt-2 text-3xl font-bold text-gray-900">From the TSS Shop team</h2>
            </div>

            {isDynamic ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Live platform articles
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
                Static articles · CMS in development
              </div>
            )}
          </div>

          {/* Categories bar */}
          {categories.length > 1 && (
            <div className="mb-8 flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    selectedCategory === cat
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {listLoading ? (
            <div className="grid gap-8 md:grid-cols-3">
              <BlogCardSkeleton />
              <BlogCardSkeleton />
              <BlogCardSkeleton />
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
              <p className="text-base font-semibold text-gray-900">No blog articles found</p>
              <p className="mt-1 text-sm text-gray-500">
                Check back soon for new insights, updates, and guides.
              </p>
              {selectedCategory !== "All" && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("All")}
                  className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                >
                  View all articles
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-1 hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    {post.featured_image ? (
                      <div className="h-48 overflow-hidden bg-gray-100">
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-48 items-center justify-center bg-[#111827]">
                        <span className="text-5xl font-bold text-white">TSS</span>
                      </div>
                    )}

                    <div className="p-6">
                      <p className="text-sm font-semibold text-violet-600">{post.category}</p>

                      <h3 className="mt-3 text-xl font-bold leading-7 text-gray-900">
                        {post.title}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-gray-600 line-clamp-3">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                      <span className="text-xs text-gray-500">{formatArticleDate(post)}</span>

                      <Link
                        to={`/blog/${post.slug}`}
                        className="text-sm font-semibold text-violet-600 hover:underline"
                      >
                        Read more →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
