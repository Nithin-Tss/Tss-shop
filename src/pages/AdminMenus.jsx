import { useEffect, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import {
  deleteMenu,
  deleteUrlRedirect,
  listMenus,
  listUrlRedirects,
  saveMenu,
  saveUrlRedirect,
} from "@/lib/themeApi";

// ---------------------------------------------------------------- AdminMenus
// Displays the Menus table matching the VENDRA admin UI, with dynamic backend
// integration for Menus, Menu Items, and URL Redirects.

export default function AdminMenus() {
  const [menus, setMenus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Edit / Create Menu mode: null (table view), or { id?, name, handle, items: [] }
  const [editingMenu, setEditingMenu] = useState(null);
  const [menuForm, setMenuForm] = useState({ name: "", handle: "", items: [] });
  const [savingMenu, setSavingMenu] = useState(false);

  // URL Redirects Modal mode: boolean
  const [showRedirectsModal, setShowRedirectsModal] = useState(false);
  const [redirects, setRedirects] = useState([]);
  const [loadingRedirects, setLoadingRedirects] = useState(false);
  const [redirectError, setRedirectError] = useState("");
  const [editingRedirect, setEditingRedirect] = useState(null); // null or { id?, path: "", target: "" }
  const [redirectForm, setRedirectForm] = useState({ path: "", target: "" });
  const [savingRedirect, setSavingRedirect] = useState(false);

  // Load menus from the backend API
  const fetchMenus = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listMenus();
      setMenus(data);
    } catch (err) {
      setError(err.message || "Failed to load menus.");
    } finally {
      setLoading(false);
    }
  };

  // Initial load: `loading` already starts true, so no synchronous setState here.
  useEffect(() => {
    let cancelled = false;
    listMenus()
      .then((data) => {
        if (!cancelled) setMenus(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load menus.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Open Create Menu form
  const handleOpenCreate = () => {
    setEditingMenu({ isNew: true });
    setMenuForm({
      name: "",
      handle: "",
      items: [
        { title: "Home", url: "/", children: [] },
        { title: "Catalog", url: "/collections/all", children: [] },
      ],
    });
    setError("");
    setNotice("");
  };

  // Open Edit Menu form
  const handleOpenEdit = (menu) => {
    setEditingMenu(menu);
    // Flatten items or deep copy
    const itemsCopy = (menu.items || []).map((it) => ({
      id: it.id,
      title: it.title || "",
      url: it.url || "",
      children: (it.children || []).map((ch) => ({
        id: ch.id,
        title: ch.title || "",
        url: ch.url || "",
      })),
    }));
    setMenuForm({
      name: menu.name || "",
      handle: menu.handle || "",
      items: itemsCopy.length ? itemsCopy : [{ title: "", url: "", children: [] }],
    });
    setError("");
    setNotice("");
  };

  // Close Menu Editor
  const handleCloseEditor = () => {
    setEditingMenu(null);
    setError("");
  };

  // Menu Form: Add Item
  const handleAddItem = (parentIdx = null) => {
    setMenuForm((prev) => {
      const newItems = [...prev.items];
      if (parentIdx === null) {
        newItems.push({ title: "", url: "", children: [] });
      } else {
        const parent = { ...newItems[parentIdx] };
        parent.children = [...(parent.children || []), { title: "", url: "" }];
        newItems[parentIdx] = parent;
      }
      return { ...prev, items: newItems };
    });
  };

  // Menu Form: Remove Item
  const handleRemoveItem = (idx, childIdx = null) => {
    setMenuForm((prev) => {
      const newItems = [...prev.items];
      if (childIdx === null) {
        newItems.splice(idx, 1);
      } else {
        const parent = { ...newItems[idx] };
        parent.children = [...parent.children];
        parent.children.splice(childIdx, 1);
        newItems[idx] = parent;
      }
      return { ...prev, items: newItems };
    });
  };

  // Menu Form: Change Item Field
  const handleChangeItem = (idx, field, value, childIdx = null) => {
    setMenuForm((prev) => {
      const newItems = [...prev.items];
      if (childIdx === null) {
        newItems[idx] = { ...newItems[idx], [field]: value };
      } else {
        const parent = { ...newItems[idx] };
        parent.children = [...parent.children];
        parent.children[childIdx] = { ...parent.children[childIdx], [field]: value };
        newItems[idx] = parent;
      }
      return { ...prev, items: newItems };
    });
  };

  // Menu Form: Move Item Up/Down
  const handleMoveItem = (idx, direction) => {
    setMenuForm((prev) => {
      const newItems = [...prev.items];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= newItems.length) return prev;
      const [moved] = newItems.splice(idx, 1);
      newItems.splice(targetIdx, 0, moved);
      return { ...prev, items: newItems };
    });
  };

  // Save Menu
  const handleSaveMenu = async (e) => {
    e.preventDefault();
    if (!menuForm.name.trim()) {
      setError("Menu name is required.");
      return;
    }
    setSavingMenu(true);
    setError("");
    try {
      const isNew = editingMenu?.isNew || !editingMenu?.id;
      const payload = {
        name: menuForm.name.trim(),
        handle: menuForm.handle.trim(),
        items: menuForm.items.filter((it) => it.title.trim()),
      };
      await saveMenu(isNew ? null : editingMenu.id, payload);
      setNotice(isNew ? "Menu created successfully." : "Menu updated successfully.");
      setEditingMenu(null);
      await fetchMenus();
    } catch (err) {
      setError(err.message || "Failed to save menu.");
    } finally {
      setSavingMenu(false);
    }
  };

  // Delete Menu
  const handleDeleteMenu = async () => {
    if (!editingMenu?.id) return;
    if (!window.confirm(`Are you sure you want to delete "${editingMenu.name}"?`)) return;
    setSavingMenu(true);
    setError("");
    try {
      await deleteMenu(editingMenu.id);
      setNotice(`Deleted menu "${editingMenu.name}".`);
      setEditingMenu(null);
      await fetchMenus();
    } catch (err) {
      setError(err.message || "Failed to delete menu.");
    } finally {
      setSavingMenu(false);
    }
  };

  // --- URL Redirects Modal Logic ---
  const handleOpenRedirects = async () => {
    setShowRedirectsModal(true);
    setEditingRedirect(null);
    setRedirectForm({ path: "", target: "" });
    setRedirectError("");
    setLoadingRedirects(true);
    try {
      const data = await listUrlRedirects();
      setRedirects(data);
    } catch (err) {
      setRedirectError(err.message || "Failed to load URL redirects.");
    } finally {
      setLoadingRedirects(false);
    }
  };

  const handleSaveRedirect = async (e) => {
    e.preventDefault();
    if (!redirectForm.path.trim() || !redirectForm.target.trim()) {
      setRedirectError("Both redirect path and destination URL are required.");
      return;
    }
    setSavingRedirect(true);
    setRedirectError("");
    try {
      const payload = {
        path: redirectForm.path.trim(),
        target: redirectForm.target.trim(),
      };
      await saveUrlRedirect(editingRedirect?.id, payload);
      setEditingRedirect(null);
      setRedirectForm({ path: "", target: "" });
      const updated = await listUrlRedirects();
      setRedirects(updated);
    } catch (err) {
      setRedirectError(err.message || "Failed to save URL redirect.");
    } finally {
      setSavingRedirect(false);
    }
  };

  const handleDeleteRedirect = async (id) => {
    if (!window.confirm("Delete this URL redirect?")) return;
    try {
      await deleteUrlRedirect(id);
      setRedirects((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setRedirectError(err.message || "Failed to delete URL redirect.");
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#0B1020]">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />

        <main className="flex-1 overflow-hidden bg-[#F5F3FF] px-6 py-6 lg:px-8">
          {/* TOP BAR / HEADING */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#0B1020]">
              <PageIcon name="menus" />
              {editingMenu
                ? editingMenu.isNew
                  ? "Create menu"
                  : `Edit ${editingMenu.name}`
                : "Menus"}
            </h1>

            {!editingMenu && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-url-redirects"
                  onClick={handleOpenRedirects}
                  className="rounded-lg bg-[#E9EDF2] px-4 py-2 text-sm font-medium text-[#0B1020] hover:bg-[#DDE3EA] transition"
                >
                  URL redirects
                </button>

                <button
                  type="button"
                  id="btn-create-menu"
                  onClick={handleOpenCreate}
                  className="rounded-lg bg-[#0B1020] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1C2347] transition"
                >
                  Create menu
                </button>
              </div>
            )}
          </div>

          {/* NOTICES & ERRORS */}
          {notice && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center justify-between">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
              >
                ✕
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-rose-700 hover:text-rose-900 font-bold ml-4"
              >
                ✕
              </button>
            </div>
          )}

          {/* MAIN CONTENT: TABLE OR EDITOR */}
          {!editingMenu ? (
            /* --- MENUS TABLE CARD --- */
            <section className="mt-5 overflow-hidden rounded-2xl border border-[#E4DEFB] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#0B1020]">
                  <thead className="border-b border-[#E4DEFB] bg-[#FAF8FF] text-xs font-medium text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold text-slate-700 w-1/4">
                        <div className="inline-flex items-center gap-1 cursor-pointer select-none">
                          <span>Menu</span>
                          <span className="text-[13px] text-slate-400">⇅</span>
                        </div>
                      </th>
                      <th className="px-5 py-3.5 font-semibold text-slate-700">Menu items</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4DEFB]">
                    {loading ? (
                      <tr>
                        <td colSpan={2} className="px-5 py-10 text-center text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                            Loading menus...
                          </div>
                        </td>
                      </tr>
                    ) : menus && menus.length > 0 ? (
                      menus.map((menu) => (
                        <tr
                          key={menu.id}
                          onClick={() => handleOpenEdit(menu)}
                          className="hover:bg-[#F8F9FA] transition-colors cursor-pointer group"
                        >
                          <td className="px-5 py-4 font-semibold text-[#0B1020] group-hover:text-violet-600">
                            {menu.name}
                          </td>
                          <td className="px-5 py-4 text-slate-600 leading-relaxed font-normal">
                            {menu.items_summary || (
                              <span className="text-slate-400 italic">No menu items</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-5 py-12 text-center text-slate-500">
                          <p className="text-base font-medium">No menus found</p>
                          <p className="mt-1 text-sm text-slate-400">
                            Create your first menu to define links for your header, footer, or
                            navigation.
                          </p>
                          <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="mt-4 inline-flex items-center rounded-lg bg-[#0B1020] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1C2347] transition"
                          >
                            Create menu
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            /* --- CREATE / EDIT MENU FORM --- */
            <form onSubmit={handleSaveMenu} className="mt-5 max-w-4xl space-y-6">
              {/* Menu Details Card */}
              <div className="rounded-2xl border border-[#E4DEFB] bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900 mb-4">Menu details</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={menuForm.name}
                      onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                      placeholder="e.g. Main menu, Footer menu"
                      className="w-full rounded-lg border border-[#DDD6FE] bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#0B1020] focus:ring-1 focus:ring-[#0B1020]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Handle{" "}
                      <span className="text-xs text-slate-400 font-normal">
                        (optional identifier)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={menuForm.handle}
                      onChange={(e) => setMenuForm({ ...menuForm, handle: e.target.value })}
                      placeholder="e.g. footer-menu"
                      className="w-full rounded-lg border border-[#DDD6FE] bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#0B1020] focus:ring-1 focus:ring-[#0B1020]"
                    />
                  </div>
                </div>
              </div>

              {/* Menu Items Card */}
              <div className="rounded-2xl border border-[#E4DEFB] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Menu items</h2>
                    <p className="text-xs text-slate-500">
                      Add links to products, collections, pages, or external URLs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddItem()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    + Add menu item
                  </button>
                </div>

                <div className="space-y-3">
                  {menuForm.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                      <p className="text-sm">No items in this menu yet.</p>
                      <button
                        type="button"
                        onClick={() => handleAddItem()}
                        className="mt-2 text-xs font-semibold text-violet-600 hover:underline"
                      >
                        + Add the first item
                      </button>
                    </div>
                  ) : (
                    menuForm.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-[#E4DEFB] bg-[#FAF8FF] p-3 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          {/* Reorder Buttons */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              title="Move up"
                              disabled={idx === 0}
                              onClick={() => handleMoveItem(idx, -1)}
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-[10px] leading-3 p-0.5"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              title="Move down"
                              disabled={idx === menuForm.items.length - 1}
                              onClick={() => handleMoveItem(idx, 1)}
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-[10px] leading-3 p-0.5"
                            >
                              ▼
                            </button>
                          </div>

                          {/* Item Name */}
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleChangeItem(idx, "title", e.target.value)}
                              placeholder="Link name (e.g. Home, Shop All)"
                              className="w-full rounded-lg border border-[#DDD6FE] bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-[#0B1020]"
                            />
                          </div>

                          {/* Item Link */}
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={item.url}
                              onChange={(e) => handleChangeItem(idx, "url", e.target.value)}
                              placeholder="Destination URL (e.g. /, /collections/all)"
                              className="w-full rounded-lg border border-[#DDD6FE] bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-[#0B1020]"
                            />
                          </div>

                          {/* Add nested button */}
                          <button
                            type="button"
                            title="Add sub-link"
                            onClick={() => handleAddItem(idx)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 whitespace-nowrap"
                          >
                            + Sub
                          </button>

                          {/* Remove Item */}
                          <button
                            type="button"
                            title="Remove item"
                            onClick={() => handleRemoveItem(idx)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          >
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>

                        {/* Nested items (sub-links) */}
                        {item.children && item.children.length > 0 && (
                          <div className="ml-8 pl-3 border-l-2 border-slate-200 space-y-2 pt-1">
                            {item.children.map((child, cIdx) => (
                              <div key={cIdx} className="flex items-center gap-2">
                                <span className="text-slate-400 text-xs select-none">↳</span>
                                <input
                                  type="text"
                                  value={child.title}
                                  onChange={(e) =>
                                    handleChangeItem(idx, "title", e.target.value, cIdx)
                                  }
                                  placeholder="Sub-link label"
                                  className="flex-1 rounded-lg border border-[#DDD6FE] bg-white px-2.5 py-1 text-xs text-slate-900 outline-none focus:border-[#0B1020]"
                                />
                                <input
                                  type="text"
                                  value={child.url}
                                  onChange={(e) =>
                                    handleChangeItem(idx, "url", e.target.value, cIdx)
                                  }
                                  placeholder="Sub-link URL"
                                  className="flex-1 rounded-lg border border-[#DDD6FE] bg-white px-2.5 py-1 text-xs text-slate-900 outline-none focus:border-[#0B1020]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx, cIdx)}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M18 6 6 18M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  {editingMenu && !editingMenu.isNew && (
                    <button
                      type="button"
                      onClick={handleDeleteMenu}
                      disabled={savingMenu}
                      className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      Delete menu
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseEditor}
                    disabled={savingMenu}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingMenu}
                    className="rounded-lg bg-[#0B1020] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1C2347] transition disabled:opacity-50"
                  >
                    {savingMenu ? "Saving..." : "Save menu"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* --- URL REDIRECTS MODAL --- */}
          {showRedirectsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <h2 className="text-lg font-bold text-slate-900">URL redirects</h2>
                  <button
                    type="button"
                    onClick={() => setShowRedirectsModal(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {redirectError && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs text-rose-700">
                      {redirectError}
                    </div>
                  )}

                  {/* Add / Edit Redirect Form */}
                  <form
                    onSubmit={handleSaveRedirect}
                    className="rounded-xl border border-slate-200 bg-[#FAF8FF] p-4 space-y-3"
                  >
                    <p className="text-xs font-semibold text-slate-700">
                      {editingRedirect ? "Edit URL redirect" : "Create new URL redirect"}
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Redirect from <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={redirectForm.path}
                          onChange={(e) =>
                            setRedirectForm({ ...redirectForm, path: e.target.value })
                          }
                          placeholder="/old-page-path"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-[#0B1020]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Redirect to <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={redirectForm.target}
                          onChange={(e) =>
                            setRedirectForm({ ...redirectForm, target: e.target.value })
                          }
                          placeholder="/new-page-path or https://..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-[#0B1020]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      {editingRedirect && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRedirect(null);
                            setRedirectForm({ path: "", target: "" });
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel edit
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={savingRedirect}
                        className="rounded-lg bg-[#0B1020] px-3.5 py-1 text-xs font-semibold text-white hover:bg-[#1C2347] disabled:opacity-50"
                      >
                        {savingRedirect
                          ? "Saving..."
                          : editingRedirect
                            ? "Update redirect"
                            : "Add redirect"}
                      </button>
                    </div>
                  </form>

                  {/* Redirects List */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Existing redirects ({redirects.length})
                    </h3>
                    {loadingRedirects ? (
                      <p className="text-xs text-slate-400 py-4 text-center">
                        Loading redirects...
                      </p>
                    ) : redirects.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-xl">
                        No URL redirects configured yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                        {redirects.map((red) => (
                          <div
                            key={red.id}
                            className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 text-xs"
                          >
                            <div className="min-w-0 pr-3">
                              <span className="font-mono font-medium text-slate-900">
                                {red.path}
                              </span>
                              <span className="mx-2 text-slate-400">→</span>
                              <span className="font-mono text-slate-600">{red.target}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRedirect(red);
                                  setRedirectForm({ path: red.path, target: red.target });
                                }}
                                className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRedirect(red.id)}
                                className="rounded px-2 py-1 text-rose-600 hover:bg-rose-50 font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowRedirectsModal(false)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
