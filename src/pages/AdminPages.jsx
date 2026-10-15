import { useEffect, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { RichTextEditor } from "@/pages/AdminAddCollection";
import { deleteStorePage, listStorePages, saveStorePage } from "@/lib/themeApi";
import { announceThemeChange } from "@/lib/themeSync";

// ---------------------------------------------------------------- pages
// /admin/online-store/pages: write, show/hide and delete the store's pages (About us, Shipping policy, ...).
// Visible pages appear at /pages/<handle>; the theme's Page template (templates/page.liquid) shows them.

const EMPTY_PAGE = {
  title: "",
  handle: "",
  body: "",
  status: "visible",
  seo_title: "",
  seo_description: "",
};

const fieldClass =
  "w-full rounded-lg border border-[#DDD6FE] bg-white px-3 py-2 text-sm text-[#0B1020] outline-none focus:border-[#0B1020]";
const fieldLabel = "mb-1 block text-[13px] font-medium text-[#4A5160]";

const pageDate = (value) => (value ? new Date(value).toLocaleDateString() : "");

export default function AdminPages() {
  const [pages, setPages] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // null: the list; {}: a new page; a page: editing it
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PAGE);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listStorePages()
      .then(setPages)
      .catch((e) => setError(e.message));
  }, []);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  function open(page) {
    setEditing(page);
    setError("");
    setNotice("");
    setForm(page.id ? { ...EMPTY_PAGE, ...page } : EMPTY_PAGE);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = await saveStorePage(editing.id, form);
      setPages((list) => [saved, ...(list || []).filter((p) => p.id !== saved.id)]);
      setEditing(saved);
      setForm({ ...EMPTY_PAGE, ...saved });
      setNotice(
        saved.status === "visible" ? "Saved. The page is live on your store." : "Saved as hidden."
      );
      // An open Customize editor shows the page in its preview
      announceThemeChange("pages");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${editing.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteStorePage(editing.id);
      setPages((list) => list.filter((p) => p.id !== editing.id));
      setEditing(null);
      setNotice("Page deleted.");
      announceThemeChange("pages");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#0B1020]">
      <AdminHeader />
      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />
        <main className="flex-1 overflow-hidden bg-[#F5F3FF] px-6 py-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#0B1020]">
              <PageIcon name="pages" />
              {editing ? (editing.id ? "Edit page" : "Add page") : "Pages"}
            </h1>
            <div className="flex items-center gap-2">
              {editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg bg-[#E9EDF2] px-4 py-2 text-sm font-medium hover:bg-[#DDE3EA]"
                >
                  Back to pages
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => open({})}
                  className="rounded-lg bg-[#0B1020] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1C2347]"
                >
                  Add page
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
              {pages === null ? (
                <p className="px-6 py-10 text-center text-sm text-[#4C4F7A]">
                  {error ? "" : "Loading..."}
                </p>
              ) : pages.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <h2 className="text-xl font-semibold">Add your first page</h2>
                  <p className="mt-3 text-sm text-[#4C4F7A]">
                    Write pages like About us or Shipping policy and show them on your store.
                  </p>
                  <button
                    type="button"
                    onClick={() => open({})}
                    className="mt-5 rounded-lg bg-[#0B1020] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1C2347]"
                  >
                    Add page
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#E4DEFB] text-[13px] text-[#4C4F7A]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Visibility</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">Address</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">Last updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((page) => (
                      <tr
                        key={page.id}
                        onClick={() => open(page)}
                        className="cursor-pointer border-b border-[#EEF1F5] last:border-0 hover:bg-[#F5F3FF]"
                      >
                        <td className="px-4 py-3 font-medium">{page.title}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${page.status === "visible" ? "bg-green-100 text-green-800" : "bg-[#E9EDF2] text-[#4A5160]"}`}
                          >
                            {page.status === "visible" ? "Visible" : "Hidden"}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-[#4C4F7A] sm:table-cell">
                          /pages/{page.handle}
                        </td>
                        <td className="hidden px-4 py-3 text-[#4C4F7A] sm:table-cell">
                          {pageDate(page.updatedAt)}
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
                    placeholder="e.g. Contact, FAQs, About us"
                    required
                    maxLength={255}
                  />
                </label>
                <div>
                  <span className={fieldLabel}>Content</span>
                  <RichTextEditor
                    id="page-body"
                    value={form.body}
                    onChange={set("body")}
                    placeholder="Write your page..."
                  />
                </div>

                <div className="grid gap-3 rounded-xl border border-[#E4DEFB] p-4">
                  <h2 className="text-sm font-semibold">Search engine listing</h2>
                  <p className="text-xs text-[#4C4F7A]">
                    {form.seo_title || form.title || "Page title"} -{" "}
                    <span className="text-[#3B3F8F]">/pages/{form.handle || "..."}</span>
                  </p>
                  <label>
                    <span className={fieldLabel}>Page title</span>
                    <input
                      className={fieldClass}
                      value={form.seo_title}
                      onChange={(e) => set("seo_title")(e.target.value)}
                      placeholder="Uses the page title when empty"
                      maxLength={255}
                    />
                  </label>
                  <label>
                    <span className={fieldLabel}>Meta description</span>
                    <textarea
                      className={fieldClass}
                      rows={3}
                      maxLength={1000}
                      value={form.seo_description}
                      onChange={(e) => set("seo_description")(e.target.value)}
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
                      Address on your store: /pages/{form.handle || "..."}
                    </span>
                  </label>
                </div>
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
                      <option value="visible">Visible</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-[#0B1020] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1C2347] disabled:opacity-50"
                  >
                    {busy ? "Saving..." : "Save"}
                  </button>
                  {editing.id && editing.status === "visible" && (
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
                      Delete page
                    </button>
                  )}
                </section>

                <section className="grid gap-2 rounded-2xl border border-[#E4DEFB] bg-white p-5 shadow-sm">
                  <span className={fieldLabel}>Theme template</span>
                  <p className="text-xs text-[#4C4F7A]">
                    Pages use the Page template. Change its layout in Customize (Page), or edit
                    templates/page.liquid and sections/main-page.liquid in the code editor.
                  </p>
                </section>
              </aside>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
