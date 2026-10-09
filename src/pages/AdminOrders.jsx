import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { apiGet } from "@/lib/api";

function formatOrderDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  const timeStr = date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();

  if (diffDays === 0) {
    return `Today at ${timeStr}`;
  } else if (diffDays === 1) {
    return `Yesterday at ${timeStr}`;
  } else if (diffDays < 7) {
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    return `${dayName} at ${timeStr}`;
  } else {
    const monthName = date.toLocaleDateString("en-US", { month: "short" });
    const dayNum = date.getDate();
    return `${monthName} ${dayNum} at ${timeStr}`;
  }
}

function renderPaymentStatusBadge(status) {
  const s = (status || "paid").toLowerCase();

  if (s.includes("pending") || s === "open" || s === "payment pending") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFF4E5] text-[#B76E00] border border-[#FFE2B8]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B76E00]" />
        Payment pending
      </span>
    );
  }

  if (s.includes("refund") || s === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E9EEF5] text-[#161C2C]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#161C2C]" />
      Paid
    </span>
  );
}

function renderFulfillmentStatusBadge(status) {
  const s = (status || "unfulfilled").toLowerCase();

  if (s.includes("unfulfilled") || s === "open") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFFBEA] text-[#8C6B00] border border-[#FDE68A]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
        Unfulfilled
      </span>
    );
  }

  if (s.includes("partial")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF3E2] text-[#9A4B00] border border-[#FCD399]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C25E00]" />
        Partially fulfilled
      </span>
    );
  }

  if (s.includes("fulfilled") || s === "closed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E9EEF5] text-[#161C2C]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#161C2C]" />
        Fulfilled
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      {status}
    </span>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      const res = await apiGet("/api/v1/orders/");
      if (res.ok && Array.isArray(res.data)) {
        setOrders(res.data);
      } else if (res.ok && Array.isArray(res.data?.results)) {
        setOrders(res.data.results);
      } else {
        setOrders([]);
      }
      setLoading(false);
    }
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const orderNum = (order.order_number || "").toLowerCase();
    const customer = (order.customer_name || "").toLowerCase();
    const channel = (order.channel || "Online Store").toLowerCase();
    const method = (order.delivery_method || "").toLowerCase();
    const tags = Array.isArray(order.tags) ? order.tags.join(" ").toLowerCase() : "";

    return (
      orderNum.includes(query) ||
      customer.includes(query) ||
      channel.includes(query) ||
      method.includes(query) ||
      tags.includes(query)
    );
  });

  const allSelected =
    filteredOrders.length > 0 && selectedIds.size === filteredOrders.length;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    } else {
      setSelectedIds(new Set());
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

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-full overflow-x-hidden">
          {/* TITLE & ACTION BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#161C2C]">
              <span className="text-xl">▣</span>
              Orders
            </h1>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg bg-white border border-[#D8DFE8] px-4 py-2 text-sm font-medium text-[#161C2C] hover:bg-[#F3F6FA] transition"
              >
                Export
              </button>

              <button
                type="button"
                className="flex items-center gap-2 rounded-lg bg-white border border-[#D8DFE8] px-4 py-2 text-sm font-medium text-[#161C2C] hover:bg-[#F3F6FA] transition"
              >
                More actions
                <span className="text-xs">⌄</span>
              </button>

              <Link
                to="/admin/online-store/orders/create"
                className="flex items-center gap-2 rounded-lg bg-[#161C2C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#252E45] transition"
              >
                Create order
              </Link>
            </div>
          </div>

          {/* ORDERS TABLE CARD */}
          <section className="rounded-2xl border border-[#E3E7ED] bg-white shadow-sm overflow-hidden">
            {/* TABS & SEARCH / FILTER HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E7ED] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-[#EEF1F6] px-3.5 py-1.5 text-sm font-medium text-[#161C2C]"
                >
                  All
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Search & Filter Input */}
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

                {/* View / Column Options Button */}
                <button
                  type="button"
                  title="Table columns"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8DFE8] bg-white text-slate-600 hover:bg-[#F3F6FA] transition"
                >
                  ▥
                </button>
              </div>
            </div>

            {/* SECONDARY HEADER */}
            <div className="px-5 py-3 border-b border-[#E3E7ED] bg-white flex items-center justify-between">
              <span className="text-sm font-semibold text-[#161C2C]">Orders</span>
              {selectedIds.size > 0 && (
                <span className="text-xs font-medium text-slate-500">
                  {selectedIds.size} selected
                </span>
              )}
            </div>

            {/* RESPONSIVE TABLE WITH HORIZONTAL SCROLL */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-[#161C2C]">
                <thead>
                  <tr className="border-b border-[#E3E7ED] bg-[#FAFBFD] text-xs font-medium text-slate-600 whitespace-nowrap select-none">
                    <th className="py-3.5 pl-5 pr-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 accent-[#161C2C] cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-slate-700">Order</th>
                    <th className="py-3.5 px-3 font-semibold text-slate-700">
                      <span className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900">
                        Date <span>↓</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-slate-700">Customer</th>
                    <th className="py-3.5 px-3 font-semibold text-slate-700">Fulfill by</th>
                    <th className="py-3.5 px-3 font-semibold text-slate-700">Channel</th>
                    <th className="py-3.5 px-3 font-semibold text-slate-700 text-right">Total</th>
                    <th className="py-3.5 px-3 font-semibold text-slate-700 text-center">
                      Payment status
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-slate-700 text-center">
                      Fulfillment status
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-slate-700">Items</th>
                    <th className="py-3.5 px-3 font-semibold text-slate-700">Delivery status</th>
                    <th className="py-3.5 px-3 font-semibold text-slate-700">Delivery method</th>
                    <th className="py-3.5 pl-3 pr-6 font-semibold text-slate-700">Tags</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E3E7ED]">
                  {loading ? (
                    // LOADING SKELETON ROWS
                    [...Array(6)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 pl-5 pr-3">
                          <div className="h-4 w-4 bg-slate-200 rounded" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-16 bg-slate-200 rounded" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-28 bg-slate-200 rounded" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-24 bg-slate-200 rounded" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-12 bg-slate-100 rounded" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-20 bg-slate-200 rounded" />
                        </td>
                        <td className="py-4 px-3 text-right">
                          <div className="h-4 w-14 bg-slate-200 rounded ml-auto" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-5 w-16 bg-slate-200 rounded-full mx-auto" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-5 w-20 bg-slate-200 rounded-full mx-auto" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-14 bg-slate-200 rounded" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-16 bg-slate-100 rounded" />
                        </td>
                        <td className="py-4 px-3">
                          <div className="h-4 w-28 bg-slate-200 rounded" />
                        </td>
                        <td className="py-4 pl-3 pr-6">
                          <div className="h-5 w-24 bg-slate-100 rounded-md" />
                        </td>
                      </tr>
                    ))
                  ) : filteredOrders.length > 0 ? (
                    // DYNAMIC ORDERS DATA
                    filteredOrders.map((order) => {
                      const isSelected = selectedIds.has(order.id);
                      const itemsCount =
                        order.items_count ||
                        (Array.isArray(order.items)
                          ? order.items.reduce(
                              (sum, item) => sum + (item.quantity || 1),
                              0
                            )
                          : 0);

                      const tagsList = Array.isArray(order.tags)
                        ? order.tags
                        : typeof order.tags === "string" && order.tags.trim()
                        ? order.tags.split(",").map((t) => t.trim())
                        : [];

                      return (
                        <tr
                          key={order.id}
                          className={`transition-colors whitespace-nowrap hover:bg-[#F9FAFC] ${
                            isSelected ? "bg-[#F3F6FA]" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 pl-5 pr-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(order.id)}
                              className="h-4 w-4 rounded border-slate-300 accent-[#161C2C] cursor-pointer"
                            />
                          </td>

                          {/* Order Number */}
                          <td className="py-3.5 px-3 font-semibold text-[#161C2C]">
                            <Link
                              to={`/admin/online-store/orders/${order.id}`}
                              className="hover:underline text-[#161C2C]"
                            >
                              {order.order_number || `#${order.id?.slice(0, 6)}`}
                            </Link>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-3 text-slate-600 text-xs sm:text-sm">
                            {formatOrderDate(order.created_at)}
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-3">
                            <span className="font-medium text-slate-800">
                              {order.customer_name || "—"}
                            </span>
                          </td>

                          {/* Fulfill by */}
                          <td className="py-3.5 px-3 text-slate-500 text-xs">
                            {order.fulfill_by ? formatOrderDate(order.fulfill_by) : "—"}
                          </td>

                          {/* Channel */}
                          <td className="py-3.5 px-3 text-slate-700">
                            {order.channel || "Online Store"}
                          </td>

                          {/* Total */}
                          <td className="py-3.5 px-3 text-right font-medium text-[#161C2C]">
                            ${parseFloat(order.total || 0).toFixed(2)}
                          </td>

                          {/* Payment status */}
                          <td className="py-3.5 px-3 text-center">
                            {renderPaymentStatusBadge(order.status)}
                          </td>

                          {/* Fulfillment status */}
                          <td className="py-3.5 px-3 text-center">
                            {renderFulfillmentStatusBadge(order.fulfillment_status)}
                          </td>

                          {/* Items */}
                          <td className="py-3.5 px-3 text-slate-700">
                            <span className="inline-flex items-center gap-1">
                              {itemsCount} {itemsCount === 1 ? "item" : "items"}
                            </span>
                          </td>

                          {/* Delivery status */}
                          <td className="py-3.5 px-3 text-slate-600 text-xs">
                            {order.delivery_status || "—"}
                          </td>

                          {/* Delivery method */}
                          <td className="py-3.5 px-3 text-slate-700 max-w-[200px] truncate" title={order.delivery_method || "—"}>
                            {order.delivery_method || "—"}
                          </td>

                          {/* Tags */}
                          <td className="py-3.5 pl-3 pr-6">
                            {tagsList.length > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#EEF2F6] text-[11px] font-mono text-slate-700 max-w-[170px] truncate border border-slate-200">
                                  {tagsList[0]}
                                </span>
                                {tagsList.length > 1 && (
                                  <span className="text-xs text-slate-500 font-medium">
                                    + {tagsList.length - 1}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    // EMPTY ORDERS ROW (MATCHING STRUCTURE)
                    <tr>
                      <td colSpan={13} className="py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <span className="text-3xl text-slate-300">▣</span>
                          <p className="text-sm font-medium text-slate-700">
                            No orders found
                          </p>
                          <p className="text-xs text-slate-400 max-w-sm">
                            {searchQuery
                              ? `No orders matching "${searchQuery}".`
                              : "Orders placed by customers or created manually will appear here."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* LEARN MORE */}
          <p className="mt-8 text-center text-sm font-medium text-[#161C2C]">
            <a href="#" className="hover:underline text-slate-700 hover:text-slate-900">
              Learn more about orders
            </a>
          </p>
        </main>
      </div>
    </div>
  );
}
