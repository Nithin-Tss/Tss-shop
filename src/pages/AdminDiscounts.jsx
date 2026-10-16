"use client";

import { useEffect, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import SelectDiscountTypeModal from "@/components/SelectDiscountTypeModal";
import { apiGet } from "@/lib/api";
import { useCan } from "@/lib/auth";

export default function DiscountsPage() {
  const canManage = useCan("discounts.manage");
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [discounts, setDiscounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#F5F3FF]">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />

        <main className="min-w-0 flex-1">
          {/* HEADER */}
          <header className="flex items-center justify-between border-b border-slate-200 bg-[#F5F3FF] px-6 py-5">
            <div className="flex items-center gap-2.5 text-[#0B1020]">
              <PageIcon name="discounts" />

              <h1 className="text-xl font-semibold text-[#0B1020]">Discounts</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg bg-[#E5E5E5] px-4 py-2 text-sm font-medium text-[#0B1020] hover:bg-[#D9D9D9] transition"
              >
                ⇧ Export
              </button>

              {canManage && (
                <button
                  type="button"
                  id="create-discount-button"
                  onClick={() => setIsTypeModalOpen(true)}
                  className="rounded-lg bg-[#0B1020] px-4 py-2 text-sm font-semibold text-white hover:bg-black transition cursor-pointer"
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
                  className="flex h-full items-center gap-2 px-5 text-sm font-medium text-[#0B1020]"
                >
                  All
                  <span>⌃</span>
                </button>

                <div className="flex flex-1 items-center gap-3 px-4">
                  <span className="text-xl text-slate-500">⌕</span>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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

              {/* TABLE HEADER */}
              <div className="grid grid-cols-[34px_minmax(220px,2fr)_150px_150px_170px_190px_190px_70px] items-center border-b border-slate-200 bg-[#FAFAFA] px-4 py-3 text-sm font-medium text-slate-700">
                <div>
                  <input type="checkbox" className="h-4 w-4" />
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
              {filteredDiscounts.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {filteredDiscounts.map((discount) => {
                    const codeDisplay =
                      Array.isArray(discount.codes) && discount.codes.length > 0
                        ? discount.codes.join(", ")
                        : discount.name || "Untitled discount";
                    const isCode = Array.isArray(discount.codes) && discount.codes.length > 0;
                    const isActive = discount.is_active !== false;

                    return (
                      <div
                        key={discount.id}
                        className="grid grid-cols-[34px_minmax(220px,2fr)_150px_150px_170px_190px_190px_70px] items-center px-4 py-3 text-sm text-slate-800 hover:bg-slate-50 transition"
                      >
                        <div>
                          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                        </div>
                        <div className="font-medium text-[#0B1020] truncate pr-2">
                          {codeDisplay}
                        </div>
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
            </section>

            {/* LEARN MORE */}
            <div className="pt-8 text-center">
              <button type="button" className="text-sm font-medium text-[#0B1020] hover:underline">
                Learn more about discounts
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* CREATE DISCOUNT TYPE SELECTION MODAL */}
      <SelectDiscountTypeModal isOpen={isTypeModalOpen} onClose={() => setIsTypeModalOpen(false)} />
    </div>
  );
}
