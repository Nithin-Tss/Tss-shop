import { useEffect, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { RichTextEditor } from "@/pages/AdminAddCollection";
import { deleteBlogPost, listBlogPosts, saveBlogPost, uploadThemeImage } from "@/lib/themeApi";
import { announceThemeChange } from "@/lib/themeSync";

const lineIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export default function ContentPage() {
  return (
    <div className="min-h-screen bg-white text-charcoal-navy">
      <AdminHeader />

      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT */}
        <main className="flex-1 bg-[#F5F3FF] px-6 lg:px-8 py-6 overflow-hidden">
          {/* TITLE + ACTIONS */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-charcoal-navy">
              <PageIcon name="content" />
              Metaobjects
            </h1>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg bg-[#E9EDF2] px-4 py-2 text-sm font-medium text-charcoal-navy hover:bg-[#DDE3EA] transition"
              >
                Manage
              </button>

              <button
                type="button"
                className="rounded-lg bg-charcoal-navy px-4 py-2 text-sm font-semibold text-white hover:bg-[#1C2347] transition"
              >
                Add definition
              </button>
            </div>
          </div>

          {/* DEFINITIONS CARD */}
          <section className="mt-5 overflow-hidden rounded-2xl border border-[#E4DEFB] bg-white shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center gap-3 border-b border-[#E4DEFB] px-4 py-3">
              <button
                type="button"
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-charcoal-navy hover:bg-[#F3F0FF] transition"
              >
                Custom
                <svg {...lineIcon} className="h-4 w-4 text-[#4C4F7A]">
                  <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
                </svg>
              </button>

              <div className="flex flex-1 items-center gap-2">
                <svg {...lineIcon} className="h-4 w-4 shrink-0 text-[#4C4F7A]">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-4-4" />
                </svg>

                <input
                  type="text"
                  placeholder="Searching in metaobject definitions..."
                  className="w-full bg-transparent text-sm text-charcoal-navy outline-none placeholder:text-slate-500"
                />
              </div>

              <div className="flex shrink-0 items-center gap-1 border-l border-[#E4DEFB] pl-3">
                <button
                  type="button"
                  aria-label="Columns"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4C4F7A] hover:bg-[#F3F0FF] hover:text-charcoal-navy transition"
                >
                  <svg {...lineIcon} className="h-4.5 w-4.5">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M9 4v16M15 4v16" />
                  </svg>
                </button>

                <button
                  type="button"
                  aria-label="View"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4C4F7A] hover:bg-[#F3F0FF] hover:text-charcoal-navy transition"
                >
                  <svg {...lineIcon} className="h-4.5 w-4.5">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Empty state */}
            <div className="px-6 py-12 text-center">
              <h2 className="text-xl font-semibold text-charcoal-navy">No definitions found</h2>

              <p className="mt-3 text-sm text-[#4C4F7A]">Try changing the filters or search term</p>
            </div>
          </section>

          {/* LEARN MORE */}
          <p className="mt-8 text-center text-sm font-medium text-charcoal-navy">
            <a href="#" className="hover:underline">
              Learn more about metaobjects
            </a>
          </p>
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- blog posts
// /admin/online-store/blog-posts: write, publish and delete the store's blog posts.
// Published posts appear on /blog and at /blog/<handle>; the theme's Blog and Article pages show them.

const EMPTY_POST = {
  title: "",
  handle: "",
  excerpt: "",
  body: "",
  cover_image: "",
  author: "",
  category: "",
  tags: "",
  status: "draft",
};

const fieldClass =
  "w-full rounded-lg border border-[#DDD6FE] bg-white px-3 py-2 text-sm text-[#0B1020] outline-none focus:border-[#0B1020]";
const fieldLabel = "mb-1 block text-[13px] font-medium text-[#4A5160]";

const postDate = (value) => (value ? new Date(value).toLocaleDateString() : "");

export function BlogPostsPage() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // null: the list; {}: a new post; a post: editing it
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_POST);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listBlogPosts()
      .then(setPosts)
      .catch((e) => setError(e.message));
  }, []);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  function open(post) {
    setEditing(post);
    setError("");
    setNotice("");
    setForm(post.id ? { ...EMPTY_POST, ...post, tags: (post.tags || []).join(", ") } : EMPTY_POST);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        ...form,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      const saved = await saveBlogPost(editing.id, body);
      setPosts((list) => [saved, ...(list || []).filter((p) => p.id !== saved.id)]);
      setEditing(saved);
      setForm({ ...EMPTY_POST, ...saved, tags: saved.tags.join(", ") });
      setNotice(
        saved.status === "published"
          ? "Saved. The post is live on your store."
          : "Saved as a draft."
      );
      // An open Customize editor shows the new post in its preview
      announceThemeChange("posts");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${editing.title}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await deleteBlogPost(editing.id);
      setPosts((list) => list.filter((p) => p.id !== editing.id));
      setEditing(null);
      setNotice("Post deleted.");
      announceThemeChange("posts");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    const result = await uploadThemeImage(file);
    setBusy(false);
    if (result.ok) set("cover_image")(result.data.url);
    else setError(String(result.error));
  }

  return (
    <div className="min-h-screen bg-white text-charcoal-navy">
      <AdminHeader />
      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />
        <main className="flex-1 overflow-hidden bg-[#F5F3FF] px-6 py-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-charcoal-navy">
              <PageIcon name="blog" />
              {editing ? (editing.id ? "Edit blog post" : "Add blog post") : "Blog posts"}
            </h1>
            <div className="flex items-center gap-2">
              {editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg bg-[#E9EDF2] px-4 py-2 text-sm font-medium hover:bg-[#DDE3EA]"
                >
                  Back to posts
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => open({})}
                  className="rounded-lg bg-charcoal-navy px-4 py-2 text-sm font-semibold text-white hover:bg-[#1C2347]"
                >
                  Add blog post
                </button>
              )}
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
          )}
          {notice && (
            <p className="mt-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">{notice}</p>
          )}

          {!editing && (
            <section className="mt-5 overflow-hidden rounded-2xl border border-[#E4DEFB] bg-white shadow-sm">
              {posts === null ? (
                <p className="px-6 py-10 text-center text-sm text-[#4C4F7A]">
                  {error ? "" : "Loading..."}
                </p>
              ) : posts.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <h2 className="text-xl font-semibold">No blog posts yet</h2>
                  <p className="mt-3 text-sm text-[#4C4F7A]">
                    Published posts appear on your store's blog.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#E4DEFB] text-[13px] text-[#4C4F7A]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">Author</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">Published</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr
                        key={post.id}
                        onClick={() => open(post)}
                        className="cursor-pointer border-b border-[#EEF1F5] last:border-0 hover:bg-[#F5F3FF]"
                      >
                        <td className="px-4 py-3 font-medium">{post.title}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${post.status === "published" ? "bg-green-100 text-green-800" : "bg-[#E9EDF2] text-[#4A5160]"}`}
                          >
                            {post.status === "published" ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-[#4C4F7A] sm:table-cell">
                          {post.author}
                        </td>
                        <td className="hidden px-4 py-3 text-[#4C4F7A] sm:table-cell">
                          {postDate(post.published_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {editing && (
            <form onSubmit={save} className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <section className="grid gap-4 rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-sm">
                <label>
                  <span className={fieldLabel}>Title</span>
                  <input
                    className={fieldClass}
                    value={form.title}
                    onChange={(e) => set("title")(e.target.value)}
                    required
                    maxLength={255}
                  />
                </label>
                <div>
                  <span className={fieldLabel}>Content</span>
                  <RichTextEditor
                    id="post-body"
                    value={form.body}
                    onChange={set("body")}
                    placeholder="Write your post..."
                  />
                </div>
                <label>
                  <span className={fieldLabel}>Excerpt</span>
                  <textarea
                    className={fieldClass}
                    rows={3}
                    maxLength={1000}
                    value={form.excerpt}
                    onChange={(e) => set("excerpt")(e.target.value)}
                    placeholder="A short summary shown on the blog page"
                  />
                </label>
                <label>
                  <span className={fieldLabel}>URL handle (slug)</span>
                  <input
                    className={fieldClass}
                    value={form.handle}
                    onChange={(e) => set("handle")(e.target.value)}
                    placeholder="Made from the title when empty"
                    maxLength={255}
                  />
                  <span className="mt-1 block text-xs text-[#4C4F7A]">
                    Address on your store: /blog/{form.handle || "…"}
                  </span>
                </label>
              </section>

              <aside className="grid content-start gap-4">
                <section className="grid gap-3 rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-sm">
                  <label>
                    <span className={fieldLabel}>Visibility</span>
                    <select
                      className={fieldClass}
                      value={form.status}
                      onChange={(e) => set("status")(e.target.value)}
                    >
                      <option value="draft">Draft (hidden)</option>
                      <option value="published">Published</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-charcoal-navy px-4 py-2 text-sm font-semibold text-white hover:bg-[#1C2347] disabled:opacity-50"
                  >
                    {busy ? "Saving..." : "Save"}
                  </button>
                  {editing.id && editing.status === "published" && (
                    <a
                      href={editing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-center text-sm font-medium text-[#3B3F8F] hover:underline"
                    >
                      View on store
                    </a>
                  )}
                  {editing.id && (
                    <button
                      type="button"
                      onClick={remove}
                      disabled={busy}
                      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      Delete post
                    </button>
                  )}
                </section>

                <section className="grid gap-3 rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-sm">
                  <span className={fieldLabel}>Featured image</span>
                  {form.cover_image && (
                    <img
                      src={form.cover_image}
                      alt=""
                      loading="lazy"
                      className="aspect-3/2 w-full rounded-lg object-cover"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => upload(e.target.files[0])}
                    className="text-xs"
                  />
                  <input
                    className={fieldClass}
                    value={form.cover_image}
                    onChange={(e) => set("cover_image")(e.target.value)}
                    placeholder="or paste an image link (https://...)"
                  />
                </section>

                <section className="grid gap-3 rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-sm">
                  <label>
                    <span className={fieldLabel}>Author</span>
                    <input
                      className={fieldClass}
                      value={form.author}
                      onChange={(e) => set("author")(e.target.value)}
                      maxLength={120}
                    />
                  </label>
                  <label>
                    <span className={fieldLabel}>Category</span>
                    <input
                      className={fieldClass}
                      value={form.category}
                      onChange={(e) => set("category")(e.target.value)}
                      maxLength={120}
                    />
                  </label>
                  <label>
                    <span className={fieldLabel}>Tags</span>
                    <input
                      className={fieldClass}
                      value={form.tags}
                      onChange={(e) => set("tags")(e.target.value)}
                      placeholder="Separated by commas"
                    />
                  </label>
                </section>
              </aside>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
