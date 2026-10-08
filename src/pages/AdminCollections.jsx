import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "@/components/AdminSidebar";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

export default function AdminCollections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const selectAllCheckboxRef = useRef(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await apiGet("/api/v1/catalog/collections/");
    if (res.ok) {
      setCollections(Array.isArray(res.data) ? res.data : []);
    } else {
      setError(res.error || "Failed to load collections.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Filter collections by search query
  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) return collections;
    const query = searchQuery.toLowerCase().trim();
    return collections.filter((c) =>
      c.name?.toLowerCase().includes(query)
    );
  }, [collections, searchQuery]);

  // Paginated list
  const totalPages = Math.ceil(filteredCollections.length / pageSize) || 1;
  const paginatedCollections = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCollections.slice(start, start + pageSize);
  }, [filteredCollections, currentPage, pageSize]);

  // Checkbox Selection logic
  const isAllSelected =
    paginatedCollections.length > 0 &&
    paginatedCollections.every((c) => selectedIds.includes(c.id));

  const isIndeterminate =
    paginatedCollections.some((c) => selectedIds.includes(c.id)) && !isAllSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = paginatedCollections.map((c) => c.id);
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedCollections.map((c) => c.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Delete selected handler
  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} collection(s)?`)) {
      return;
    }

    for (const id of selectedIds) {
      await apiDelete(`/api/v1/catalog/collections/${id}/`);
    }
    setSelectedIds([]);
    fetchCollections();
  };

  return (
    <div className="min-h-screen bg-white text-[#161C2C]">
      {/* 1. TOP HEADER */}
      <header className="h-[72px] border-b border-gray-200 flex items-center justify-between px-7 sticky top-0 bg-white z-40">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link to="/admin/online-store/home" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#161C2C] flex items-center justify-center">
              <span className="text-white text-2xl font-bold">S</span>
            </div>
            <span className="text-[22px] font-bold">Store</span>
          </Link>
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center w-[420px] h-11 rounded-full bg-[#F3F6FA] px-5 gap-3">
          <span className="text-xl text-slate-500">⌕</span>
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full bg-transparent outline-none text-sm text-[#161C2C] placeholder:text-slate-500"
          />
        </div>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-6">
          <button type="button" className="relative text-2xl">
            ♧
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#161C2C] text-white flex items-center justify-center font-medium">
              A
            </div>
            <span className="text-sm font-medium">Admin</span>
            <span>⌄</span>
          </div>
        </div>
      </header>

      {/* 2. BODY LAYOUT (Includes AdminSidebar + Main Collections Content) */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT */}
        <main className="flex-1 bg-[#F7F8FA] px-4 sm:px-7 py-6 overflow-x-hidden">
          {/* Top Heading Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⊞</span>
              <h1 className="text-xl sm:text-[22px] font-bold text-[#161C2C]">
                Collections
              </h1>
            </div>

            <Link
              to="/admin/online-store/collections/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#161C2C] text-white text-sm font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xs"
            >
              <span>Add collection</span>
            </Link>
          </div>

          {/* MAIN CARD CONTAINER */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Filter / Search Bar */}
            <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Left: Tab */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs sm:text-sm font-semibold text-slate-900 shadow-2xs"
                >
                  All
                </button>
              </div>

              {/* Right: Search and filter input */}
              <div className="flex items-center gap-2 flex-1 sm:max-w-md ml-auto">
                <div className="relative flex-1 flex items-center">
                  <span className="absolute left-3 text-slate-400 pointer-events-none text-sm">
                    ⌕
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search and filter"
                    className="w-full pl-8 pr-8 py-1.5 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  title="Filter options"
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Selection Action Bar (when rows are selected) */}
            {selectedIds.length > 0 && (
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-medium text-slate-700">
                  {selectedIds.length} collection{selectedIds.length > 1 ? "s" : ""} selected
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="text-red-600 hover:text-red-800 font-medium transition-colors"
                  >
                    Delete selected
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Deselect all
                  </button>
                </div>
              </div>
            )}

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-medium">
                    <th className="w-12 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={selectAllCheckboxRef}
                        onChange={handleSelectAll}
                        disabled={loading || paginatedCollections.length === 0}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700">
                      Title
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-right sm:text-left">
                      Products
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700 hidden md:table-cell">
                      Conditions
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-right hidden sm:table-cell">
                      Sales channels
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {/* LOADING SKELETON */}
                  {loading && (
                    <>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-4 py-3 text-center">
                            <div className="w-4 h-4 bg-slate-200 rounded mx-auto" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-md bg-slate-200" />
                              <div className="h-4 bg-slate-200 rounded w-40" />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-4 bg-slate-200 rounded w-10" />
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="h-4 bg-slate-200 rounded w-48" />
                          </td>
                          <td className="px-4 py-3 text-right hidden sm:table-cell">
                            <div className="h-4 bg-slate-200 rounded w-8 ml-auto" />
                          </td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* EMPTY STATE */}
                  {!loading && filteredCollections.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-16 px-4 text-center">
                        <div className="max-w-md mx-auto flex flex-col items-center">
                          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 text-2xl">
                            ⊞
                          </div>
                          <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">
                            {searchQuery ? "No matching collections" : "Manage your collections"}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500 mb-5 leading-relaxed">
                            {searchQuery
                              ? `No collections matched "${searchQuery}". Try changing your search query.`
                              : "Group your products into categories to make it easier for customers to find what they're looking for."}
                          </p>
                          {searchQuery ? (
                            <button
                              type="button"
                              onClick={() => setSearchQuery("")}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#161C2C] text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors shadow-2xs"
                            >
                              Clear search
                            </button>
                          ) : (
                            <Link
                              to="/admin/online-store/collections/new"
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#161C2C] text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors shadow-2xs"
                            >
                              Create collection
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* DYNAMIC DATA ROWS */}
                  {!loading &&
                    paginatedCollections.map((col) => {
                      const isSelected = selectedIds.includes(col.id);
                      return (
                        <tr
                          key={col.id}
                          className={`transition-colors hover:bg-slate-50/80 ${
                            isSelected ? "bg-slate-50" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="w-12 px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRow(col.id)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                            />
                          </td>

                          {/* Title with Collection Icon */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <span className="font-medium text-slate-900 hover:text-blue-600 transition-colors cursor-pointer">
                                {col.name}
                              </span>
                            </div>
                          </td>

                          {/* Products count */}
                          <td className="px-4 py-3 text-right sm:text-left text-slate-700 font-medium">
                            {col.products_count ?? 0}
                          </td>

                          {/* Conditions */}
                          <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell max-w-xs truncate">
                            {col.conditions || "—"}
                          </td>

                          {/* Sales channels */}
                          <td className="px-4 py-3 text-right text-slate-600 hidden sm:table-cell">
                            <span className="inline-flex items-center gap-1 font-medium">
                              {col.sales_channels_count ?? 1}
                              <span className="text-[10px] text-slate-400">⌄</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* TABLE PAGINATION FOOTER */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  ‹
                </button>
                <span>
                  {filteredCollections.length === 0
                    ? "0-0"
                    : `${(currentPage - 1) * pageSize + 1}-${Math.min(
                        currentPage * pageSize,
                        filteredCollections.length
                      )}`}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  ›
                </button>
              </div>

              <div>
                <span>Total {filteredCollections.length} collections</span>
              </div>
            </div>
          </div>

          {/* Bottom Footer Info Link */}
          <div className="mt-8 text-center pb-6">
            <a
              href="#learn-more"
              className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
            >
              Learn more about collections
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
