"use client";

import { useEffect, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import SelectDiscountTypeModal from "@/components/SelectDiscountTypeModal";
import ExportDiscountsModal from "@/components/ExportDiscountsModal";
import { apiGet } from "@/lib/api";
import { useCan } from "@/lib/auth";

export default function DiscountsPage() {
  const canManage = useCan("discounts.manage");
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [discounts, setDiscounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 50;

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

  const filteredDiscounts = discounts.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const codes = Array.isArray(d.codes) ? d.codes.join(" ") : "";
    return (
      (d.name && d.name.toLowerCase().includes(q)) ||
      codes.toLowerCase().includes(q) ||
      (d.discount_type && d.discount_type.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredDiscounts.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedDiscounts = filteredDiscounts.slice(pageStart, pageStart + pageSize);

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

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
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
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* SEARCH / FILTER BAR */}
              <div className="flex h-14 items-center border-b border-slate-200">
                <button
                  type="button"
                  className="flex h-full items-center gap-2 px-5 text-sm font-medium text-ink"
                >
                  All
                  <span>⌃</span>
                </button>

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

              <div className="overflow-x-auto">
                <div className="min-w-[1180px]">
                  {/* TABLE HEADER */}
                  <div className="grid grid-cols-[34px_minmax(220px,2fr)_150px_150px_170px_190px_190px_70px] items-center border-b border-slate-200 bg-brand-cream-100 px-4 py-3 text-sm font-medium text-slate-700">
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

                  {/* TABLE BODY */}
                  {paginatedDiscounts.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {paginatedDiscounts.map((discount) => {
                        const codeDisplay =
                          Array.isArray(discount.codes) && discount.codes.length > 0
                            ? discount.codes.join(", ")
                            : discount.name || "Untitled discount";
                        const isCode = Array.isArray(discount.codes) && discount.codes.length > 0;
                        const isActive = discount.is_active !== false;
                        const isSelected = selectedIds.has(discount.id);

                        return (
                          <div
                            key={discount.id}
                            className={`grid grid-cols-[34px_minmax(220px,2fr)_150px_150px_170px_190px_190px_70px] items-center px-4 py-3 text-sm transition ${
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
                            <div className="font-medium text-ink truncate pr-2">{codeDisplay}</div>
                            <div>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  isActive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {isActive ? "Active" : "Expired"}
                              </span>
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
                      {loading ? "Loading discounts..." : "No discounts yet"}
                    </div>
                  )}
                </div>
              </div>

              {/* PAGINATION CONTROLS */}
              {filteredDiscounts.length > pageSize && (
                <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 bg-white text-xs text-slate-600">
                  <span>
                    {pageStart + 1}–{Math.min(pageStart + pageSize, filteredDiscounts.length)} of{" "}
                    {filteredDiscounts.length} discounts
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
    </div>
  );
}
