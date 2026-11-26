"use client";

import { useEffect, useRef, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import SelectDiscountTypeModal from "@/components/SelectDiscountTypeModal";
import ExportDiscountsModal from "@/components/ExportDiscountsModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import { apiDelete, apiGet, apiPatch } from "@/lib/api";
import { useCan } from "@/lib/auth";

const STATUS_FILTER_LABELS = {
  all: "All",
  active: "Active",
  scheduled: "Scheduled",
  expired: "Expired",
};

function getDiscountStatus(discount) {
  const now = new Date();
  const startsAt = discount.starts_at ? new Date(discount.starts_at) : null;
  const endsAt = discount.ends_at ? new Date(discount.ends_at) : null;

  if (discount.is_active === false) {
    return "expired";
  }
  if (endsAt && endsAt < now) {
    return "expired";
  }
  if (startsAt && startsAt > now) {
    return "scheduled";
  }
  return "active";
}

export default function DiscountsPage() {
  const canManage = useCan("discounts.manage");
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [discounts, setDiscounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSelectionMenuOpen, setIsSelectionMenuOpen] = useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [tagModalMode, setTagModalMode] = useState(null); // 'add' | 'remove' | null
  const [tagInput, setTagInput] = useState("");
  const [toastMessage, setToastMessage] = useState(null);
  const pageSize = 50;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filterMenuRef = useRef(null);
  const selectionMenuRef = useRef(null);
  const moreActionsRef = useRef(null);

  useEffect(() => {
    let active = true;
    const fetchDiscounts = async () => {
      setLoading(true);
      const res = await apiGet("/api/v1/discounts/");
      if (active && res.ok && Array.isArray(res.data?.results || res.data)) {
        setDiscounts(res.data?.results || res.data);
      }
      if (active) setLoading(false);
    };
    fetchDiscounts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
      if (selectionMenuRef.current && !selectionMenuRef.current.contains(e.target)) {
        setIsSelectionMenuOpen(false);
      }
      if (moreActionsRef.current && !moreActionsRef.current.contains(e.target)) {
        setIsMoreActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredDiscounts = discounts.filter((d) => {
    const status = getDiscountStatus(d);
    if (statusFilter !== "all" && status !== statusFilter) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const codes = Array.isArray(d.codes) ? d.codes.join(" ") : "";
    return (
      (d.name && d.name.toLowerCase().includes(q)) ||
      codes.toLowerCase().includes(q) ||
      (d.discount_type && d.discount_type.toLowerCase().includes(q))
    );
  });

  const effectiveShowOnlySelected = showOnlySelected && selectedIds.size > 0;
  const displayedDiscounts = effectiveShowOnlySelected
    ? filteredDiscounts.filter((d) => selectedIds.has(d.id))
    : filteredDiscounts;

  const totalPages = Math.max(1, Math.ceil(displayedDiscounts.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedDiscounts = displayedDiscounts.slice(pageStart, pageStart + pageSize);

  const isAllPageSelected =
    paginatedDiscounts.length > 0 && paginatedDiscounts.every((d) => selectedIds.has(d.id));
  const isSomePageSelected =
    paginatedDiscounts.some((d) => selectedIds.has(d.id)) && !isAllPageSelected;

  const handleToggleAll = () => {
    const next = new Set(selectedIds);
    if (isAllPageSelected) {
      paginatedDiscounts.forEach((d) => next.delete(d.id));
    } else {
      paginatedDiscounts.forEach((d) => next.add(d.id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelect = (id, e) => {
    e?.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleFilterSelect = (filterId) => {
    setStatusFilter(filterId);
    setIsFilterOpen(false);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleBulkActivate = async () => {
    if (selectedIds.size === 0 || isBulkLoading) return;
    setIsBulkLoading(true);
    try {
      const idsToUpdate = Array.from(selectedIds);
      const results = await Promise.all(
        idsToUpdate.map(async (id) => {
          const res = await apiPatch(`/api/v1/discounts/${id}/`, { is_active: true });
          return { id, ok: res.ok };
        })
      );
      const successfulIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
      if (successfulIds.size > 0) {
        setDiscounts((prev) =>
          prev.map((d) => (successfulIds.has(d.id) ? { ...d, is_active: true } : d))
        );
      }
    } catch (err) {
      console.error("Failed to activate discounts:", err);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.size === 0 || isBulkLoading) return;
    setIsBulkLoading(true);
    try {
      const idsToUpdate = Array.from(selectedIds);
      const results = await Promise.all(
        idsToUpdate.map(async (id) => {
          const res = await apiPatch(`/api/v1/discounts/${id}/`, { is_active: false });
          return { id, ok: res.ok };
        })
      );
      const successfulIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
      if (successfulIds.size > 0) {
        setDiscounts((prev) =>
          prev.map((d) => (successfulIds.has(d.id) ? { ...d, is_active: false } : d))
        );
      }
    } catch (err) {
      console.error("Failed to deactivate discounts:", err);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.size === 0 || isBulkLoading) return;
    setIsBulkLoading(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      const results = await Promise.all(
        idsToDelete.map(async (id) => {
          const res = await apiDelete(`/api/v1/discounts/${id}/`);
          return { id, ok: res.ok };
        })
      );
      const successfulIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
      if (successfulIds.size > 0) {
        setDiscounts((prev) => prev.filter((d) => !successfulIds.has(d.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          successfulIds.forEach((id) => next.delete(id));
          return next;
        });
      }
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error("Failed to delete discounts:", err);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleTagModalSubmit = (e) => {
    e.preventDefault();
    const count = selectedIds.size;
    const s = count > 1 ? "discounts" : "discount";
    if (tagModalMode === "add") {
      showToast(`Tags added to ${count} ${s}.`);
    } else {
      showToast(`Tags removed from ${count} ${s}.`);
    }
    setTagModalMode(null);
    setTagInput("");
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />

        <main className="min-w-0 flex-1">
          {/* HEADER */}
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-4 py-5 sm:px-6">
            <div className="flex items-center gap-2.5 text-ink">
              <PageIcon name="discounts" />

              <h1 className="text-xl font-semibold text-ink">Discounts</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-ink hover:bg-[rgba(24,24,27,0.12)] transition cursor-pointer"
              >
                <svg
                  className="h-4 w-4 text-ink"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V3m0 0L8 7m4-4l4 4"
                  />
                </svg>
                <span>Export</span>
              </button>

              {canManage && (
                <button
                  type="button"
                  id="create-discount-button"
                  onClick={() => setIsTypeModalOpen(true)}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-black transition cursor-pointer"
                >
                  Create discount
                </button>
              )}
            </div>
          </header>

          {/* CONTENT */}
          <div className="p-5">
            <section className="rounded-2xl border border-slate-200 bg-white min-h-[420px]">
              {/* SEARCH / FILTER BAR */}
              <div className="flex h-14 items-center border-b border-slate-200 rounded-t-2xl">
                <div className="relative h-full" ref={filterMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="flex h-full items-center gap-2 px-5 text-sm font-medium text-ink hover:bg-slate-50 transition cursor-pointer"
                    aria-expanded={isFilterOpen}
                    aria-haspopup="true"
                  >
                    <span>{STATUS_FILTER_LABELS[statusFilter] || "All"}</span>
                    <svg
                      className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isFilterOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isFilterOpen && (
                    <div className="absolute left-0 top-full mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-40">
                      {[
                        { id: "all", label: "All" },
                        { id: "active", label: "Active" },
                        { id: "scheduled", label: "Scheduled" },
                        { id: "expired", label: "Expired" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleFilterSelect(opt.id)}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left transition cursor-pointer ${
                            statusFilter === opt.id
                              ? "bg-slate-50 font-medium text-ink"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="w-4 text-center text-ink font-bold">
                            {statusFilter === opt.id ? "✓" : ""}
                          </span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-1 items-center gap-3 px-4">
                  <span className="text-xl text-slate-500">⌕</span>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search and filter"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                  />
                </div>

                <button
                  type="button"
                  className="border-l border-slate-200 px-5 text-xl text-slate-500"
                >
                  ▥
                </button>
              </div>

              <div className="w-full">
                {/* TABLE HEADER OR BULK ACTION TOOLBAR */}
                {selectedIds.size > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-brand-cream-100 px-4 py-2.5 text-sm relative z-20">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <div>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-ink focus:ring-ink cursor-pointer"
                          checked={isAllPageSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomePageSelected;
                          }}
                          onChange={handleToggleAll}
                          aria-label="Select all discounts on this page"
                        />
                      </div>

                      {/* Selected Count Dropdown */}
                      <div className="relative" ref={selectionMenuRef}>
                        <button
                          type="button"
                          onClick={() => setIsSelectionMenuOpen(!isSelectionMenuOpen)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 cursor-pointer"
                        >
                          <span>
                            {effectiveShowOnlySelected ? "Showing " : ""}
                            {selectedIds.size} selected
                          </span>
                          <svg
                            className="h-3 w-3 text-slate-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {isSelectionMenuOpen && (
                          <div className="absolute left-0 top-full mt-1 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-30">
                            {selectedIds.size < filteredDiscounts.length && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIds(new Set(filteredDiscounts.map((d) => d.id)));
                                  setIsSelectionMenuOpen(false);
                                }}
                                className="flex w-full items-center px-3 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                Select all {filteredDiscounts.length} discounts
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedIds(new Set());
                                setIsSelectionMenuOpen(false);
                              }}
                              className="flex w-full items-center px-3 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              Deselect all
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Activate Discounts Button */}
                      <button
                        type="button"
                        disabled={isBulkLoading}
                        onClick={handleBulkActivate}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                      >
                        Activate discounts
                      </button>

                      {/* Deactivate Discounts Button */}
                      <button
                        type="button"
                        disabled={isBulkLoading}
                        onClick={handleBulkDeactivate}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                      >
                        Deactivate discounts
                      </button>

                      {/* More Actions Menu */}
                      <div className="relative" ref={moreActionsRef}>
                        <button
                          type="button"
                          onClick={() => setIsMoreActionsOpen(!isMoreActionsOpen)}
                          className="flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 cursor-pointer"
                          aria-label="More actions"
                        >
                          •••
                        </button>

                        {isMoreActionsOpen && (
                          <div className="absolute left-0 top-full mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl z-50">
                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                setTagInput("");
                                setTagModalMode("add");
                              }}
                              className="flex w-full items-center px-4 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              Add tags
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                setTagInput("");
                                setTagModalMode("remove");
                              }}
                              className="flex w-full items-center px-4 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              Remove tags
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                showToast(
                                  `Sales channel access allowed for ${selectedIds.size} discount${selectedIds.size > 1 ? "s" : ""}.`
                                );
                              }}
                              className="flex w-full items-center px-4 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              Allow sales channel access
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                showToast(
                                  `Sales channel access denied for ${selectedIds.size} discount${selectedIds.size > 1 ? "s" : ""}.`
                                );
                              }}
                              className="flex w-full items-center px-4 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              Deny sales channel access
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                setIsDeleteModalOpen(true);
                              }}
                              className="flex w-full items-center px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 transition cursor-pointer"
                            >
                              Delete discounts
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Show All Selected Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={effectiveShowOnlySelected}
                      onClick={() => setShowOnlySelected(!effectiveShowOnlySelected)}
                      className="flex items-center gap-2 cursor-pointer select-none group"
                    >
                      <span
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          effectiveShowOnlySelected
                            ? "bg-ink"
                            : "bg-slate-300 group-hover:bg-slate-400"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            effectiveShowOnlySelected ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </span>
                      <span className="text-xs font-medium text-slate-700 group-hover:text-ink transition-colors">
                        Show all selected
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-[36px_minmax(0,2fr)_100px_90px_110px_130px_120px_50px] items-center border-b border-slate-200 bg-brand-cream-100 px-4 py-3 text-sm font-medium text-slate-700">
                    <div>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-ink focus:ring-ink cursor-pointer"
                        checked={isAllPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomePageSelected;
                        }}
                        onChange={handleToggleAll}
                        aria-label="Select all discounts on this page"
                      />
                    </div>

                    <div>Title</div>
                    <div>Status</div>
                    <div>Method</div>
                    <div>Eligibility</div>
                    <div>Type</div>
                    <div>Combinations</div>
                    <div>Used</div>
                  </div>
                )}

                {/* TABLE BODY */}
                {paginatedDiscounts.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {paginatedDiscounts.map((discount) => {
                      const codeDisplay =
                        Array.isArray(discount.codes) && discount.codes.length > 0
                          ? discount.codes.join(", ")
                          : discount.name || "Untitled discount";
                      const isCode = Array.isArray(discount.codes) && discount.codes.length > 0;
                      const status = getDiscountStatus(discount);
                      const isSelected = selectedIds.has(discount.id);

                      let subtitle = "";
                      if (discount.discount_type === "percentage" && discount.value) {
                        subtitle = `${discount.value}% off entire order`;
                      } else if (discount.discount_type === "fixed_amount" && discount.value) {
                        subtitle = `₹${discount.value} off entire order`;
                      } else if (discount.name && discount.name !== codeDisplay) {
                        subtitle = discount.name;
                      }

                      return (
                        <div
                          key={discount.id}
                          className={`grid grid-cols-[36px_minmax(0,2fr)_100px_90px_110px_130px_120px_50px] items-center px-4 py-3 text-sm transition ${
                            isSelected
                              ? "bg-amber-50/60 hover:bg-amber-50"
                              : "text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-ink focus:ring-ink cursor-pointer"
                              checked={isSelected}
                              onChange={(e) => handleToggleSelect(discount.id, e)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select discount ${codeDisplay}`}
                            />
                          </div>
                          <div className="min-w-0 pr-2">
                            <div className="font-medium text-ink truncate">{codeDisplay}</div>
                            {subtitle && (
                              <div className="text-xs text-slate-500 truncate">{subtitle}</div>
                            )}
                          </div>
                          <div>
                            {status === "active" && (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                                Active
                              </span>
                            )}
                            {status === "scheduled" && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                                Scheduled
                              </span>
                            )}
                            {status === "expired" && (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                Expired
                              </span>
                            )}
                          </div>
                          <div className="text-slate-600">{isCode ? "Code" : "Automatic"}</div>
                          <div className="text-slate-600">All customers</div>
                          <div className="text-slate-600 capitalize">
                            {discount.discount_type?.replace(/_/g, " ") || "Amount off products"}
                          </div>
                          <div className="text-slate-500 text-xs">Product discounts</div>
                          <div className="text-slate-600">{discount.times_used ?? 0}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* EMPTY STRUCTURE */
                  <div className="min-h-[120px] flex items-center justify-center text-sm text-slate-400">
                    {loading ? "Loading discounts..." : "No discounts found"}
                  </div>
                )}
              </div>

              {/* PAGINATION CONTROLS */}
              {displayedDiscounts.length > pageSize && (
                <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 bg-white text-xs text-slate-600">
                  <span>
                    {pageStart + 1}–{Math.min(pageStart + pageSize, displayedDiscounts.length)} of{" "}
                    {displayedDiscounts.length} discounts
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-ink hover:bg-slate-50 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-ink hover:bg-slate-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* LEARN MORE */}
            <div className="pt-8 text-center">
              <button type="button" className="text-sm font-medium text-ink hover:underline">
                Learn more about discounts
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* CREATE DISCOUNT TYPE SELECTION MODAL */}
      <SelectDiscountTypeModal isOpen={isTypeModalOpen} onClose={() => setIsTypeModalOpen(false)} />

      {/* EXPORT DISCOUNTS MODAL */}
      <ExportDiscountsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        discounts={discounts}
        paginatedDiscounts={paginatedDiscounts}
        filteredDiscounts={filteredDiscounts}
        selectedIds={selectedIds}
        searchQuery={searchQuery}
      />

      {/* CONFIRM BULK DELETE MODAL */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title={`Delete ${selectedIds.size} discount${selectedIds.size > 1 ? "s" : ""}?`}
        message={`Are you sure you want to delete ${selectedIds.size} discount${
          selectedIds.size > 1 ? "s" : ""
        }? This action cannot be undone.`}
        confirmText="Delete discounts"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isBulkLoading}
      />

      {/* ADD / REMOVE TAGS MODAL */}
      {tagModalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setTagModalMode(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-ink">
                {tagModalMode === "add" ? "Add tags" : "Remove tags"}
              </h3>
              <button
                type="button"
                onClick={() => setTagModalMode(null)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-slate-600">
              {tagModalMode === "add"
                ? `Add tags to ${selectedIds.size} selected discount${selectedIds.size > 1 ? "s" : ""}.`
                : `Remove tags from ${selectedIds.size} selected discount${selectedIds.size > 1 ? "s" : ""}.`}
            </p>

            <form onSubmit={handleTagModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tags</label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="e.g. summer, vip, sale (comma separated)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTagModalMode(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black transition cursor-pointer"
                >
                  {tagModalMode === "add" ? "Save" : "Remove"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-xl flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
