import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader, NavIcon, PageIcon } from "@/components/AdminSidebar";
import ExportDraftOrdersModal from "@/components/ExportDraftOrdersModal";
import { apiGet } from "@/lib/api";
import { useCan } from "@/lib/auth";

function formatDraftDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const monthName = date.toLocaleDateString("en-US", { month: "short" });
  const dayNum = date.getDate();
  const timeStr = date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();

  return `${monthName} ${dayNum} at ${timeStr}`;
}

function renderDraftStatusBadge(status) {
  const s = (status || "open").toLowerCase();

  if (s === "completed" || s === "closed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E9EEF5] text-[#161C2C]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#161C2C]" />
        Completed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFFBEA] text-[#8C6B00] border border-[#FDE68A]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
      Open
    </span>
  );
}

export default function AdminDrafts() {
  // The create page needs orders.manage; a draft also needs draft_orders.manage
  const canCreateOrder = useCan("orders.manage");
  const canCreateDraft = useCan("draft_orders.manage") && canCreateOrder;
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Export modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    async function fetchDrafts() {
      setLoading(true);
      const res = await apiGet("/api/v1/orders/drafts/");
      if (res.ok && Array.isArray(res.data)) {
        setDrafts(res.data);
      } else if (res.ok && Array.isArray(res.data?.results)) {
        setDrafts(res.data.results);
      } else {
        setDrafts([]);
      }
      setLoading(false);
    }
    fetchDrafts();
  }, []);

  const filteredDrafts = drafts.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const num = (d.draft_number || "").toLowerCase();
    const po = (d.po_number || "").toLowerCase();
    const customer = (d.customer_name || "").toLowerCase();
    const status = (d.status || "").toLowerCase();

    return (
      num.includes(q) ||
      po.includes(q) ||
      customer.includes(q) ||
      status.includes(q)
    );
  });

  // Reset pagination on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredDrafts.length / pageSize) || 1;
  const paginatedDrafts = filteredDrafts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const allSelected =
    paginatedDrafts.length > 0 &&
    paginatedDrafts.every((d) => selectedIds.has(d.id));

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedDrafts.forEach((d) => next.add(d.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedDrafts.forEach((d) => next.delete(d.id));
        return next;
      });
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#161C2C]">
      <AdminHeader />

      {/* 2. BODY LAYOUT */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN DRAFTS CONTENT */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-full overflow-x-hidden">
          {/* TITLE & ACTION BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#161C2C]">
              <PageIcon name="orders" />
              Drafts
            </h1>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-white border border-[#D8DFE8] px-4 py-2 text-sm font-medium text-[#161C2C] hover:bg-[#F3F6FA] transition cursor-pointer"
              >
                Export
              </button>

              {canCreateOrder && (
                <Link
                  to="/admin/online-store/orders/create"
                  className="flex items-center gap-2 rounded-lg bg-[#161C2C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#252E45] transition"
                >
                  Create order
                </Link>
              )}
            </div>
          </div>

          {/* DRAFTS TABLE CARD */}
          <section className="rounded-2xl border border-[#E3E7ED] bg-white shadow-sm overflow-hidden">
            {/* TABS & SEARCH BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E7ED] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg bg-[#EEF1F6] px-3.5 py-1.5 text-sm font-medium text-[#161C2C]"
                >
                  <span>All</span>
                  <span className="text-xs text-slate-500">↕</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-full sm:w-64 md:w-80 h-9 rounded-lg border border-[#D8DFE8] bg-white px-3 text-sm">
                  <span className="text-slate-400">⌕</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search and filter"
                    className="w-full bg-transparent outline-none text-xs sm:text-sm text-[#161C2C] placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  title="Table columns"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8DFE8] bg-white text-slate-600 hover:bg-[#F3F6FA] transition shrink-0"
                >
                  ▥
                </button>
              </div>
            </div>

            {/* RESPONSIVE TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-[#161C2C]">
                <thead>
                  <tr className="border-b border-[#E3E7ED] bg-[#FAFBFD] text-xs font-semibold text-slate-700 whitespace-nowrap select-none">
                    <th className="py-3.5 pl-5 pr-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 accent-[#161C2C] cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 cursor-pointer">
                        Draft order <span className="text-[10px]">↑</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3">PO number</th>
                    <th className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 cursor-pointer">
                        Date <span>↓</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3">Customer</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                    <th className="py-3.5 pl-3 pr-6 text-right">Total</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E3E7ED]">
                  {loading ? (
                    // SKELETON
                    [...Array(4)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 pl-5 pr-3">
                          <div className="h-4 w-4 bg-slate-200 rounded" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-16 bg-slate-200 rounded" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-12 bg-slate-100 rounded" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-28 bg-slate-200 rounded" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-36 bg-slate-200 rounded" />
                        </td>
                        <td className="py-4 px-3 text-center">
                          <div className="h-5 w-20 bg-slate-200 rounded-full mx-auto" />
                        </td>
                        <td className="py-4 pl-3 pr-6 text-right">
                          <div className="h-4 w-16 bg-slate-200 rounded ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedDrafts.length > 0 ? (
                    paginatedDrafts.map((d) => {
                      const isSelected = selectedIds.has(d.id);
                      const curr = d.currency_code || "AUD";

                      return (
                        <tr
                          key={d.id}
                          className={`transition-colors whitespace-nowrap hover:bg-[#F9FAFC] ${
                            isSelected ? "bg-[#F3F6FA]" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 pl-5 pr-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(d.id)}
                              className="h-4 w-4 rounded border-slate-300 accent-[#161C2C] cursor-pointer"
                            />
                          </td>

                          {/* Draft number */}
                          <td className="py-3.5 px-3 font-semibold text-[#161C2C]">
                            <span className="hover:underline cursor-pointer">
                              {d.draft_number || `#D${d.id?.slice(0, 4)}`}
                            </span>
                          </td>

                          {/* PO number */}
                          <td className="py-3.5 px-3 text-slate-500 text-xs">
                            {d.po_number || "—"}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-3 text-slate-600 text-xs sm:text-sm">
                            {formatDraftDate(d.created_at)}
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-3 text-slate-800 font-medium">
                            {d.customer_name || "—"}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 text-center">
                            {renderDraftStatusBadge(d.status)}
                          </td>

                          {/* Total */}
                          <td className="py-3.5 pl-3 pr-6 text-right font-medium text-[#161C2C]">
                            ${parseFloat(d.total || 0).toFixed(2)} {curr}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <NavIcon name="orders" className="h-8 w-8 text-slate-300" />
                          <p className="text-sm font-medium text-slate-700">
                            No draft orders found
                          </p>
                          <p className="text-xs text-slate-400 max-w-sm">
                            {searchQuery
                              ? `No draft orders matching "${searchQuery}".`
                              : "Draft orders created manually or as quotes will appear here."}
                          </p>
                          {canCreateDraft && (
                            <Link
                              to="/admin/online-store/orders/create"
                              className="mt-3 px-4 py-2 rounded-lg bg-[#161C2C] text-white text-xs font-semibold hover:bg-slate-800 transition"
                            >
                              Create draft order
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* TABLE PAGINATION FOOTER */}
            {filteredDrafts.length > 0 && (
              <div className="flex items-center justify-between gap-4 border-t border-[#E3E7ED] px-4 py-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    aria-label="Previous page"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#D8DFE8] bg-white text-slate-600 hover:bg-[#F3F6FA] disabled:pointer-events-none disabled:opacity-40"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    aria-label="Next page"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#D8DFE8] bg-white text-slate-600 hover:bg-[#F3F6FA] disabled:pointer-events-none disabled:opacity-40"
                  >
                    ›
                  </button>
                  <span className="min-w-[48px] text-center tabular-nums text-slate-700">
                    {`${(currentPage - 1) * pageSize + 1}-${Math.min(
                      currentPage * pageSize,
                      filteredDrafts.length
                    )}`}
                  </span>
                </div>
                <span className="tabular-nums">Total {filteredDrafts.length} draft orders</span>
              </div>
            )}
          </section>

          {/* LEARN MORE FOOTER */}
          <p className="mt-8 text-center text-sm font-medium text-[#161C2C]">
            <a href="#" className="hover:underline text-slate-700 hover:text-slate-900">
              Learn more about creating draft orders
            </a>
          </p>
        </main>
      </div>

      {/* EXPORT DRAFT ORDERS MODAL */}
      <ExportDraftOrdersModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        drafts={drafts}
        paginatedDrafts={paginatedDrafts}
        filteredDrafts={filteredDrafts}
        selectedIds={selectedIds}
        searchQuery={searchQuery}
      />
    </div>
  );
}
