import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, logout } from "@/lib/api";
import { useSession } from "@/lib/auth";

function formatOrderDate(dateString) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatCurrency(amount, currencyCode = "AUD") {
  if (amount == null || amount === "") return "—";
  const num = Number(amount);
  if (isNaN(num)) return `${amount} ${currencyCode}`;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currencyCode || "AUD",
  }).format(num);
}

function renderPaymentBadge(status) {
  const s = String(status || "paid").toLowerCase();
  if (s.includes("pending") || s === "open") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Payment Pending
      </span>
    );
  }
  if (s.includes("refund")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        Refunded
      </span>
    );
  }
  if (s.includes("cancel") || s.includes("void")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Paid
    </span>
  );
}

function renderFulfillmentBadge(status) {
  const s = String(status || "unfulfilled").toLowerCase();
  if (s.includes("fulfilled") && !s.includes("unfulfilled") && !s.includes("partial")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-violet-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
        Fulfilled
      </span>
    );
  }
  if (s.includes("partial")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Partially Fulfilled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Unfulfilled
    </span>
  );
}

export default function OrderHistory() {
  const navigate = useNavigate();
  const session = useSession();
  const user = session?.user;
  const userName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : session?.name || "Customer";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function loadOrders() {
      setLoading(true);
      try {
        const res = await apiGet("/api/v1/orders/");
        if (!ignore) {
          if (res.ok && Array.isArray(res.data)) {
            setOrders(res.data);
          } else if (res.ok && Array.isArray(res.data?.results)) {
            setOrders(res.data.results);
          } else {
            setOrders([]);
          }
        }
      } catch {
        if (!ignore) setOrders([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      ignore = true;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-50/60 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        {/* Shopify-style Customer Account Header */}
        <div className="mb-8 border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                <Link to="/" className="hover:text-slate-900 transition flex items-center gap-1">
                  <span>←</span>
                  <span>Store</span>
                </Link>
                <span>/</span>
                <span className="text-slate-700">Account</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Order History
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Welcome back, <span className="font-semibold text-slate-800">{userName}</span>
                {user?.email && <span className="text-slate-400"> ({user.email})</span>}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <span>Log out</span>
              <span className="text-slate-400">→</span>
            </button>
          </div>

          {/* Subnav Tabs */}
          <div className="mt-6 flex items-center gap-2">
            <Link
              to="/account"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <span>👤</span>
              <span>Account & Addresses</span>
            </Link>

            <Link
              to="/account/orders"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer bg-[#0B1020] text-white shadow-xs"
            >
              <span>📦</span>
              <span>Order History</span>
            </Link>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          /* Loading Skeleton */
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs space-y-4">
            <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-12 w-full bg-slate-100 rounded animate-pulse" />
            <div className="h-12 w-full bg-slate-100 rounded animate-pulse" />
            <div className="h-12 w-full bg-slate-100 rounded animate-pulse" />
          </div>
        ) : orders.length === 0 ? (
          /* Clean Shopify Empty State (No Fake Records) */
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl text-slate-500 mb-4">
              📦
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              You haven't placed any orders yet
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              When you place an order, its details, tracking status, and receipts will appear right
              here.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B1020] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-[#1C2347] shadow-xs cursor-pointer"
            >
              <span>Start shopping</span>
              <span>→</span>
            </Link>
          </div>
        ) : (
          /* Orders Table & Responsive Mobile Cards */
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3.5 px-4 sm:px-6">Order</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Payment Status</th>
                      <th className="py-3.5 px-4">Fulfillment Status</th>
                      <th className="py-3.5 px-4 text-right">Total</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-4 px-4 sm:px-6 font-semibold text-slate-900 font-mono">
                          {order.order_number || `#${order.id?.slice(0, 8)}`}
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          {formatOrderDate(order.created_at)}
                        </td>
                        <td className="py-4 px-4">{renderPaymentBadge(order.status)}</td>
                        <td className="py-4 px-4">
                          {renderFulfillmentBadge(order.fulfillment_status)}
                        </td>
                        <td className="py-4 px-4 text-right font-medium text-slate-900">
                          {formatCurrency(order.total, order.currency_code)}
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                          >
                            <span>View Order</span>
                            <span className="text-slate-400">→</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="space-y-3 sm:hidden">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {order.order_number || `#${order.id?.slice(0, 8)}`}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatCurrency(order.total, order.currency_code)}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500">{formatOrderDate(order.created_at)}</div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {renderPaymentBadge(order.status)}
                    {renderFulfillmentBadge(order.fulfillment_status)}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition cursor-pointer"
                    >
                      <span>View Order Details</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* View Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 font-mono">
                    {selectedOrder.order_number || `#${selectedOrder.id?.slice(0, 8)}`}
                  </h3>
                  {renderPaymentBadge(selectedOrder.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Placed on {formatOrderDate(selectedOrder.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Status bar */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Fulfillment Status</span>
                <div>{renderFulfillmentBadge(selectedOrder.fulfillment_status)}</div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-3">Items Ordered</h4>
                {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {selectedOrder.items.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3.5 flex items-center justify-between gap-3 bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            📦
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                              {item.product_name || "Product"}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Qty: {item.quantity || 1}{" "}
                              {item.unit_price
                                ? `× ${formatCurrency(
                                    item.unit_price,
                                    selectedOrder.currency_code
                                  )}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {formatCurrency(
                            item.total || (item.quantity || 1) * (item.unit_price || 0),
                            selectedOrder.currency_code
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-50 text-slate-500 text-center">
                    Order items registered with order
                  </div>
                )}
              </div>

              {/* Order Totals Summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                {selectedOrder.subtotal != null && (
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>
                      {formatCurrency(selectedOrder.subtotal, selectedOrder.currency_code)}
                    </span>
                  </div>
                )}
                {Number(selectedOrder.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span>
                      -{formatCurrency(selectedOrder.discount_amount, selectedOrder.currency_code)}
                    </span>
                  </div>
                )}
                {Number(selectedOrder.shipping_amount) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping</span>
                    <span>
                      {formatCurrency(selectedOrder.shipping_amount, selectedOrder.currency_code)}
                    </span>
                  </div>
                )}
                {Number(selectedOrder.tax_amount) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax</span>
                    <span>
                      {formatCurrency(selectedOrder.tax_amount, selectedOrder.currency_code)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total, selectedOrder.currency_code)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
