import { useMemo, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";

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
  // Existing purchase orders state (dynamic; ready for backend data integration)
  const [orders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [notice, setNotice] = useState("");

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 4500);
  };

  const handleCreatePurchaseOrder = () => {
    // There is currently no backend endpoint or creation screen for supplier purchase orders
    flash(
      "Purchase order creation requires supplier configuration and is not yet configured on the backend."
    );
  };

  // Filter existing orders if present
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (filterStatus !== "all" && (order.status || "").toLowerCase() !== filterStatus) {
        return false;
      }
      if (!q) return true;
      return (
        (order.reference || "").toLowerCase().includes(q) ||
        (order.supplier || "").toLowerCase().includes(q) ||
        (order.destination || "").toLowerCase().includes(q)
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
                    <option value="open">Open</option>
                    <option value="draft">Draft</option>
                    <option value="closed">Closed</option>
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
            {filteredOrders.length === 0 ? (
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
                      onClick={handleCreatePurchaseOrder}
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
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Received</th>
                      <th className="py-3 px-4 text-right">Expected arrival</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E4DC]">
                    {filteredOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="py-3 px-4 font-medium text-charcoal-navy">
                          {po.reference || `#PO-${po.id}`}
                        </td>
                        <td className="py-3 px-4 text-[#5A5750]">{po.supplier || "—"}</td>
                        <td className="py-3 px-4 text-[#5A5750]">{po.destination || "—"}</td>
                        <td className="py-3 px-4">
                          <span className="rounded-full bg-[#EBF5FB] px-2.5 py-0.5 text-xs font-medium text-[#004B87]">
                            {po.status || "Open"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {po.received || 0} / {po.total || 0}
                        </td>
                        <td className="py-3 px-4 text-right text-[#5A5750]">
                          {po.expected_date || "—"}
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
    </div>
  );
}

