import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminSidebar, { AdminHeader, NavIcon, PageIcon } from "@/components/AdminSidebar";
import { apiGet, apiPost } from "@/lib/api";
import { useCan, useSession } from "@/lib/auth";

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

function formatOrderCurrency(amount, currencyCode = "INR") {
  const num = typeof amount === "number" ? amount : parseFloat(amount || 0);
  if (isNaN(num)) return `${amount || "0.00"} ${currencyCode || ""}`;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode || "INR",
    }).format(num);
  } catch {
    return `${currencyCode || ""} ${num.toFixed(2)}`;
  }
}

function renderPaymentStatusBadge(status) {
  const s = (status || "pending").toLowerCase();

  if (s.includes("pending")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFF4E5] text-[#B76E00] border border-[#FFE2B8]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B76E00]" />
        Payment pending
      </span>
    );
  }

  if (s === "partially_paid") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF3E2] text-[#9A4B00] border border-[#FCD399]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C25E00]" />
        Partially paid
      </span>
    );
  }

  if (s === "partially_refunded" || s === "refunded") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
        {s === "refunded" ? "Refunded" : "Partially refunded"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E9EEF5] text-charcoal-navy">
      <span className="w-1.5 h-1.5 rounded-full bg-charcoal-navy" />
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
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E9EEF5] text-charcoal-navy">
        <span className="w-1.5 h-1.5 rounded-full bg-charcoal-navy" />
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
  const { id: routeOrderId } = useParams();
  const navigate = useNavigate();
  const canCreate = useCan("orders.manage");
  const session = useSession();
  const storeId = session?.storeId;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortDirection, setSortDirection] = useState("desc");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [pickedOrder, setSelectedOrder] = useState(null);
  const [prevStoreId, setPrevStoreId] = useState(storeId);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [actionError, setActionError] = useState("");

  // The order opened by URL wins; otherwise the one picked from the list
  const selectedOrder = (routeOrderId && orders.find((o) => o.id === routeOrderId)) || pickedOrder;

  // Switching store clears the previous store's data (adjusted during render, not in an effect)
  if (prevStoreId !== storeId) {
    setPrevStoreId(storeId);
    setOrders([]);
    setSelectedIds(new Set());
    setSelectedOrder(null);
    setLoading(true);
    setError(null);
  }

  const moreMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setIsMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchOrders = useCallback(async (opts = {}) => {
    const isSilent = opts.silent || false;
    // `loading` starts true and is set again when the store changes, so nothing is set before the request
    try {
      const res = await apiGet("/api/v1/orders/");
      if (res.ok) {
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.results)
            ? res.data.results
            : [];
        setOrders(list);
        if (!isSilent) setError(null);
      } else {
        if (!isSilent) {
          setError(res.error || "Failed to load orders. Please try again.");
          setOrders([]);
        }
      }
    } catch {
      if (!isSilent) {
        setError("Failed to load orders. Please try again.");
        setOrders([]);
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Initial load: state is only set after the request resolves
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders({ silent: false });

    // Lightweight automatic polling to fetch newly placed storefront orders in real time
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchOrders({ silent: true });
      }
    }, 4000);

    const handleRefresh = () => {
      fetchOrders({ silent: true });
    };

    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);
    window.addEventListener("vendra_order_placed", handleRefresh);
    window.addEventListener("storage", handleRefresh);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
      window.removeEventListener("vendra_order_placed", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
    };
  }, [storeId, fetchOrders]);

  const handleCancelOrder = async (orderId) => {
    if (!orderId) return;
    setCancellingOrder(true);
    setActionMsg("");
    setActionError("");
    const res = await apiPost(`/api/v1/orders/${orderId}/cancel/`, {});
    setCancellingOrder(false);
    if (res.ok) {
      setActionMsg("Order cancelled successfully.");
      if (res.data) {
        setSelectedOrder(res.data);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? res.data : o)));
      } else {
        fetchOrders();
      }
    } else {
      setActionError(res.error || res.formError || "Failed to cancel order.");
    }
  };

  const handleExport = () => {
    const listToExport =
      selectedIds.size > 0 ? orders.filter((o) => selectedIds.has(o.id)) : filteredOrders;

    if (listToExport.length === 0) return;

    const headers = [
      "Order Number",
      "Date",
      "Customer",
      "Fulfill By",
      "Channel",
      "Total",
      "Currency",
      "Payment Status",
      "Fulfillment Status",
      "Items Count",
      "Delivery Status",
      "Delivery Method",
      "Tags",
    ];

    const rows = listToExport.map((o) => [
      o.order_number || o.id,
      o.created_at || "",
      o.customer_name || "",
      o.fulfill_by || "",
      o.channel || "Online Store",
      o.total || "0.00",
      o.currency_code || "INR",
      o.payment_status || "pending",
      o.fulfillment_status || "unfulfilled",
      o.items_count || (Array.isArray(o.items) ? o.items.length : 0),
      o.delivery_status || "",
      o.delivery_method || "",
      Array.isArray(o.tags) ? o.tags.join("; ") : o.tags || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = orders
    .filter((order) => {
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
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
    });

  const allSelected = filteredOrders.length > 0 && selectedIds.size === filteredOrders.length;

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
    <div className="min-h-screen bg-[#F5F3FF] text-charcoal-navy">
      <AdminHeader />

      {/* 2. BODY LAYOUT */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT AREA */}
        <main className="min-w-0 flex-1 px-4 sm:px-8 py-6 max-w-full overflow-x-hidden">
          {/* TITLE & ACTION BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-charcoal-navy">
              <PageIcon name="orders" />
              Orders
            </h1>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg bg-white border border-[#DDD6FE] px-4 py-2 text-sm font-medium text-charcoal-navy hover:bg-[#F3F0FF] transition cursor-pointer"
              >
                Export
              </button>

              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-lg bg-white border border-[#DDD6FE] px-4 py-2 text-sm font-medium text-charcoal-navy hover:bg-[#F3F0FF] transition cursor-pointer"
                >
                  More actions
                  <span className="text-xs">⌄</span>
                </button>
                {isMoreMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-[#DDD6FE] bg-white py-1.5 shadow-lg z-20">
                    <Link
                      to="/admin/online-store/orders/drafts"
                      className="block px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-[#F3F0FF] transition"
                      onClick={() => setIsMoreMenuOpen(false)}
                    >
                      Draft orders
                    </Link>
                    <Link
                      to="/admin/online-store/orders/abandoned-checkouts"
                      className="block px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-[#F3F0FF] transition"
                      onClick={() => setIsMoreMenuOpen(false)}
                    >
                      Abandoned checkouts
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        handleExport();
                      }}
                      className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-[#F3F0FF] transition cursor-pointer"
                    >
                      Export CSV
                    </button>
                  </div>
                )}
              </div>

              {canCreate && (
                <Link
                  to="/admin/online-store/orders/create"
                  className="flex items-center gap-2 rounded-lg bg-charcoal-navy px-4 py-2 text-sm font-semibold text-white hover:bg-[#1C2347] transition"
                >
                  Create order
                </Link>
              )}
            </div>
          </div>

          {/* ORDERS TABLE CARD */}
          <section className="rounded-2xl border border-[#E4DEFB] bg-white shadow-sm overflow-hidden">
            {/* TABS & SEARCH / FILTER HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4DEFB] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-[#EDE9FE] px-3.5 py-1.5 text-sm font-medium text-charcoal-navy"
                >
                  All
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Search & Filter Input */}
                <div className="flex items-center gap-2 w-full sm:w-64 md:w-80 h-9 rounded-lg border border-[#DDD6FE] bg-white px-3 text-sm">
                  <span className="text-slate-400">⌕</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search and filter"
                    className="w-full bg-transparent outline-none text-xs sm:text-sm text-charcoal-navy placeholder:text-slate-400"
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDD6FE] bg-white text-slate-600 hover:bg-[#F3F0FF] transition"
                >
                  ▥
                </button>
              </div>
            </div>

            {/* SECONDARY HEADER */}
            <div className="px-5 py-3 border-b border-[#E4DEFB] bg-white flex items-center justify-between">
              <span className="text-sm font-semibold text-charcoal-navy">Orders</span>
              {selectedIds.size > 0 && (
                <span className="text-xs font-medium text-slate-500">
                  {selectedIds.size} selected
                </span>
              )}
            </div>

            {/* RESPONSIVE TABLE WITH HORIZONTAL SCROLL */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-charcoal-navy">
                <thead>
                  <tr className="border-b border-[#E4DEFB] bg-[#FAF8FF] text-xs font-medium text-slate-600 whitespace-nowrap select-none">
                    <th className="py-3.5 pl-5 pr-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 accent-charcoal-navy cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-3 font-semibold text-slate-700">Order</th>
                    <th className="py-3.5 px-3 font-semibold text-slate-700">
                      <button
                        type="button"
                        onClick={() =>
                          setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))
                        }
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900 font-semibold"
                        title={`Sort by date (${sortDirection === "desc" ? "oldest first" : "newest first"})`}
                      >
                        Date <span>{sortDirection === "desc" ? "↓" : "↑"}</span>
                      </button>
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

                <tbody className="divide-y divide-[#E4DEFB]">
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
                  ) : error ? (
                    // ERROR STATE (CLEAR MESSAGE + RETRY)
                    <tr>
                      <td colSpan={13} className="py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-lg">
                            !
                          </div>
                          <p className="text-sm font-semibold text-slate-800">{error}</p>
                          <button
                            type="button"
                            onClick={() => fetchOrders()}
                            className="px-4 py-1.5 rounded-lg bg-charcoal-navy text-white text-xs font-medium hover:bg-[#1C2347] transition shadow-xs cursor-pointer"
                          >
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredOrders.length > 0 ? (
                    // DYNAMIC ORDERS DATA
                    filteredOrders.map((order) => {
                      const isSelected = selectedIds.has(order.id);
                      const itemsCount =
                        order.items_count ||
                        (Array.isArray(order.items)
                          ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
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
                            isSelected ? "bg-[#F3F0FF]" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 pl-5 pr-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(order.id)}
                              className="h-4 w-4 rounded border-slate-300 accent-charcoal-navy cursor-pointer"
                            />
                          </td>

                          {/* Order Number */}
                          <td className="py-3.5 px-3 font-semibold text-charcoal-navy">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrder(order);
                                setActionMsg("");
                                setActionError("");
                              }}
                              className="hover:underline text-charcoal-navy font-semibold text-left cursor-pointer"
                            >
                              {order.order_number || `#${order.id?.slice(0, 6)}`}
                            </button>
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
                          <td className="py-3.5 px-3 text-right font-medium text-charcoal-navy">
                            {formatOrderCurrency(order.total, order.currency_code)}
                          </td>

                          {/* Payment status */}
                          <td className="py-3.5 px-3 text-center">
                            {renderPaymentStatusBadge(order.payment_status)}
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
                          <td
                            className="py-3.5 px-3 text-slate-700 max-w-50 truncate"
                            title={order.delivery_method || "—"}
                          >
                            {order.delivery_method || "—"}
                          </td>

                          {/* Tags */}
                          <td className="py-3.5 pl-3 pr-6">
                            {tagsList.length > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#EEF2F6] text-[11px] font-mono text-slate-700 max-w-42.5 truncate border border-slate-200">
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
                          <NavIcon name="orders" className="h-8 w-8 text-slate-300" />
                          <p className="text-sm font-medium text-slate-700">No orders found</p>
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
          <p className="mt-8 text-center text-sm font-medium text-charcoal-navy">
            <a href="#" className="hover:underline text-slate-700 hover:text-slate-900">
              Learn more about orders
            </a>
          </p>
        </main>
      </div>

      {/* ORDER DETAILS SLIDE-OVER DRAWER */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => {
              setSelectedOrder(null);
              if (routeOrderId) navigate("/admin/online-store/orders");
            }}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-[#E4DEFB] flex items-center justify-between bg-[#FAF8FF]">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-charcoal-navy">
                      Order {selectedOrder.order_number || selectedOrder.id?.slice(0, 8)}
                    </h2>
                    {renderPaymentStatusBadge(selectedOrder.payment_status)}
                    {renderFulfillmentStatusBadge(selectedOrder.fulfillment_status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Placed {formatOrderDate(selectedOrder.created_at)} • via{" "}
                    {selectedOrder.channel || "Online Store"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrder(null);
                    if (routeOrderId) navigate("/admin/online-store/orders");
                  }}
                  className="rounded-lg p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Action Messages */}
              {actionMsg && (
                <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
                  {actionMsg}
                </div>
              )}
              {actionError && (
                <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 text-red-800 text-xs border border-red-200">
                  {actionError}
                </div>
              )}

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Customer Section */}
                <div className="rounded-xl border border-[#E4DEFB] p-4 bg-white">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Customer Details
                  </h3>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedOrder.customer_name || "Guest Customer"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Delivery method: {selectedOrder.delivery_method || "Standard Delivery"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Delivery status: {selectedOrder.delivery_status || "Pending"}
                    </p>
                  </div>
                </div>

                {/* Items Ordered Section */}
                <div className="rounded-xl border border-[#E4DEFB] p-4 bg-white">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                    Items ({Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0})
                  </h3>
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {selectedOrder.items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-[#FAF8FF] border border-[#E4DEFB] flex items-center justify-center text-slate-500 shrink-0 text-sm">
                              📦
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {item.product_name || "Item"}
                              </p>
                              {item.sku && (
                                <p className="text-xs text-slate-400 font-mono">SKU: {item.sku}</p>
                              )}
                              <p className="text-xs text-slate-500">
                                Qty: {item.quantity} ×{" "}
                                {formatOrderCurrency(item.unit_price, selectedOrder.currency_code)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">
                              {formatOrderCurrency(
                                item.total || item.quantity * (item.unit_price || 0),
                                selectedOrder.currency_code
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No line items recorded for this order.</p>
                  )}
                </div>

                {/* Payment & Totals Breakdown */}
                <div className="rounded-xl border border-[#E4DEFB] p-4 bg-[#FAF8FF] space-y-2 text-sm">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Payment Summary
                  </h3>
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>
                      {formatOrderCurrency(selectedOrder.subtotal, selectedOrder.currency_code)}
                    </span>
                  </div>
                  {Number(selectedOrder.discount_amount) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount</span>
                      <span>
                        -
                        {formatOrderCurrency(
                          selectedOrder.discount_amount,
                          selectedOrder.currency_code
                        )}
                      </span>
                    </div>
                  )}
                  {Number(selectedOrder.shipping_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Shipping</span>
                      <span>
                        {formatOrderCurrency(
                          selectedOrder.shipping_amount,
                          selectedOrder.currency_code
                        )}
                      </span>
                    </div>
                  )}
                  {Number(selectedOrder.tax_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax</span>
                      <span>
                        {formatOrderCurrency(selectedOrder.tax_amount, selectedOrder.currency_code)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-[#DDD6FE]">
                    <span>Total</span>
                    <span>
                      {formatOrderCurrency(selectedOrder.total, selectedOrder.currency_code)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-[#E4DEFB] bg-[#FAF8FF] flex items-center justify-between">
                {selectedOrder.status === "open" ? (
                  <button
                    type="button"
                    disabled={cancellingOrder}
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
                  >
                    {cancellingOrder ? "Cancelling..." : "Cancel Order"}
                  </button>
                ) : (
                  <span className="text-xs font-medium text-slate-500">
                    Status: {selectedOrder.status}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrder(null);
                    if (routeOrderId) navigate("/admin/online-store/orders");
                  }}
                  className="px-4 py-2 rounded-lg bg-charcoal-navy text-white text-xs font-semibold hover:bg-[#1C2347] transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
