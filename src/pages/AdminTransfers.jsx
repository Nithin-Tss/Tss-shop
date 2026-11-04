import { useEffect, useMemo, useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { apiGet, apiPost } from "@/lib/api";

// Resolution-independent SVG illustration representing inventory transfer between locations
function TransfersIllustration({ className = "h-40 w-48" }) {
  return (
    <svg
      viewBox="0 0 220 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="hub-shadow" x="15" y="40" width="70" height="70" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#14130F" floodOpacity="0.08" />
        </filter>
        <filter id="hub-shadow-2" x="135" y="40" width="70" height="70" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#14130F" floodOpacity="0.08" />
        </filter>
        <filter id="cargo-shadow" x="80" y="30" width="60" height="60" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#14130F" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* Ambient background circle */}
      <circle cx="110" cy="80" r="70" fill="#F3F1EC" opacity="0.8" />

      {/* Transit dotted pathway */}
      <path
        d="M50 75 C 80 50, 140 50, 170 75"
        stroke="#D4D0C5"
        strokeWidth="2.5"
        strokeDasharray="5 5"
        strokeLinecap="round"
      />

      {/* Origin Location Hub (Left) */}
      <g filter="url(#hub-shadow)">
        <rect x="25" y="50" width="50" height="50" rx="10" fill="#FFFFFF" stroke="#E7E4DC" strokeWidth="1.5" />
        <path d="M40 78 V64 L50 58 L60 64 V78 H40 Z" fill="#F3F1EC" stroke="#2B2925" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="47" y="70" width="6" height="8" fill="#2B2925" />
        <circle cx="50" cy="46" r="4" fill="#008060" />
      </g>

      {/* Destination Location Hub (Right) */}
      <g filter="url(#hub-shadow-2)">
        <rect x="145" y="50" width="50" height="50" rx="10" fill="#FFFFFF" stroke="#E7E4DC" strokeWidth="1.5" />
        <path d="M160 78 V64 L170 58 L180 64 V78 H160 Z" fill="#F3F1EC" stroke="#2B2925" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="167" y="70" width="6" height="8" fill="#2B2925" />
        <circle cx="170" cy="46" r="#004B87" fill="#004B87" />
      </g>

      {/* Moving Inventory Box (Center cargo in transit) */}
      <g filter="url(#cargo-shadow)">
        {/* Isometric Box */}
        <path d="M96 52 L110 59 L110 75 L96 68 Z" fill="#D4B382" />
        <path d="M110 59 L124 52 L124 68 L110 75 Z" fill="#BE9967" />
        <path d="M110 45 L124 52 L110 59 L96 52 Z" fill="#E7CBA0" />
        {/* Box tape */}
        <path d="M108 48 L112 50 L112 75 L108 73 Z" fill="#F4E6D2" opacity="0.9" />
        {/* Forward transit arrow */}
        <path d="M102 85 H118 M114 81 L118 85 L114 89" stroke="#14130F" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// Modal component for creating an inventory transfer
function CreateTransferModal({ locations, products, onClose, onCreated }) {
  const [sourceId, setSourceId] = useState(locations[0]?.id || "");
  const [destId, setDestId] = useState(locations[1]?.id || "");
  const [items, setItems] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Flatten all variants from products
  const allVariants = useMemo(() => {
    const list = [];
    products.forEach((p) => {
      (p.variants || []).forEach((v) => {
        list.push({
          id: v.id,
          productId: p.id,
          title: p.title,
          sku: v.sku,
          price: v.price,
          option: v.title || v.option1 || "Default",
        });
      });
      // Fallback if product has no variants array
      if (!p.variants || p.variants.length === 0) {
        list.push({
          id: p.id,
          productId: p.id,
          title: p.title,
          sku: p.sku || "",
          price: p.price || "0.00",
          option: "Default",
        });
      }
    });
    return list;
  }, [products]);

  // Handle adding an item to the transfer list
  const handleAddItem = () => {
    if (!selectedVariantId) return;
    const variant = allVariants.find((v) => String(v.id) === String(selectedVariantId));
    if (!variant) return;

    const qty = Math.max(1, parseInt(itemQuantity, 10) || 1);
    const existingIndex = items.findIndex((i) => String(i.variant) === String(selectedVariantId));

    if (existingIndex >= 0) {
      setItems((prev) =>
        prev.map((it, idx) => (idx === existingIndex ? { ...it, quantity: it.quantity + qty } : it))
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          variant: variant.id,
          title: variant.title,
          sku: variant.sku,
          option: variant.option,
          quantity: qty,
        },
      ]);
    }

    setSelectedVariantId("");
    setItemQuantity(1);
    setError("");
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemQty = (index, value) => {
    const qty = Math.max(1, parseInt(value, 10) || 1);
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, quantity: qty } : it))
    );
  };

  // Form submission validation
  const isSameLocation = sourceId && destId && sourceId === destId;
  const isFormValid = sourceId && destId && !isSameLocation && items.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSaving(true);
    setError("");

    const payload = {
      source_location: sourceId,
      destination_location: destId,
      items: items.map((it) => ({
        variant: it.variant,
        quantity: it.quantity,
      })),
    };

    try {
      const res = await apiPost("/api/v1/inventory/transfers/", payload);
      if (res.ok) {
        onCreated(res.data);
        onClose();
      } else {
        setError(res.error || "Failed to create transfer. Please check input values.");
      }
    } catch (err) {
      setError(err?.message || "An unexpected error occurred while communicating with the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-transfer-title"
        className="w-full max-w-2xl rounded-xl bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7E4DC] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F1EC] text-charcoal-navy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="m16 3 4 4-4 4" />
                <path d="M20 7H4" />
                <path d="m8 21-4-4 4-4" />
                <path d="M4 17h16" />
              </svg>
            </div>
            <div>
              <h2 id="create-transfer-title" className="text-base font-semibold text-charcoal-navy">
                Create transfer
              </h2>
              <p className="text-xs text-[#5A5750]">
                Move inventory from one store location to another
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-[#F3F1EC] hover:text-charcoal-navy transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-[#FDECEC] px-4 py-2.5 text-xs text-[#B42318] border border-[#F8D7DA]"
            >
              {error}
            </div>
          )}

          {/* Location Routing Section */}
          <div className="rounded-xl border border-[#E7E4DC] p-4 bg-[#FAF9F6] space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#78746A]">
              Locations
            </h3>

            {locations.length < 2 && (
              <p className="text-xs text-[#B42318] bg-[#FDECEC] p-2.5 rounded-lg border border-[#F8D7DA]">
                Transferring inventory requires at least two registered locations. Please create an additional location in Settings → Locations first.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Origin / Source */}
              <div>
                <label htmlFor="transfer-source" className="block text-xs font-medium text-charcoal-navy mb-1.5">
                  Origin (Source location)
                </label>
                <select
                  id="transfer-source"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#E7E4DC] bg-white px-3 text-xs sm:text-sm text-charcoal-navy outline-none focus:border-charcoal-navy focus:ring-1 focus:ring-[#14130F] cursor-pointer"
                >
                  <option value="" disabled>Select origin location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.city ? `(${loc.city})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination */}
              <div>
                <label htmlFor="transfer-dest" className="block text-xs font-medium text-charcoal-navy mb-1.5">
                  Destination (Receiving location)
                </label>
                <select
                  id="transfer-dest"
                  value={destId}
                  onChange={(e) => setDestId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#E7E4DC] bg-white px-3 text-xs sm:text-sm text-charcoal-navy outline-none focus:border-charcoal-navy focus:ring-1 focus:ring-[#14130F] cursor-pointer"
                >
                  <option value="" disabled>Select destination location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.city ? `(${loc.city})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Same location inline validation */}
            {isSameLocation && (
              <p className="text-xs text-[#B42318] flex items-center gap-1.5 font-medium">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Origin and destination must be different locations.
              </p>
            )}
          </div>

          {/* Add Products Section */}
          <div className="rounded-xl border border-[#E7E4DC] p-4 bg-white space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#78746A]">
              Add Products to Transfer
            </h3>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex-1">
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#E7E4DC] bg-white px-3 text-xs sm:text-sm text-charcoal-navy outline-none focus:border-charcoal-navy focus:ring-1 focus:ring-[#14130F] cursor-pointer"
                >
                  <option value="">Select a product / variant…</option>
                  {allVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title} {v.sku ? `(${v.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-24">
                <input
                  type="number"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="h-9 w-full rounded-lg border border-[#E7E4DC] bg-white px-3 text-xs sm:text-sm text-charcoal-navy outline-none focus:border-charcoal-navy text-center"
                  placeholder="Qty"
                />
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                disabled={!selectedVariantId}
                className="h-9 px-4 rounded-lg border border-[#E7E4DC] bg-white text-xs font-semibold text-charcoal-navy hover:bg-[#F3F1EC] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Add item
              </button>
            </div>

            {/* Items Table */}
            {items.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#78746A] border border-dashed border-[#E7E4DC] rounded-lg">
                No items added yet. Select a product above to add to this transfer.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#E7E4DC]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF9F6] border-b border-[#E7E4DC] text-[#78746A] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-center w-24">Quantity</th>
                      <th className="py-2.5 px-3 text-right w-16">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E4DC]">
                    {items.map((it, idx) => (
                      <tr key={it.variant} className="hover:bg-[#FAF9F6]">
                        <td className="py-2.5 px-3 font-medium text-charcoal-navy">{it.title}</td>
                        <td className="py-2.5 px-3 text-[#5A5750]">{it.sku || "—"}</td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => handleUpdateItemQty(idx, e.target.value)}
                            className="h-7 w-16 rounded border border-[#E7E4DC] bg-white px-1.5 text-center text-xs text-charcoal-navy outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            aria-label={`Remove ${it.title}`}
                            className="text-slate-400 hover:text-[#B42318] transition p-1 cursor-pointer"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E7E4DC]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-[#E7E4DC] bg-white px-4 py-2 text-xs sm:text-sm font-medium text-charcoal-navy hover:bg-[#F3F1EC] transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || saving || locations.length < 2}
              className="rounded-lg bg-charcoal-navy px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#1A1916] transition shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Creating…" : "Save transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 4500);
  };

  // Load transfers, locations, and products dynamically from existing APIs
  const loadData = async () => {
    setLoading(true);
    try {
      const [transfersRes, locationsRes, productsRes] = await Promise.all([
        apiGet("/api/v1/inventory/transfers/"),
        apiGet("/api/v1/inventory/locations/"),
        apiGet("/api/v1/catalog/products/"),
      ]);

      if (transfersRes.ok) {
        const list = Array.isArray(transfersRes.data)
          ? transfersRes.data
          : transfersRes.data?.results || [];
        setTransfers(list);
      }

      if (locationsRes.ok) {
        const locs = Array.isArray(locationsRes.data)
          ? locationsRes.data
          : locationsRes.data?.results || [];
        setLocations(locs);
      }

      if (productsRes.ok) {
        const prods = Array.isArray(productsRes.data)
          ? productsRes.data
          : productsRes.data?.results || [];
        setProducts(prods);
      }
    } catch {
      // Graceful fallback: maintain empty state without crashing
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Complete a pending transfer
  const handleComplete = async (transferId) => {
    const res = await apiPost(`/api/v1/inventory/transfers/${transferId}/complete/`);
    if (res.ok) {
      flash("Transfer completed and inventory updated.");
      loadData();
    } else {
      flash(res.error || "Could not complete transfer.");
    }
  };

  // Cancel a transfer
  const handleCancel = async (transferId) => {
    const res = await apiPost(`/api/v1/inventory/transfers/${transferId}/cancel/`);
    if (res.ok) {
      flash("Transfer cancelled.");
      loadData();
    } else {
      flash(res.error || "Could not cancel transfer.");
    }
  };

  // Location map for fast lookup
  const locationMap = useMemo(() => {
    const map = new Map();
    locations.forEach((loc) => map.set(String(loc.id), loc.name));
    return map;
  }, [locations]);

  // Filter transfers by status and search query
  const filteredTransfers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transfers.filter((t) => {
      if (filterStatus !== "all" && (t.status || "").toLowerCase() !== filterStatus) {
        return false;
      }
      if (!q) return true;
      const originName = locationMap.get(String(t.source_location)) || "";
      const destName = locationMap.get(String(t.destination_location)) || "";
      const num = String(t.transfer_number || t.id || "");
      return (
        num.toLowerCase().includes(q) ||
        originName.toLowerCase().includes(q) ||
        destName.toLowerCase().includes(q)
      );
    });
  }, [transfers, searchQuery, filterStatus, locationMap]);

  return (
    <div className="min-h-screen bg-white text-charcoal-navy">
      <AdminHeader />

      {/* BODY LAYOUT */}
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT AREA */}
        <main className="min-w-0 flex-1 bg-[#F3F1EC] px-4 sm:px-8 py-6 max-w-full overflow-x-hidden">
          {/* TITLE & HEADER ACTIONS */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 text-[20px] sm:text-[22px] font-bold text-charcoal-navy">
              <PageIcon name="transfers" />
              Transfers
            </h1>

            {transfers.length > 0 && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-charcoal-navy px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-2xs hover:bg-[#1A1916] transition cursor-pointer"
              >
                Create transfer
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
                    aria-label="Filter transfers"
                    className="h-9 appearance-none rounded-lg border border-[#E7E4DC] bg-white pl-3 pr-7 text-xs sm:text-sm font-medium text-charcoal-navy outline-none hover:bg-[#F3F1EC] cursor-pointer transition"
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
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
              <div className="py-20 text-center text-sm text-[#78746A]">
                Loading transfers…
              </div>
            ) : filteredTransfers.length === 0 ? (
              searchQuery || filterStatus !== "all" ? (
                /* Search / Filter yields no items */
                <div className="py-20 text-center px-4">
                  <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3F1EC] text-charcoal-navy">
                      <PageIcon name="transfers" />
                    </span>
                    <p className="font-semibold text-base text-charcoal-navy">
                      No matching transfers found
                    </p>
                    <p className="mt-1 text-xs text-[#5A5750]">
                      {searchQuery
                        ? `No transfers match "${searchQuery}".`
                        : "No transfers match the selected filter."}
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
                      <TransfersIllustration className="h-36 w-44 sm:h-40 sm:w-48" />
                    </div>

                    {/* Heading */}
                    <h2 className="text-[17px] sm:text-[18px] font-semibold text-charcoal-navy mb-2">
                      Move inventory between locations
                    </h2>

                    {/* Supporting Text */}
                    <p className="text-sm text-[#78746A] max-w-sm leading-relaxed mb-6">
                      Move and track inventory between your business locations.
                    </p>

                    {/* Primary Button */}
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(true)}
                      className="inline-flex items-center justify-center rounded-lg bg-charcoal-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1A1916] transition shadow-xs cursor-pointer active:scale-[0.98]"
                    >
                      Create transfer
                    </button>

                    {/* Supporting Link */}
                    <div className="mt-5">
                      <a
                        href="https://help.shopify.com/en/manual/products/inventory/transfers-purchase-orders/transfers"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#5A5750] hover:text-charcoal-navy hover:underline transition"
                      >
                        Learn more about transfers
                      </a>
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* Data Table when transfers exist */
              <div className="overflow-x-auto min-h-60">
                <table className="w-full border-collapse text-left text-sm text-charcoal-navy">
                  <thead>
                    <tr className="border-b border-[#E7E4DC] bg-white text-xs font-medium text-[#2A2925] whitespace-nowrap">
                      <th className="py-3 px-4">Transfer</th>
                      <th className="py-3 px-4">Origin</th>
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Items</th>
                      <th className="py-3 px-4 text-right">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E4DC]">
                    {filteredTransfers.map((t) => {
                      const originName = locationMap.get(String(t.source_location)) || "Origin location";
                      const destName = locationMap.get(String(t.destination_location)) || "Destination location";
                      const itemsCount = (t.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
                      const isPending = (t.status || "").toLowerCase() === "pending";

                      return (
                        <tr key={t.id} className="hover:bg-[#FAF9F6] transition-colors">
                          <td className="py-3 px-4 font-medium text-charcoal-navy">
                            {t.transfer_number || `#T-${t.id}`}
                          </td>
                          <td className="py-3 px-4 text-[#5A5750]">{originName}</td>
                          <td className="py-3 px-4 text-[#5A5750]">{destName}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                t.status === "completed"
                                  ? "bg-[#EDF7ED] text-[#1E4620]"
                                  : t.status === "cancelled"
                                    ? "bg-[#FDECEC] text-[#B42318]"
                                    : "bg-[#EBF5FB] text-[#004B87]"
                              }`}
                            >
                              {t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : "Pending"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-[#5A5750] font-medium">
                            {itemsCount}
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-[#78746A]">
                            {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isPending && (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleComplete(t.id)}
                                  className="rounded px-2 py-1 text-xs font-medium text-[#1E4620] hover:bg-[#EDF7ED] transition cursor-pointer"
                                  title="Mark as received and update stock"
                                >
                                  Complete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancel(t.id)}
                                  className="rounded px-2 py-1 text-xs font-medium text-[#B42318] hover:bg-[#FDECEC] transition cursor-pointer"
                                  title="Cancel this transfer"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* FOOTER LINK */}
          <div className="mt-8 mb-6 text-center">
            <a
              href="https://help.shopify.com/en/manual/products/inventory/transfers-purchase-orders/transfers"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#5A5750] hover:text-charcoal-navy hover:underline transition"
            >
              Learn more about managing inventory transfers
            </a>
          </div>
        </main>
      </div>

      {/* CREATE TRANSFER MODAL */}
      {isCreateOpen && (
        <CreateTransferModal
          locations={locations}
          products={products}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            flash("Transfer created successfully.");
            loadData();
          }}
        />
      )}
    </div>
  );
}

