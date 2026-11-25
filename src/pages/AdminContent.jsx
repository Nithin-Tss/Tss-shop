import { useEffect, useRef, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { RichTextEditor } from "@/pages/AdminAddCollection";
import { deleteBlogPost, listBlogPosts, saveBlogPost, uploadThemeImage } from "@/lib/themeApi";
import { checkImageFile } from "@/lib/imageUpload";
import { announceThemeChange } from "@/lib/themeSync";
import ConfirmationModal from "@/components/ConfirmationModal";

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
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-orange-600";
const fieldLabel = "mb-1 block text-[13px] font-medium text-slate-600";

const postDate = (value) => (value ? new Date(value).toLocaleDateString() : "");

export function BlogPostsPage() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // null: the list; {}: a new post; a post: editing it
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_POST);
  const [busy, setBusy] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Featured image states
  const fileInputRef = useRef(null);
  const [localPreview, setLocalPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [imageError, setImageError] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  useEffect(() => {
    listBlogPosts()
      .then(setPosts)
      .catch((e) => setError(e.message));
  }, []);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  function open(post) {
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    setEditing(post);
    setError("");
    setNotice("");
    setImageError("");
    setUploading(false);
    setUploadProgress(null);
    setIsDragging(false);
    setShowDeleteModal(false);
    setDeleting(false);
    setUrlInput(post?.cover_image || "");
    setForm(post && post.id ? { ...EMPTY_POST, ...post, tags: (post.tags || []).join(", ") } : EMPTY_POST);
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

  function requestDelete() {
    setShowDeleteModal(true);
  }

  async function handleConfirmDelete() {
    if (!editing?.id || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteBlogPost(editing.id);
      setPosts((list) => list.filter((p) => p.id !== editing.id));
      setEditing(null);
      setShowDeleteModal(false);
      setNotice("Post deleted.");
      announceThemeChange("posts");
    } catch (e) {
      setError(e.message || "Failed to delete blog post.");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleImageFile(file) {
    if (!file) return;
    setImageError("");

    // Validate size and format
    const problem = await checkImageFile(file);
    if (problem) {
      setImageError(problem);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Instant local preview
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadThemeImage(file, (progress) => {
        setUploadProgress(Math.round(progress * 100));
      });

      if (result.ok && result.data?.url) {
        set("cover_image")(result.data.url);
        setUrlInput(result.data.url);
        setImageError("");
      } else {
        setImageError(result.error ? String(result.error) : "Image upload failed. Please try again.");
      }
    } catch (err) {
      setImageError(err.message || "Failed to upload image.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleApplyUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      handleRemoveImage();
      return;
    }
    if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/")) {
      setImageError("Please enter a valid image URL starting with http:// or https://");
      return;
    }
    setImageError("");
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    set("cover_image")(trimmed);
  }

  function handleRemoveImage() {
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    set("cover_image")("");
    setUrlInput("");
    setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="min-h-screen bg-white text-charcoal-navy">
      <AdminHeader />
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-hidden bg-slate-100 px-4 sm:px-6 py-6 lg:px-8">
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
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200"
                >
                  Back to posts
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => open({})}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600/90"
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
            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {posts === null ? (
                <p className="px-6 py-10 text-center text-sm text-slate-600">
                  {error ? "" : "Loading..."}
                </p>
              ) : posts.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <h2 className="text-xl font-semibold">No blog posts yet</h2>
                  <p className="mt-3 text-sm text-slate-600">
                    Published posts appear on your store's blog.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-[13px] text-slate-600">
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
                          className="cursor-pointer border-b border-[rgba(24,24,27,0.06)] last:border-0 hover:bg-slate-100"
                        >
                          <td className="px-4 py-3 font-medium">{post.title}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${post.status === "published" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}
                            >
                              {post.status === "published" ? "Published" : "Draft"}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                            {post.author}
                          </td>
                          <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                            {postDate(post.published_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {editing && (
            <form
              onSubmit={save}
              className="mt-5 grid w-full min-w-0 max-w-full gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"
            >
              <section className="min-w-0 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                  <span className="mt-1 block text-xs text-slate-600">
                    Address on your store: /blog/{form.handle || "…"}
                  </span>
                </label>
              </section>

              <aside className="grid w-full min-w-0 max-w-full content-start gap-4 lg:w-[300px] lg:max-w-[300px]">
                <section className="min-w-0 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600/90 disabled:opacity-50"
                  >
                    {busy ? "Saving..." : "Save"}
                  </button>
                  {editing.id && editing.status === "published" && (
                    <a
                      href={editing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-center text-sm font-medium text-violet-600 hover:underline"
                    >
                      View on store
                    </a>
                  )}
                  {editing.id && (
                    <button
                      type="button"
                      onClick={requestDelete}
                      disabled={busy || deleting}
                      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      Delete post
                    </button>
                  )}
                </section>

                <section className="min-w-0 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-[13px] font-semibold text-slate-800">
                        Featured image
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Header cover for your blog post
                      </span>
                    </div>
                    {(form.cover_image || localPreview) && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Added
                      </span>
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploading || busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFile(file);
                    }}
                  />

                  {/* State 1: Image is present or previewed */}
                  {form.cover_image || localPreview ? (
                    <div className="w-full min-w-0 space-y-2.5">
                      <div className="relative flex h-[160px] w-full max-w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 shadow-xs">
                        <img
                          src={localPreview || form.cover_image}
                          alt="Blog featured cover"
                          loading="lazy"
                          className={`block h-[160px] w-full max-w-full object-contain object-center transition duration-200 ${uploading ? "scale-105 filter blur-xs" : ""
                            }`}
                          onError={() => {
                            if (!uploading) {
                              setImageError("Unable to load image from URL. Please check the link.");
                            }
                          }}
                          onLoad={() => {
                            if (imageError.startsWith("Unable to load")) {
                              setImageError("");
                            }
                          }}
                        />

                        {/* Uploading progress overlay */}
                        {uploading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/65 p-4 text-center text-white backdrop-blur-[2px]">
                            <svg
                              className="h-7 w-7 animate-spin text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            <p className="mt-2 text-xs font-semibold tracking-wide">
                              {uploadProgress !== null
                                ? `Uploading (${uploadProgress}%)`
                                : "Uploading image..."}
                            </p>
                            {uploadProgress !== null && (
                              <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-white/30">
                                <div
                                  className="h-full bg-white transition-all duration-150"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons: Replace and Remove in a 2-column grid */}
                      <div className="grid w-full min-w-0 grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading || busy}
                          className="flex min-w-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <svg
                            className="h-3.5 w-3.5 shrink-0 text-slate-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            />
                          </svg>
                          <span className="truncate">Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          disabled={uploading || busy}
                          className="flex min-w-0 items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50/70 px-2 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
                        >
                          <svg
                            className="h-3.5 w-3.5 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          <span className="truncate">Remove</span>
                        </button>
                      </div>

                      {/* Display image address & Edit URL */}
                      <div className="flex w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500">
                        <span
                          className="min-w-0 flex-1 truncate font-mono text-[10.5px]"
                          title={form.cover_image}
                        >
                          {form.cover_image || "Local preview"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newUrl = window.prompt("Edit image URL:", form.cover_image);
                            if (newUrl !== null) {
                              const trimmed = newUrl.trim();
                              set("cover_image")(trimmed);
                              setUrlInput(trimmed);
                              if (localPreview) {
                                URL.revokeObjectURL(localPreview);
                                setLocalPreview(null);
                              }
                            }
                          }}
                          className="shrink-0 font-medium text-slate-700 underline hover:text-slate-900"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* State 2: When no image is selected yet */
                    <div className="w-full min-w-0 space-y-3">
                      {/* Drag & drop upload area */}
                      <div
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleImageFile(file);
                        }}
                        className={`group flex w-full max-w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${isDragging
                          ? "border-orange-500 bg-orange-50/50"
                          : "border-slate-200 bg-slate-50/70 hover:border-slate-400 hover:bg-slate-50"
                          }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-xs transition group-hover:border-orange-200 group-hover:text-orange-600">
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-700 transition group-hover:text-orange-600">
                          Click to upload{" "}
                          <span className="font-normal text-slate-500">or drag and drop</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          PNG, JPG or WEBP (up to 1 MB)
                        </p>
                      </div>

                      {/* Divider & Paste URL Input */}
                      <div className="w-full min-w-0 pt-0.5">
                        <div className="relative mb-2 flex items-center justify-center">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200/80" />
                          </div>
                          <span className="relative bg-white px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            or paste image url
                          </span>
                        </div>

                        <div className="flex w-full min-w-0 gap-1.5">
                          <div className="relative min-w-0 flex-1">
                            <input
                              type="url"
                              value={urlInput}
                              onChange={(e) => {
                                setUrlInput(e.target.value);
                                if (imageError) setImageError("");
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleApplyUrl();
                                }
                              }}
                              placeholder="https://example.com/image.jpg"
                              className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleApplyUrl}
                            disabled={!urlInput.trim()}
                            className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-30"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inline Error Notice */}
                  {imageError && (
                    <div className="mt-1 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="flex-1 text-[11.5px] leading-snug">{imageError}</span>
                      <button
                        type="button"
                        onClick={() => setImageError("")}
                        className="ml-1 font-bold text-red-400 hover:text-red-600"
                        aria-label="Dismiss error"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </section>

                <section className="min-w-0 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete blog post?"
        itemName={editing?.title || ""}
        itemType="Blog post"
        confirmText="Delete post"
        cancelText="Cancel"
        isDestructive
        isLoading={deleting}
      />
    </div>
  );
}
