import { useEffect, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import LinkField from "@/components/LinkField";
import { apiRequest } from "@/lib/api";
import {
  deleteMenu,
  deleteUrlRedirect,
  listBlogPosts,
  listMenus,
  listStorePages,
  listUrlRedirects,
  saveMenu,
  saveUrlRedirect,
  uploadThemeImage,
} from "@/lib/themeApi";

// ---------------------------------------------------------------- AdminMenus
// Displays the Menus table matching the VENDRA admin UI, with dynamic backend
// integration for Menus, Menu Items, URL Redirects, and Mega Menus.

export default function AdminMenus() {
  const [menus, setMenus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // What a link can point at: the store's collections, products, pages and blog posts
  const [linkData, setLinkData] = useState({ collections: [], products: [], pages: [], posts: [] });

  useEffect(() => {
    const safe = (promise) => promise.catch(() => []);
    Promise.all([
      safe(apiRequest("/api/v1/catalog/collections/")),
      safe(apiRequest("/api/v1/catalog/products/")),
      safe(listStorePages()),
      safe(listBlogPosts()),
    ]).then(([collections, products, pages, posts]) =>
      setLinkData({
        collections,
        products,
        pages: pages.filter((p) => p.status === "visible"),
        posts: posts.filter((p) => p.status === "published"),
      })
    );
  }, []);

  // Edit / Create Menu mode: null (table view), or { id?, name, handle, items: [] }
  const [editingMenu, setEditingMenu] = useState(null);
  const [menuForm, setMenuForm] = useState({ name: "", handle: "", items: [] });
  const [savingMenu, setSavingMenu] = useState(false);
  const [uploadingBannerIdx, setUploadingBannerIdx] = useState(null);

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

  // Initial load
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
        {
          title: "Home",
          url: "/",
          is_mega: false,
          badge: "",
          promo_image: "",
          promo_title: "",
          promo_subtitle: "",
          promo_url: "",
          children: [],
        },
        {
          title: "Catalog",
          url: "/collections/all",
          is_mega: false,
          badge: "",
          promo_image: "",
          promo_title: "",
          promo_subtitle: "",
          promo_url: "",
          children: [],
        },
      ],
    });
    setError("");
    setNotice("");
  };

  // Open Edit Menu form
  const handleOpenEdit = (menu) => {
    setEditingMenu(menu);
    // Deep copy items supporting 3 levels of hierarchy and Mega Menu attributes
    const itemsCopy = (menu.items || []).map((it) => ({
      id: it.id,
      title: it.title || "",
      url: it.url || "",
      is_mega: Boolean(it.is_mega),
      badge: it.badge || "",
      promo_image: it.promo_image || "",
      promo_title: it.promo_title || "",
      promo_subtitle: it.promo_subtitle || "",
      promo_url: it.promo_url || "",
      children: (it.children || []).map((ch) => ({
        id: ch.id,
        title: ch.title || "",
        url: ch.url || "",
        badge: ch.badge || "",
        children: (ch.children || []).map((sub) => ({
          id: sub.id,
          title: sub.title || "",
          url: sub.url || "",
          badge: sub.badge || "",
        })),
      })),
    }));

    setMenuForm({
      name: menu.name || "",
      handle: menu.handle || "",
      items: itemsCopy.length
        ? itemsCopy
        : [
            {
              title: "",
              url: "",
              is_mega: false,
              badge: "",
              promo_image: "",
              promo_title: "",
              promo_subtitle: "",
              promo_url: "",
              children: [],
            },
          ],
    });
    setError("");
    setNotice("");
  };

  // Close Menu Editor
  const handleCloseEditor = () => {
    setEditingMenu(null);
    setError("");
  };

  // Menu Form: Add Item across Level 1, Level 2 (Column), or Level 3 (Link)
  const handleAddItem = (parentIdx = null, childIdx = null) => {
    setMenuForm((prev) => {
      const newItems = [...prev.items];
      if (parentIdx === null) {
        // Level 1 item
        newItems.push({
          title: "",
          url: "",
          is_mega: false,
          badge: "",
          promo_image: "",
          promo_title: "",
          promo_subtitle: "",
          promo_url: "",
          children: [],
        });
      } else if (childIdx === null) {
        // Level 2 item (Column / Submenu under parentIdx)
        const parent = { ...newItems[parentIdx] };
        parent.children = [
          ...(parent.children || []),
          { title: "", url: "", badge: "", children: [] },
        ];
        newItems[parentIdx] = parent;
      } else {
        // Level 3 item (Column link under childIdx)
        const parent = { ...newItems[parentIdx] };
        parent.children = [...parent.children];
        const child = { ...parent.children[childIdx] };
        child.children = [...(child.children || []), { title: "", url: "", badge: "" }];
        parent.children[childIdx] = child;
        newItems[parentIdx] = parent;
      }
      return { ...prev, items: newItems };
    });
  };

  // Menu Form: Remove Item across Level 1, 2, or 3
  const handleRemoveItem = (idx, childIdx = null, subIdx = null) => {
    setMenuForm((prev) => {
      const newItems = [...prev.items];
      if (childIdx === null && subIdx === null) {
        // Remove Level 1 item
        newItems.splice(idx, 1);
      } else if (subIdx === null) {
        // Remove Level 2 item
        const parent = { ...newItems[idx] };
        parent.children = [...parent.children];
        parent.children.splice(childIdx, 1);
        newItems[idx] = parent;
      } else {
        // Remove Level 3 item
        const parent = { ...newItems[idx] };
        parent.children = [...parent.children];
        const child = { ...parent.children[childIdx] };
        child.children = [...child.children];
        child.children.splice(subIdx, 1);
        parent.children[childIdx] = child;
        newItems[idx] = parent;
      }
      return { ...prev, items: newItems };
    });
  };

  // Menu Form: Change Item Field across Level 1, 2, or 3
  const handleChangeItem = (idx, field, value, childIdx = null, subIdx = null) => {
    setMenuForm((prev) => {
      const newItems = [...prev.items];
      if (childIdx === null && subIdx === null) {
        // Change Level 1 item
        newItems[idx] = { ...newItems[idx], [field]: value };
      } else if (subIdx === null) {
        // Change Level 2 item
        const parent = { ...newItems[idx] };
        parent.children = [...parent.children];
        parent.children[childIdx] = { ...parent.children[childIdx], [field]: value };
        newItems[idx] = parent;
      } else {
        // Change Level 3 item
        const parent = { ...newItems[idx] };
        parent.children = [...parent.children];
        const child = { ...parent.children[childIdx] };
        child.children = [...child.children];
        child.children[subIdx] = { ...child.children[subIdx], [field]: value };
        parent.children[childIdx] = child;
        newItems[idx] = parent;
      }
      return { ...prev, items: newItems };
    });
  };

  // Menu Form: Move Item Up/Down within its level
  const handleMoveItem = (idx, direction, childIdx = null, subIdx = null) => {
    setMenuForm((prev) => {
      const newItems = [...prev.items];
      if (childIdx === null && subIdx === null) {
        // Move Level 1 item
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= newItems.length) return prev;
        const [moved] = newItems.splice(idx, 1);
        newItems.splice(targetIdx, 0, moved);
      } else if (subIdx === null) {
        // Move Level 2 item
        const parent = { ...newItems[idx] };
        parent.children = [...parent.children];
        const targetIdx = childIdx + direction;
        if (targetIdx < 0 || targetIdx >= parent.children.length) return prev;
        const [moved] = parent.children.splice(childIdx, 1);
        parent.children.splice(targetIdx, 0, moved);
        newItems[idx] = parent;
      } else {
        // Move Level 3 item
        const parent = { ...newItems[idx] };
        parent.children = [...parent.children];
        const child = { ...parent.children[childIdx] };
        child.children = [...child.children];
        const targetIdx = subIdx + direction;
        if (targetIdx < 0 || targetIdx >= child.children.length) return prev;
        const [moved] = child.children.splice(subIdx, 1);
        child.children.splice(targetIdx, 0, moved);
        parent.children[childIdx] = child;
        newItems[idx] = parent;
      }
      return { ...prev, items: newItems };
    });
  };

  // Upload Promotional Banner Image
  const handlePromoImageUpload = async (e, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploadingBannerIdx(idx);
    try {
      const res = await uploadThemeImage(file);
      if (res.ok && res.data?.url) {
        handleChangeItem(idx, "promo_image", res.data.url);
      } else {
        setError(res.error || "Failed to upload promotional banner image.");
      }
    } catch (err) {
      setError(err.message || "Failed to upload promotional banner image.");
    } finally {
      setUploadingBannerIdx(null);
    }
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

      const cleanSub = (s) => ({
        title: s.title.trim(),
        url: (s.url || "").trim(),
        badge: (s.badge || "").trim(),
      });

      const cleanChild = (c) => ({
        title: c.title.trim(),
        url: (c.url || "").trim(),
        badge: (c.badge || "").trim(),
        children: (c.children || []).filter((s) => s.title && s.title.trim()).map(cleanSub),
      });

      const cleanItem = (it) => ({
        title: it.title.trim(),
        url: (it.url || "").trim(),
        is_mega: Boolean(it.is_mega),
        badge: (it.badge || "").trim(),
        promo_image: (it.promo_image || "").trim(),
        promo_title: (it.promo_title || "").trim(),
        promo_subtitle: (it.promo_subtitle || "").trim(),
        promo_url: (it.promo_url || "").trim(),
        children: (it.children || []).filter((c) => c.title && c.title.trim()).map(cleanChild),
      });

      const payload = {
        name: menuForm.name.trim(),
        handle: menuForm.handle.trim(),
        items: menuForm.items.filter((it) => it.title && it.title.trim()).map(cleanItem),
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
    <div className="min-h-screen bg-white text-[#14130F]">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />

        <main className="min-w-0 flex-1 overflow-hidden bg-[#F3F1EC] px-4 sm:px-6 py-6 lg:px-8">
          {/* TOP BAR / HEADING */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#14130F]">
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
                  className="rounded-lg bg-[#F3F1EC] px-4 py-2 text-sm font-medium text-[#14130F] hover:bg-[#E7E4DC] transition"
                >
                  URL redirects
                </button>

                <button
                  type="button"
                  id="btn-create-menu"
                  onClick={handleOpenCreate}
                  className="rounded-lg bg-[#14130F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1A1916] transition"
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
            <section className="mt-5 overflow-hidden rounded-2xl border border-[#E7E4DC] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#14130F]">
                  <thead className="border-b border-[#E7E4DC] bg-[#FAF9F6] text-xs font-medium text-slate-500">
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
                  <tbody className="divide-y divide-[#E7E4DC]">
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
                          <td className="px-5 py-4 font-semibold text-[#14130F] group-hover:text-violet-600">
                            <div className="flex items-center gap-2">
                              <span>{menu.name}</span>
                              {menu.items?.some((it) => it.is_mega) && (
                                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                                  Mega Menu
                                </span>
                              )}
                            </div>
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
                            className="mt-4 inline-flex items-center rounded-lg bg-[#14130F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1A1916] transition"
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
              <div className="rounded-2xl border border-[#E7E4DC] bg-white p-6 shadow-sm">
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
                      className="w-full rounded-lg border border-[#E7E4DC] bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#14130F] focus:ring-1 focus:ring-[#14130F]"
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
                      placeholder="e.g. main-menu, footer"
                      className="w-full rounded-lg border border-[#E7E4DC] bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#14130F] focus:ring-1 focus:ring-[#14130F]"
                    />
                  </div>
                </div>
              </div>

              {/* Menu Items Card */}
              <div className="rounded-2xl border border-[#E7E4DC] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Menu items</h2>
                    <p className="text-xs text-slate-500">
                      Organize standard links, dropdowns, and multi-column Mega Menus.
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

                <div className="space-y-4">
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
                        className={`rounded-xl border p-4 space-y-3 transition-colors ${
                          item.is_mega
                            ? "border-violet-300 bg-[#FAF9F6] shadow-xs"
                            : "border-[#E7E4DC] bg-[#FCFBFF]"
                        }`}
                      >
                        {/* Level 1 Item Row */}
                        <div className="flex flex-wrap items-center gap-2">
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
                          <div className="flex-1 min-w-[140px]">
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleChangeItem(idx, "title", e.target.value)}
                              placeholder="Link name (e.g. Products, Shop)"
                              className="w-full rounded-lg border border-[#E7E4DC] bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none focus:border-[#14130F]"
                            />
                          </div>

                          {/* Item Link */}
                          <div className="flex-1 min-w-[160px]">
                            <LinkField
                              value={item.url}
                              onChange={(url) => handleChangeItem(idx, "url", url)}
                              {...linkData}
                              label="Link"
                              compact
                            />
                          </div>

                          {/* Badge (Optional) */}
                          <div className="w-24">
                            <input
                              type="text"
                              maxLength={30}
                              value={item.badge}
                              onChange={(e) => handleChangeItem(idx, "badge", e.target.value)}
                              placeholder="Badge"
                              title="Optional badge (e.g. New, Sale)"
                              className="w-full rounded-lg border border-[#E7E4DC] bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-[#14130F]"
                            />
                          </div>

                          {/* Mega Menu Toggle */}
                          <button
                            type="button"
                            onClick={() => handleChangeItem(idx, "is_mega", !item.is_mega)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                              item.is_mega
                                ? "bg-[#265C48] text-white shadow-xs"
                                : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                            }`}
                            title="Toggle multi-column Mega Menu layout for this navigation item"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.is_mega ? "bg-white" : "bg-slate-400"
                              }`}
                            />
                            {item.is_mega ? "Mega Menu ON" : "Mega Menu"}
                          </button>

                          {/* Add Sub / Add Column Button */}
                          <button
                            type="button"
                            title={item.is_mega ? "Add column grouping" : "Add sub-link"}
                            onClick={() => handleAddItem(idx)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                          >
                            {item.is_mega ? "+ Column" : "+ Sub"}
                          </button>

                          {/* Remove Item */}
                          <button
                            type="button"
                            title="Remove menu item"
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

                        {/* Promotional Banner Box (Shown only when is_mega is enabled) */}
                        {item.is_mega && (
                          <div className="rounded-xl border border-purple-200 bg-white/80 p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                                  Promotional Banner
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  (Optional card displayed on the side of the mega menu)
                                </span>
                              </div>
                              {(item.promo_image ||
                                item.promo_title ||
                                item.promo_subtitle ||
                                item.promo_url) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleChangeItem(idx, "promo_image", "");
                                    handleChangeItem(idx, "promo_title", "");
                                    handleChangeItem(idx, "promo_subtitle", "");
                                    handleChangeItem(idx, "promo_url", "");
                                  }}
                                  className="text-xs text-rose-600 hover:underline"
                                >
                                  Clear banner
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Image Upload / Preview */}
                              <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                  Banner Image
                                </label>
                                <div className="flex items-center gap-2">
                                  {item.promo_image ? (
                                    <div className="relative group w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                                      <img
                                        src={item.promo_image}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleChangeItem(idx, "promo_image", "")}
                                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs transition"
                                        title="Remove image"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : null}
                                  <label className="flex-1 cursor-pointer">
                                    <span className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition">
                                      {uploadingBannerIdx === idx
                                        ? "Uploading..."
                                        : item.promo_image
                                          ? "Change image"
                                          : "Upload image"}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      disabled={uploadingBannerIdx === idx}
                                      onChange={(e) => handlePromoImageUpload(e, idx)}
                                      className="sr-only"
                                    />
                                  </label>
                                </div>
                              </div>

                              {/* Titles */}
                              <div className="space-y-1.5">
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                                    Headline
                                  </label>
                                  <input
                                    type="text"
                                    value={item.promo_title}
                                    onChange={(e) =>
                                      handleChangeItem(idx, "promo_title", e.target.value)
                                    }
                                    placeholder="e.g. Summer Collection"
                                    className="w-full rounded-lg border border-[#E7E4DC] bg-white px-2.5 py-1 text-xs text-slate-900 outline-none focus:border-[#14130F]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                                    Subtitle
                                  </label>
                                  <input
                                    type="text"
                                    value={item.promo_subtitle}
                                    onChange={(e) =>
                                      handleChangeItem(idx, "promo_subtitle", e.target.value)
                                    }
                                    placeholder="e.g. Up to 40% Off"
                                    className="w-full rounded-lg border border-[#E7E4DC] bg-white px-2.5 py-1 text-xs text-slate-900 outline-none focus:border-[#14130F]"
                                  />
                                </div>
                              </div>

                              {/* Banner Destination Link */}
                              <div>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                  Banner Link
                                </label>
                                <LinkField
                                  value={item.promo_url}
                                  onChange={(url) => handleChangeItem(idx, "promo_url", url)}
                                  {...linkData}
                                  label="Banner destination"
                                  compact
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Level 2 items (Columns / Sub-links) */}
                        {item.children && item.children.length > 0 && (
                          <div className="ml-6 pl-3 border-l-2 border-violet-200 space-y-3 pt-1">
                            {item.children.map((child, cIdx) => (
                              <div
                                key={cIdx}
                                className="rounded-lg bg-white p-2.5 border border-slate-200 space-y-2 shadow-2xs"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* Level 2 Reorder Buttons */}
                                  <div className="flex flex-col gap-0.5">
                                    <button
                                      type="button"
                                      title="Move column up"
                                      disabled={cIdx === 0}
                                      onClick={() => handleMoveItem(idx, -1, cIdx)}
                                      className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-[9px] leading-2.5 p-0.5"
                                    >
                                      ▲
                                    </button>
                                    <button
                                      type="button"
                                      title="Move column down"
                                      disabled={cIdx === item.children.length - 1}
                                      onClick={() => handleMoveItem(idx, 1, cIdx)}
                                      className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-[9px] leading-2.5 p-0.5"
                                    >
                                      ▼
                                    </button>
                                  </div>

                                  <span className="text-violet-600 font-bold text-xs select-none">
                                    {item.is_mega ? "↳ Column:" : "↳ Sub:"}
                                  </span>

                                  {/* Column Name */}
                                  <input
                                    type="text"
                                    value={child.title}
                                    onChange={(e) =>
                                      handleChangeItem(idx, "title", e.target.value, cIdx)
                                    }
                                    placeholder={
                                      item.is_mega
                                        ? "Column heading (e.g. Clothing, Shoes)"
                                        : "Sub-link label"
                                    }
                                    className="flex-1 min-w-[130px] rounded-lg border border-[#E7E4DC] bg-white px-2.5 py-1 text-xs font-medium text-slate-900 outline-none focus:border-[#14130F]"
                                  />

                                  {/* Column Link */}
                                  <div className="flex-1 min-w-[150px]">
                                    <LinkField
                                      value={child.url}
                                      onChange={(url) => handleChangeItem(idx, "url", url, cIdx)}
                                      {...linkData}
                                      label="Column link"
                                      compact
                                    />
                                  </div>

                                  {/* Column Badge */}
                                  <div className="w-20">
                                    <input
                                      type="text"
                                      maxLength={30}
                                      value={child.badge}
                                      onChange={(e) =>
                                        handleChangeItem(idx, "badge", e.target.value, cIdx)
                                      }
                                      placeholder="Badge"
                                      title="Optional column badge"
                                      className="w-full rounded-lg border border-[#E7E4DC] bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-[#14130F]"
                                    />
                                  </div>

                                  {/* Add Level 3 Link under this Column */}
                                  <button
                                    type="button"
                                    title="Add nested link under this column"
                                    onClick={() => handleAddItem(idx, cIdx)}
                                    className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 whitespace-nowrap"
                                  >
                                    + Link
                                  </button>

                                  {/* Remove Level 2 Column */}
                                  <button
                                    type="button"
                                    title="Remove column"
                                    onClick={() => handleRemoveItem(idx, cIdx)}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition"
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

                                {item.is_mega && (
                                  <p className="pl-6 text-[11px] text-slate-500">
                                    The column link becomes the column's "Shop All" link, shown at
                                    the end of the column. Leave it empty for no Shop All.
                                  </p>
                                )}

                                {/* Level 3 items (Links under Column) */}
                                {child.children && child.children.length > 0 && (
                                  <div className="ml-6 pl-3 border-l-2 border-violet-300 space-y-2 pt-1">
                                    {child.children.map((sub, sIdx) => (
                                      <div
                                        key={sIdx}
                                        className="flex items-center gap-2 bg-slate-50/70 p-1.5 rounded-md border border-slate-200"
                                      >
                                        {/* Level 3 Reorder Buttons */}
                                        <div className="flex flex-col gap-0.5">
                                          <button
                                            type="button"
                                            title="Move link up"
                                            disabled={sIdx === 0}
                                            onClick={() => handleMoveItem(idx, -1, cIdx, sIdx)}
                                            className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-[9px] leading-2 p-0.5"
                                          >
                                            ▲
                                          </button>
                                          <button
                                            type="button"
                                            title="Move link down"
                                            disabled={sIdx === child.children.length - 1}
                                            onClick={() => handleMoveItem(idx, 1, cIdx, sIdx)}
                                            className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-[9px] leading-2 p-0.5"
                                          >
                                            ▼
                                          </button>
                                        </div>

                                        <span className="text-slate-400 text-xs select-none">
                                          ↳↳
                                        </span>

                                        {/* Link Title */}
                                        <input
                                          type="text"
                                          value={sub.title}
                                          onChange={(e) =>
                                            handleChangeItem(
                                              idx,
                                              "title",
                                              e.target.value,
                                              cIdx,
                                              sIdx
                                            )
                                          }
                                          placeholder="Column link (e.g. Dresses, T-Shirts)"
                                          className="flex-1 min-w-[120px] rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-[#14130F]"
                                        />

                                        {/* Link URL */}
                                        <div className="flex-1 min-w-[140px]">
                                          <LinkField
                                            value={sub.url}
                                            onChange={(url) =>
                                              handleChangeItem(idx, "url", url, cIdx, sIdx)
                                            }
                                            {...linkData}
                                            label="Link destination"
                                            compact
                                          />
                                        </div>

                                        {/* Link Badge */}
                                        <div className="w-18">
                                          <input
                                            type="text"
                                            maxLength={30}
                                            value={sub.badge}
                                            onChange={(e) =>
                                              handleChangeItem(
                                                idx,
                                                "badge",
                                                e.target.value,
                                                cIdx,
                                                sIdx
                                              )
                                            }
                                            placeholder="Badge"
                                            title="Optional link badge"
                                            className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-900 outline-none focus:border-[#14130F]"
                                          />
                                        </div>

                                        {/* Remove Level 3 Link */}
                                        <button
                                          type="button"
                                          title="Remove link"
                                          onClick={() => handleRemoveItem(idx, cIdx, sIdx)}
                                          className="p-1 text-slate-400 hover:text-rose-600 transition"
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
                    className="rounded-lg bg-[#14130F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1A1916] transition disabled:opacity-50"
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
                    className="rounded-xl border border-slate-200 bg-[#FAF9F6] p-4 space-y-3"
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
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-[#14130F]"
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
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-[#14130F]"
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
                        className="rounded-lg bg-[#14130F] px-3.5 py-1 text-xs font-semibold text-white hover:bg-[#1A1916] disabled:opacity-50"
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
