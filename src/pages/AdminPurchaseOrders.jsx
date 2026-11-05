import { useEffect, useMemo, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { apiGet, apiPost } from "@/lib/api";

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

const STATUS_STYLES = {
  draft: "bg-[#F3F1EC] text-[#5A5750]",
  ordered: "bg-[#EBF5FB] text-[#004B87]",
  received: "bg-[#E3F5EC] text-[#265C48]",
  cancelled: "bg-[#FDECEC] text-[#B42318]",
};

const inputCls =
  "h-9 w-full rounded-lg border border-[#E7E4DC] bg-white px-3 text-sm text-charcoal-navy outline-none focus:border-charcoal-navy focus:ring-1 focus:ring-[#14130F]";

function ModalShell({ title, onClose, children, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} rounded-xl bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E7E4DC] px-6 py-4">
          <h2 className="text-base font-semibold text-charcoal-navy">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-[#F3F1EC] hover:text-charcoal-navy cursor-pointer"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreatePurchaseOrderModal({ variants, onClose, onCreated }) {
  const [supplier, setSupplier] = useState("");
  const [items, setItems] = useState([]); // [{ variant, quantity }]
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const byId = useMemo(() => new Map(variants.map((v) => [String(v.id), v])), [variants]);
  const picked = new Set(items.map((i) => String(i.variant)));

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return variants
      .filter((v) => !picked.has(String(v.id)))
      .filter((v) => !q || `${v.product} ${v.options} ${v.sku}`.toLowerCase().includes(q))
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants, query, items]);

  const addVariant = (v) => {
    setItems((prev) => [...prev, { variant: v.id, quantity: 1 }]);
    setQuery("");
  };

  const setQty = (id, value) =>
    setItems((prev) =>
      prev.map((i) =>
        i.variant === id ? { ...i, quantity: Math.max(1, parseInt(value, 10) || 1) } : i
      )
    );

  const totalUnits = items.reduce((n, i) => n + i.quantity, 0);
  const canSubmit = supplier.trim() && items.length > 0 && !saving;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    const res = await apiPost("/api/v1/purchase-orders/", {
      supplier_name: supplier.trim(),
      items,
    });
    setSaving(false);
    if (res.ok) {
      onCreated();
      onClose();
    } else {
      setError(res.error || "Could not create the purchase order.");
    }
  };

  return (
    <ModalShell title="Create purchase order" onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="space-y-5 p-6 max-h-[68vh] overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-[#FDECEC] px-4 py-2.5 text-xs text-[#B42318]"
            >
              {error}
            </div>
          )}
          <div>
            <label htmlFor="po-supplier" className="mb-1.5 block text-xs font-medium">
              Supplier
            </label>
            <input
              id="po-supplier"
              className={inputCls}
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Supplier name"
              maxLength={255}
              required
            />
          </div>

          <div>
            <label htmlFor="po-search" className="mb-1.5 block text-xs font-medium">
              Add products
            </label>
            <div className="relative">
              <input
                id="po-search"
                className={inputCls}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products by name or SKU"
                autoComplete="off"
              />
              {query.trim() && (
                <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-[#E7E4DC] bg-white shadow-lg">
                  {matches.length === 0 ? (
                    <li className="px-3 py-2.5 text-sm text-[#78746A]">No matching products</li>
                  ) : (
                    matches.map((v) => (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => addVariant(v)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[#F3F1EC] cursor-pointer"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{v.product}</span>
                            <span className="block truncate text-xs text-[#78746A]">
                              {[v.options, v.sku && `SKU ${v.sku}`].filter(Boolean).join(" · ") ||
                                "Default variant"}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-[#78746A]">
                            {v.stock} in stock
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#E7E4DC] py-8 text-center text-sm text-[#78746A]">
              Search above to add the products you want to restock.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#E7E4DC]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E7E4DC] bg-[#FAF9F6] text-xs font-medium text-[#5A5750]">
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 text-right">In stock</th>
                    <th className="px-3 py-2 text-right">Quantity to order</th>
                    <th className="w-8 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E4DC]">
                  {items.map((it) => {
                    const v = byId.get(String(it.variant));
                    return (
                      <tr key={it.variant}>
                        <td className="px-3 py-2">
                          <span className="block font-medium">{v?.product || "Product"}</span>
                          <span className="block text-xs text-[#78746A]">
                            {[v?.options, v?.sku && `SKU ${v.sku}`].filter(Boolean).join(" · ") ||
                              "Default variant"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-[#5A5750]">{v?.stock ?? 0}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="1"
                            aria-label={`Quantity of ${v?.product || "product"}`}
                            value={it.quantity}
                            onChange={(e) => setQty(it.variant, e.target.value)}
                            className="h-8 w-20 rounded-lg border border-[#E7E4DC] px-2 text-right text-sm outline-none focus:border-charcoal-navy"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            aria-label="Remove product"
                            onClick={() =>
                              setItems((p) => p.filter((i) => i.variant !== it.variant))
                            }
                            className="text-slate-400 hover:text-[#B42318] cursor-pointer"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[#E7E4DC] px-6 py-4">
          <span className="text-sm text-[#5A5750]">
            {items.length} product{items.length === 1 ? "" : "s"} · {totalUnits} unit
            {totalUnits === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E7E4DC] px-3.5 py-2 text-sm font-medium hover:bg-[#F3F1EC] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-charcoal-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Creating…" : "Create purchase order"}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

function ReceiveModal({ order, locations, onClose, onDone }) {
  const [locationId, setLocationId] = useState(locations[0]?.id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await apiPost(`/api/v1/purchase-orders/${order.id}/receive/`, {
      location: locationId,
    });
    setSaving(false);
    if (res.ok) {
      onDone(`${order.po_number} received into stock.`);
      onClose();
    } else {
      setError(res.error || "Could not receive this purchase order.");
    }
  };

  return (
    <ModalShell title={`Receive ${order.po_number}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-6">
        {error && (
          <div role="alert" className="rounded-lg bg-[#FDECEC] px-4 py-2.5 text-xs text-[#B42318]">
            {error}
          </div>
        )}
        {locations.length === 0 && (
          <p className="text-xs text-[#B42318]">Add a location in Settings → Locations first.</p>
        )}
        <div>
          <label htmlFor="po-location" className="mb-1.5 block text-xs font-medium">
            Receive stock into
          </label>
          <select
            id="po-location"
            className={inputCls}
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#E7E4DC] px-3.5 py-2 text-sm font-medium hover:bg-[#F3F1EC] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !locationId}
            className="rounded-lg bg-charcoal-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Receiving…" : "Receive stock"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// Professional SVG illustration representing purchase orders (clipboard with itemized rows & supplier shipment)
function PurchaseOrdersIllustration({ className = "h-40 w-48" }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Soft drop shadows */}
        <filter id="po-shadow" x="35" y="15" width="130" height="135" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#14130F" floodOpacity="0.08" />
        </filter>
        <filter id="box-shadow" x="105" y="80" width="70" height="70" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#14130F" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* Decorative ambient background circle */}
      <circle cx="100" cy="80" r="66" fill="#F3F1EC" opacity="0.75" />

      {/* Clipboard base */}
      <rect
        x="48"
        y="22"
        width="104"
        height="120"
        rx="10"
        fill="#FFFFFF"
        stroke="#E7E4DC"
        strokeWidth="1.5"
        filter="url(#po-shadow)"
      />

      {/* Clipboard top clip */}
      <rect x="80" y="17" width="40" height="11" rx="4" fill="#2B2925" />
      <circle cx="100" cy="22" r="2.5" fill="#FAF9F6" />

      {/* Document rows & placeholders */}
      {/* Header bar */}
      <rect x="62" y="38" width="48" height="6" rx="3" fill="#D4D0C5" />
      <rect x="126" y="38" width="14" height="6" rx="3" fill="#E7E4DC" />

      {/* Item row 1 */}
      <circle cx="66" cy="56" r="3.5" fill="#265C48" />
      <rect x="76" y="53.5" width="42" height="5" rx="2.5" fill="#E7E4DC" />
      <rect x="126" y="53.5" width="14" height="5" rx="2.5" fill="#EBF5FB" />

      {/* Item row 2 */}
      <circle cx="66" cy="72" r="3.5" fill="#265C48" />
      <rect x="76" y="69.5" width="34" height="5" rx="2.5" fill="#E7E4DC" />
      <rect x="126" y="69.5" width="14" height="5" rx="2.5" fill="#EBF5FB" />

      {/* Item row 3 */}
      <circle cx="66" cy="88" r="3.5" fill="#C5CCD8" />
      <rect x="76" y="85.5" width="46" height="5" rx="2.5" fill="#E7E4DC" />
      <rect x="126" y="85.5" width="14" height="5" rx="2.5" fill="#EBF5FB" />

      {/* Item row 4 (faint) */}
      <rect x="76" y="101.5" width="28" height="5" rx="2.5" fill="#F3F1EC" />
      <rect x="126" y="101.5" width="14" height="5" rx="2.5" fill="#F3F1EC" />

      {/* Supplier Delivery Box (Overlapping 3D angle) */}
      <g filter="url(#box-shadow)">
        {/* Box side left */}
        <path d="M112 108 L136 120 L136 142 L112 130 Z" fill="#D4B382" />
        {/* Box side right */}
        <path d="M136 120 L160 108 L160 130 L136 142 Z" fill="#BE9967" />
        {/* Box top face */}
        <path d="M136 96 L160 108 L136 120 L112 108 Z" fill="#E7CBA0" />
        {/* Packing tape */}
        <path d="M132 102 L140 106 L140 142 L132 138 Z" fill="#F4E6D2" opacity="0.85" />
      </g>
    </svg>
  );
}

export default function AdminPurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [receiving, setReceiving] = useState(null);
  const [notice, setNotice] = useState("");

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 4500);
  };

  const loadData = async () => {
    try {
      const [poRes, locRes, prodRes] = await Promise.all([
        apiGet("/api/v1/purchase-orders/"),
        apiGet("/api/v1/inventory/locations/"),
        apiGet("/api/v1/catalog/products/"),
      ]);
      if (poRes.ok) setOrders(asList(poRes.data));
      else flash(poRes.error || "Could not load purchase orders.");
      if (locRes.ok) setLocations(asList(locRes.data));
      if (prodRes.ok) setProducts(asList(prodRes.data));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Load once on mount; loadData only sets state after the requests resolve.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const variants = useMemo(
    () =>
      products.flatMap((p) =>
        (p.variants || []).map((v) => ({
          id: v.id,
          product: p.title,
          options: Object.values(v.options || {})
            .filter(Boolean)
            .join(" / "),
          sku: v.sku || "",
          stock: v.quantity ?? 0,
        }))
      ),
    [products]
  );

  const runAction = async (order, action, message) => {
    const res = await apiPost(`/api/v1/purchase-orders/${order.id}/${action}/`);
    if (res.ok) {
      flash(message);
      loadData();
    } else {
      flash(res.error || "Action failed.");
    }
  };

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (filterStatus !== "all" && (order.status || "").toLowerCase() !== filterStatus) {
        return false;
      }
      if (!q) return true;
      return (
        (order.po_number || "").toLowerCase().includes(q) ||
        (order.supplier_name || "").toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery, filterStatus]);

  return (
    <div className="min-h-screen bg-white text-charcoal-navy">
      <AdminHeader />

      {/* BODY LAYOUT */}
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT AREA */}
        <main className="min-w-0 flex-1 bg-[#F3F1EC] px-4 sm:px-8 py-6 max-w-full overflow-x-hidden">
          {/* TITLE & HEADER */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 text-[20px] sm:text-[22px] font-bold text-charcoal-navy">
              <PageIcon name="purchase_orders" />
              Purchase orders
            </h1>
            {orders.length > 0 && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="rounded-lg bg-charcoal-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1A1916] cursor-pointer"
              >
                Create purchase order
              </button>
            )}
          </div>

          {/* NOTIFICATION FEEDBACK */}
          {notice && (
            <div
              role="alert"
              className="mb-4 flex items-center justify-between rounded-lg bg-[#EBF5FB] px-4 py-2.5 text-sm text-[#004B87] border border-[#BCE1F5]"
            >
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                className="text-xs font-semibold hover:underline cursor-pointer ml-3"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* MAIN CARD CONTAINER */}
          <section className="rounded-xl border border-[#E7E4DC] bg-white shadow-2xs overflow-hidden">
            {/* FULL-WIDTH SEARCH & FILTER TOOLBAR */}
            <div className="flex items-center justify-between border-b border-[#E7E4DC] px-3 sm:px-4 py-2.5 bg-white">
              {/* Left: View Filter (All ⇅) + Search input */}
              <div className="flex items-center gap-2 flex-1 max-w-xl">
                {/* View dropdown: All ⇅ matching Shopify layout */}
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    aria-label="Filter purchase orders"
                    className="h-9 appearance-none rounded-lg border border-[#E7E4DC] bg-white pl-3 pr-7 text-xs sm:text-sm font-medium text-charcoal-navy outline-none hover:bg-[#F3F1EC] cursor-pointer transition"
                  >
                    <option value="all">All</option>
                    <option value="draft">Draft</option>
                    <option value="ordered">Ordered</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-col text-[7px] text-[#5A5750] leading-1.5">
                    ▲▼
                  </span>
                </div>

                {/* Search input with magnifying glass */}
                <div className="relative flex items-center w-full">
                  <span className="pointer-events-none absolute left-3 text-slate-400">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search and filter"
                    className="h-9 w-full rounded-lg border border-[#E7E4DC] bg-white pl-9 pr-8 text-xs sm:text-sm text-charcoal-navy placeholder:text-slate-400 outline-none focus:border-charcoal-navy focus:ring-1 focus:ring-[#14130F]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Columns / Table views icon matching screenshot */}
              <button
                type="button"
                title="Table columns & view"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7E4DC] bg-white text-[#5A5750] hover:bg-[#F3F1EC] transition shrink-0 ml-2 cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <line x1="15" y1="3" x2="15" y2="21" />
                </svg>
              </button>
            </div>

            {/* CONTENT AREA: EMPTY STATE OR DATA TABLE */}
            {loading ? (
              <div className="py-24 text-center text-sm text-[#5A5750]">
                Loading purchase orders…
              </div>
            ) : filteredOrders.length === 0 ? (
              searchQuery || filterStatus !== "all" ? (
                /* Search / Filter yields no items */
                <div className="py-20 text-center px-4">
                  <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3F1EC] text-charcoal-navy">
                      <PageIcon name="purchase_orders" />
                    </span>
                    <p className="font-semibold text-base text-charcoal-navy">
                      No matching purchase orders
                    </p>
                    <p className="mt-1 text-xs text-[#5A5750]">
                      {searchQuery
                        ? `No purchase orders match "${searchQuery}".`
                        : "No purchase orders match the selected filter."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterStatus("all");
                      }}
                      className="mt-4 inline-flex items-center rounded-lg border border-[#E7E4DC] bg-white px-3.5 py-1.5 text-xs font-medium text-charcoal-navy hover:bg-[#F3F1EC] transition cursor-pointer"
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              ) : (
                /* Default Centered Empty State matching Shopify screenshot */
                <div className="py-20 sm:py-24 text-center px-4 bg-white">
                  <div className="mx-auto flex max-w-md flex-col items-center justify-center">
                    {/* Illustration */}
                    <div className="mb-5 flex justify-center">
                      <PurchaseOrdersIllustration className="h-36 w-44 sm:h-40 sm:w-48" />
                    </div>

                    {/* Heading */}
                    <h2 className="text-[17px] sm:text-[18px] font-semibold text-charcoal-navy mb-2">
                      Manage your purchase orders
                    </h2>

                    {/* Description */}
                    <p className="text-sm text-[#78746A] max-w-sm leading-relaxed mb-6">
                      Track and receive inventory ordered from suppliers.
                    </p>

                    {/* Primary Button */}
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(true)}
                      className="inline-flex items-center justify-center rounded-lg bg-charcoal-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1A1916] transition shadow-xs cursor-pointer active:scale-[0.98]"
                    >
                      Create purchase order
                    </button>

                    {/* Supporting Link */}
                    <div className="mt-5">
                      <a
                        href="https://help.shopify.com/en/manual/products/inventory/transfers-purchase-orders/purchase-orders"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#5A5750] hover:text-charcoal-navy hover:underline transition"
                      >
                        Learn more about purchase orders
                      </a>
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* Table Layout if purchase orders exist in the future */
              <div className="overflow-x-auto min-h-60">
                <table className="w-full border-collapse text-left text-sm text-charcoal-navy">
                  <thead>
                    <tr className="border-b border-[#E7E4DC] bg-white text-xs font-medium text-[#2A2925] whitespace-nowrap">
                      <th className="py-3 px-4">Purchase order</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Units</th>
                      <th className="py-3 px-4 text-right">Created</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E4DC]">
                    {filteredOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="py-3 px-4 font-medium">{po.po_number}</td>
                        <td className="py-3 px-4 text-[#5A5750]">{po.supplier_name || "—"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                              STATUS_STYLES[po.status] || STATUS_STYLES.draft
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(po.items || []).reduce((n, i) => n + i.quantity, 0)}
                        </td>
                        <td className="py-3 px-4 text-right text-[#5A5750]">
                          {po.created_at ? new Date(po.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {po.status === "draft" && (
                            <button
                              type="button"
                              onClick={() =>
                                runAction(po, "order", `${po.po_number} marked as ordered.`)
                              }
                              className="mr-3 text-xs font-semibold hover:underline cursor-pointer"
                            >
                              Mark ordered
                            </button>
                          )}
                          {(po.status === "draft" || po.status === "ordered") && (
                            <>
                              <button
                                type="button"
                                onClick={() => setReceiving(po)}
                                className="mr-3 text-xs font-semibold hover:underline cursor-pointer"
                              >
                                Receive
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  runAction(po, "cancel", `${po.po_number} cancelled.`)
                                }
                                className="text-xs font-semibold text-[#B42318] hover:underline cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* FOOTER LINK */}
          <div className="mt-8 mb-6 text-center">
            <a
              href="https://help.shopify.com/en/manual/products/inventory/transfers-purchase-orders/purchase-orders"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#5A5750] hover:text-charcoal-navy hover:underline transition"
            >
              Learn more about managing purchase orders
            </a>
          </div>
        </main>
      </div>

      {isCreateOpen && (
        <CreatePurchaseOrderModal
          variants={variants}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            flash("Purchase order created.");
            loadData();
          }}
        />
      )}
      {receiving && (
        <ReceiveModal
          order={receiving}
          locations={locations}
          onClose={() => setReceiving(null)}
          onDone={(msg) => {
            flash(msg);
            loadData();
          }}
        />
      )}
    </div>
  );
}
