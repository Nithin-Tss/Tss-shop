import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet } from "@/lib/api";
import Icon from "@/components/Icons";
import AccountSidebar from "@/components/AccountSidebar";

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
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-900/5 text-slate-800 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
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

function orderNo(order) {
  return order.order_number || `#${String(order.id || "").slice(0, 8)}`;
}

function isOpen(order) {
  const f = String(order.fulfillment_status || "unfulfilled").toLowerCase();
  const st = String(order.status || "").toLowerCase();
  return (
    !(f.includes("fulfilled") && !f.includes("unfulfilled") && !f.includes("partial")) &&
    !st.includes("cancel") &&
    !st.includes("void")
  );
}

export default function OrderHistory() {
  const navigate = useNavigate();
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

  const handleBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/");
  };

  const openCount = orders.filter(isOpen).length;
  const latest = orders
    .map((o) => new Date(o.created_at))
    .filter((d) => !isNaN(d.getTime()))
    .sort((x, y) => y - x)[0];
  const stats = [
    { icon: "package", label: "Total orders", value: orders.length },
    { icon: "truck", label: "In progress", value: openCount },
    {
      icon: "clock",
      label: "Last order",
      value: latest ? formatOrderDate(latest.toISOString()) : "—",
    },
  ];

  const ghostBtn =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 cursor-pointer";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-2 text-sm text-slate-500"
        >
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 transition hover:text-slate-900 cursor-pointer"
          >
            <Icon name="arrow-left" className="h-4 w-4" />
            Back
          </button>
          <Icon name="chevron-right" className="h-3.5 w-3.5 text-slate-300" />
          <Link to="/account" className="transition hover:text-slate-900">
            Account
          </Link>
          <Icon name="chevron-right" className="h-3.5 w-3.5 text-slate-300" />
          <span className="font-medium text-slate-900">Orders</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <AccountSidebar active="orders" />

          <div className="min-w-0 space-y-6">
            <header>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Order history
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Track your purchases, payment status and deliveries.
              </p>
            </header>

            {!loading && orders.length > 0 && (
              <dl className="grid gap-3 sm:grid-cols-3">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
                    <dt className="flex items-center gap-2 text-sm text-slate-500">
                      <Icon name={s.icon} className="h-4 w-4 text-slate-400" />
                      {s.label}
                    </dt>
                    <dd className="mt-2 text-2xl font-semibold text-slate-900">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {loading ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
                <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
                <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
                <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Icon name="bag" className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-base font-semibold text-slate-900">No orders yet</h2>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
                  When you place an order, its details, payment status and receipts will appear
                  here.
                </p>
                <Link
                  to="/"
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Start shopping
                  <Icon name="arrow-right" className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
                  <h2 className="text-base font-semibold text-slate-900">All orders</h2>
                  <span className="text-sm text-slate-500">{orders.length} total</span>
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs font-medium text-slate-500">
                      <tr>
                        <th className="px-6 py-3 font-medium">Order</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Payment</th>
                        <th className="px-4 py-3 font-medium">Fulfillment</th>
                        <th className="px-4 py-3 text-right font-medium">Total</th>
                        <th className="px-6 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {orders.map((order) => (
                        <tr key={order.id} className="transition hover:bg-slate-50">
                          <td className="px-6 py-4 font-mono font-medium text-slate-900">
                            {orderNo(order)}
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {formatOrderDate(order.created_at)}
                          </td>
                          <td className="px-4 py-4">{renderPaymentBadge(order.status)}</td>
                          <td className="px-4 py-4">
                            {renderFulfillmentBadge(order.fulfillment_status)}
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-slate-900">
                            {formatCurrency(order.total, order.currency_code)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className={ghostBtn}
                            >
                              View
                              <Icon name="chevron-right" className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile list */}
                <ul className="divide-y divide-slate-200 sm:hidden">
                  {orders.map((order) => (
                    <li key={order.id} className="space-y-3 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-medium text-slate-900">
                          {orderNo(order)}
                        </span>
                        <span className="text-sm font-medium text-slate-900">
                          {formatCurrency(order.total, order.currency_code)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{formatOrderDate(order.created_at)}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {renderPaymentBadge(order.status)}
                        {renderFulfillmentBadge(order.fulfillment_status)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className={`${ghostBtn} w-full`}
                      >
                        View order
                        <Icon name="chevron-right" className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Order details modal */}
      {selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Order ${orderNo(selectedOrder)}`}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
          onClick={(e) => e.target === e.currentTarget && setSelectedOrder(null)}
        >
          <div className="relative my-8 w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-mono text-lg font-semibold text-slate-900">
                    {orderNo(selectedOrder)}
                  </h3>
                  {renderPaymentBadge(selectedOrder.status)}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  Placed on {formatOrderDate(selectedOrder.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                <span className="flex items-center gap-2 text-slate-600">
                  <Icon name="truck" className="h-4 w-4 text-slate-400" />
                  Fulfillment
                </span>
                {renderFulfillmentBadge(selectedOrder.fulfillment_status)}
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-slate-900">Items</h4>
                {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                  <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200">
                    {selectedOrder.items.map((item, idx) => (
                      <li
                        key={item.id || idx}
                        className="flex items-center justify-between gap-3 p-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            <Icon name="package" className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="font-medium text-slate-900">
                              {item.product_name || "Product"}
                            </p>
                            <p className="text-xs text-slate-500">
                              Qty {item.quantity || 1}
                              {item.unit_price
                                ? ` × ${formatCurrency(item.unit_price, selectedOrder.currency_code)}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(
                            item.total || (item.quantity || 1) * (item.unit_price || 0),
                            selectedOrder.currency_code
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-slate-200 p-4 text-center text-slate-500">
                    No item details available for this order.
                  </p>
                )}
              </div>

              <dl className="space-y-2 rounded-lg border border-slate-200 p-4">
                {selectedOrder.subtotal != null && (
                  <div className="flex justify-between text-slate-600">
                    <dt>Subtotal</dt>
                    <dd>{formatCurrency(selectedOrder.subtotal, selectedOrder.currency_code)}</dd>
                  </div>
                )}
                {Number(selectedOrder.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>Discount</dt>
                    <dd>
                      -{formatCurrency(selectedOrder.discount_amount, selectedOrder.currency_code)}
                    </dd>
                  </div>
                )}
                {Number(selectedOrder.shipping_amount) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <dt>Shipping</dt>
                    <dd>
                      {formatCurrency(selectedOrder.shipping_amount, selectedOrder.currency_code)}
                    </dd>
                  </div>
                )}
                {Number(selectedOrder.tax_amount) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <dt>Tax</dt>
                    <dd>{formatCurrency(selectedOrder.tax_amount, selectedOrder.currency_code)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                  <dt>Total</dt>
                  <dd>{formatCurrency(selectedOrder.total, selectedOrder.currency_code)}</dd>
                </div>
              </dl>
            </div>

            <div className="flex justify-end border-t border-slate-200 px-6 py-4">
              <button type="button" onClick={() => setSelectedOrder(null)} className={ghostBtn}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
