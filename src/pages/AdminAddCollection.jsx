import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader, NavIcon } from "@/components/AdminSidebar";
import { apiPost } from "@/lib/api";

export default function AdminAddCollection() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [themeTemplate, setThemeTemplate] = useState("Default collection");
  const [channelsCount] = useState(3);
  const [conditions, setConditions] = useState([
    { type: "Status", operator: "is equal to", value: "Active, Draft, Unlisted, and Suspended" },
  ]);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleRemoveCondition = (index) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAllConditions = () => {
    setConditions([]);
  };

  const handleAddCondition = () => {
    setConditions((prev) => [
      ...prev,
      { type: "Product tag", operator: "is equal to", value: "New" },
    ]);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!title.trim()) {
      setError("Collection title is required.");
      return;
    }

    setSaving(true);
    setError("");

    const res = await apiPost("/api/v1/catalog/collections/", {
      name: title.trim(),
      description: description.trim(),
      theme_template: themeTemplate,
    });

    setSaving(false);

    if (res.ok) {
      navigate("/admin/online-store/collections");
    } else {
      setError(res.formError || res.fieldErrors?.name || "Failed to save collection.");
    }
  };

  const collectionSlug = title.trim()
    ? title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    : "collection-title";

  return (
    <div className="min-h-screen bg-[#F1F2F4] text-[#161C2C]">
      <AdminHeader />

      {/* 2. BODY LAYOUT */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN ADD COLLECTION CONTENT */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-6xl mx-auto w-full">
          {/* Breadcrumb / Page Title Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-slate-700">
              <Link
                to="/admin/online-store/collections"
                className="hover:text-slate-900 transition-colors flex items-center gap-1 text-slate-500 hover:underline"
              >
                <NavIcon name="products" className="h-4 w-4" />
                <span>›</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Add collection
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/admin/online-store/collections"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                Discard
              </Link>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="px-5 py-2 rounded-lg bg-[#161C2C] hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-xs"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* 2-COLUMN MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / MAIN COLUMN (8 cols) */}
            <div className="lg:col-span-8 space-y-5">
              {/* CARD 1: TITLE, DESCRIPTION & IMAGE UPLOAD */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {/* Image Upload Box */}
                  <label className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer transition-all shrink-0 overflow-hidden relative group">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Collection preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-600">
                        <span className="text-2xl font-light group-hover:-translate-y-0.5 transition-transform">
                          ↑
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  {/* Title & Description Inputs */}
                  <div className="flex-1 w-full flex flex-col justify-between min-h-[144px]">
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Add title"
                        className="w-full text-lg sm:text-xl font-medium text-slate-900 placeholder:text-slate-500 outline-none bg-transparent"
                        autoFocus
                      />

                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add description"
                        rows={2}
                        className="w-full text-sm text-slate-700 placeholder:text-slate-500 outline-none bg-transparent resize-none"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <div className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-normal hover:bg-slate-50 px-2 py-1 rounded cursor-pointer transition-colors">
                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <span>{channelsCount} channels</span>
                        <span className="text-[10px] text-slate-500">↕</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: COLLECTION ITEMS (PRODUCTS PREVIEW & CONDITIONS) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      Collection items
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      0
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Add conditions or products to populate your collection
                  </span>
                </div>

                {/* Toolbar / Filters */}
                <div className="flex items-center justify-between pt-1">
                  {/* Left: View toggle buttons */}
                  <div className="flex items-center gap-1 text-slate-500">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewMode === "grid"
                          ? "bg-slate-100 text-slate-900"
                          : "hover:bg-slate-50 text-slate-400"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewMode === "list"
                          ? "bg-slate-100 text-slate-900"
                          : "hover:bg-slate-50 text-slate-400"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-1 ml-1 px-2 py-1 rounded bg-slate-100 text-xs font-semibold text-slate-700">
                      <span>◫</span>
                      <span>4</span>
                    </div>
                  </div>

                  {/* Right: Filter menu icon */}
                  <button
                    type="button"
                    title="Filter options"
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>
                </div>

                {/* Active Filter Pills */}
                {conditions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {conditions.map((cond, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-xs text-slate-700 font-medium"
                      >
                        <span>
                          {cond.type}: {cond.value}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(idx)}
                          className="text-slate-400 hover:text-slate-700 font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={handleClearAllConditions}
                      className="text-xs text-slate-500 hover:text-slate-800 underline ml-1"
                    >
                      Clear all
                    </button>
                  </div>
                )}

                {/* Product Grid Preview (Matching the 4-column card preview in screenshot) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 flex flex-col items-center justify-between min-h-[140px]"
                    >
                      <div className="w-full flex-1 rounded-lg bg-slate-100/80 mb-2 flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="w-full space-y-1">
                        <div className="h-2.5 bg-slate-200/70 rounded w-3/4" />
                        <div className="h-2 bg-slate-200/50 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD 3: THEME TEMPLATE */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-3">
                <label className="block text-sm font-bold text-slate-900">
                  Theme template
                </label>
                <div className="relative">
                  <select
                    value={themeTemplate}
                    onChange={(e) => setThemeTemplate(e.target.value)}
                    className="w-full appearance-none bg-white px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-800 outline-none focus:border-slate-500 cursor-pointer pr-9"
                  >
                    <option value="Default collection">Default collection</option>
                    <option value="Featured collection">Featured collection</option>
                    <option value="Custom template">Custom template</option>
                  </select>
                  <span className="absolute right-3 top-3 text-slate-400 pointer-events-none text-xs">
                    ↕
                  </span>
                </div>
              </div>

              {/* CARD 4: SEARCH ENGINE LISTING */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">
                    Search engine listing
                  </span>
                  <button type="button" className="text-slate-400 hover:text-slate-700 text-sm">
                    ✎
                  </button>
                </div>

                <div className="space-y-0.5 pt-1">
                  <p className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer">
                    {title.trim() ? title : "Collection Title Preview"}
                  </p>
                  <p className="text-xs text-emerald-700 truncate">
                    https://store.myshopify.com › collections › {collectionSlug}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {description.trim()
                      ? description
                      : "Add a description to see how your collection will appear on search engine results."}
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (4 cols) */}
            <div className="lg:col-span-4 space-y-5">
              {/* CARD 1: PRODUCTS & CONDITIONS CONTROL */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🏷️</span>
                    <span className="text-sm font-bold text-slate-900">Products</span>
                  </div>
                  <span className="text-xs text-slate-400">↕</span>
                </div>

                {/* Actions: Add condition & Add products */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span>⊕</span>
                    <span>Add condition</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span>☖</span>
                    <span>Add products</span>
                  </button>
                </div>

                {/* Exclude Button */}
                <button
                  type="button"
                  className="w-full flex items-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <span>+</span>
                  <span>Exclude</span>
                </button>
              </div>

              {/* CARD 2: ADDITIONAL SECTION PLACEHOLDER */}
              <button
                type="button"
                onClick={handleAddCondition}
                className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg font-light transition-all bg-white/50 hover:bg-white"
              >
                +
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
