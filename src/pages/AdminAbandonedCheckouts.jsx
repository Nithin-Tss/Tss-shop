import { useEffect, useState } from "react";
import AdminSidebar, { AdminHeader, NavIcon, PageIcon } from "@/components/AdminSidebar";
import { apiGet } from "@/lib/api";

const RECOVERY_STYLES = {
  pending: "bg-[#FFFBEA] text-[#8C6B00] border border-[#FDE68A]",
  recovered: "bg-[#E9F7EF] text-[#16653A] border border-[#BBE5CC]",
};

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
  return `${day} at ${time}`;
}

function RecoveryBadge({ status }) {
  const key = (status || "pending").toLowerCase();
  const style = RECOVERY_STYLES[key] || "bg-[#E9EEF5] text-[#0B1020]";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {key.replace(/_/g, " ")}
    </span>
  );
}

export default function AdminAbandonedCheckouts() {
  const [checkouts, setCheckouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await apiGet("/api/v1/checkouts/?abandoned=true");
      if (res.ok) {
        setError("");
        setCheckouts(Array.isArray(res.data) ? res.data : res.data?.results || []);
      } else {
        setError(res.error);
        setCheckouts([]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = checkouts.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.email || "").toLowerCase().includes(q) ||
      (c.recovery_status || "").toLowerCase().includes(q) ||
      (c.items || []).some((i) => (i.product_name || "").toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const page = Math.min(currentPage, totalPages);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen bg-[#F5F3FF] text-charcoal-navy">
      <AdminHeader />
      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-full overflow-x-hidden">
          <h1 className="mb-5 flex items-center gap-2.5 text-[22px] font-bold">
            <PageIcon name="orders" />
            Abandoned checkouts
          </h1>

          <section className="rounded-2xl border border-[#E4DEFB] bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-end border-b border-[#E4DEFB] px-4 py-2.5">
              <div className="flex items-center gap-2 w-full sm:w-64 md:w-80 h-9 rounded-lg border border-[#DDD6FE] bg-white px-3 text-sm">
                <span className="text-slate-400">⌕</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search email, product or status"
                  className="w-full bg-transparent outline-none text-xs sm:text-sm placeholder:text-slate-400"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="border-b border-[#E4DEFB] px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E4DEFB] bg-[#FAF8FF] text-xs font-semibold text-slate-700 whitespace-nowrap">
                    <th className="py-3.5 pl-5 pr-3">Abandoned</th>
                    <th className="py-3.5 px-3">Customer</th>
                    <th className="py-3.5 px-3">Items</th>
                    <th className="py-3.5 px-3 text-center">Recovery</th>
                    <th className="py-3.5 pl-3 pr-6 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DEFB]">
                  {loading ? (
                    [...Array(4)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {[...Array(5)].map((__, j) => (
                          <td key={j} className="py-4 px-3">
                            <div className="h-4 w-24 bg-slate-200 rounded" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : rows.length > 0 ? (
                    rows.map((c) => {
                      const items = c.items || [];
                      const count = items.reduce((n, i) => n + (i.quantity || 0), 0);
                      return (
                        <tr key={c.id} className="whitespace-nowrap hover:bg-[#F9FAFC]">
                          <td className="py-3.5 pl-5 pr-3 text-slate-600">
                            {formatDate(c.abandoned_at)}
                          </td>
                          <td className="py-3.5 px-3 font-medium text-slate-800">
                            {c.email || "No email"}
                          </td>
                          <td
                            className="py-3.5 px-3 text-slate-600"
                            title={items.map((i) => `${i.quantity} × ${i.product_name}`).join("\n")}
                          >
                            {count} {count === 1 ? "item" : "items"}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <RecoveryBadge status={c.recovery_status} />
                          </td>
                          <td className="py-3.5 pl-3 pr-6 text-right font-medium">
                            {Number(c.total_amount || 0).toFixed(2)} {c.currency}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center space-y-2">
                          <NavIcon name="orders" className="h-8 w-8 text-slate-300" />
                          <p className="text-sm font-medium text-slate-700">
                            No abandoned checkouts
                          </p>
                          <p className="text-xs text-slate-400 max-w-sm">
                            {searchQuery
                              ? `Nothing matching "${searchQuery}".`
                              : "Checkouts that shoppers start but don't finish will appear here."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <div className="flex items-center justify-between gap-4 border-t border-[#E4DEFB] px-4 py-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setCurrentPage(page - 1)}
                    aria-label="Previous page"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#DDD6FE] bg-white text-slate-600 hover:bg-[#F3F0FF] disabled:pointer-events-none disabled:opacity-40"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setCurrentPage(page + 1)}
                    aria-label="Next page"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#DDD6FE] bg-white text-slate-600 hover:bg-[#F3F0FF] disabled:pointer-events-none disabled:opacity-40"
                  >
                    ›
                  </button>
                  <span className="min-w-12 text-center tabular-nums text-slate-700">
                    {`${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filtered.length)}`}
                  </span>
                </div>
                <span className="tabular-nums">Total {filtered.length} abandoned checkouts</span>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
