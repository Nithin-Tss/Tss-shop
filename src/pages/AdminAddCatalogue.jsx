import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";

export default function AdminAddCatalogue() {
  const navigate = useNavigate();

  // General Information State
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("Active");
  const [markets, setMarkets] = useState([]);
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [newMarketName, setNewMarketName] = useState("");

  // Pricing State
  const [currency, setCurrency] = useState("Store currency (AUD $)");
  const [priceAdjustment, setPriceAdjustment] = useState("0");
  const [adjustmentDirection, setAdjustmentDirection] = useState("Decrease");
  const [includeCompareAtPrice, setIncludeCompareAtPrice] = useState(false);

  // Products Section State
  const [autoIncludeNewProducts, setAutoIncludeNewProducts] = useState(true);
  const [activeTab, setActiveTab] = useState("included");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddMarket = (e) => {
    e.preventDefault();
    if (newMarketName.trim()) {
      setMarkets((prev) => [...prev, newMarketName.trim()]);
      setNewMarketName("");
      setIsMarketModalOpen(false);
      showToast("Market added to catalog.");
    }
  };

  const handleRemoveMarket = (index) => {
    setMarkets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!title.trim()) {
      showToast("Please enter a catalog title.");
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast("Catalog saved successfully.");
      setTimeout(() => {
        navigate("/admin/online-store/catalogues");
      }, 500);
    }, 400);
  };

  // Currency code extractor (e.g. "AUD", "USD")
  const currencyCode = currency.includes("(")
    ? currency.substring(currency.indexOf("(") + 1, currency.indexOf("(") + 4)
    : "AUD";

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A]">
      <AdminHeader />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 rounded-lg bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white shadow-xl transition-all"
        >
          {toastMessage}
        </div>
      )}

      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT */}
        <main className="flex flex-1 flex-col bg-[#F1F2F4] px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
          <div className="mx-auto w-full max-w-5xl">
            {/* TOP BAR / BREADCRUMB & SAVE ACTIONS */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Link
                  to="/admin/online-store/catalogues"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D2D5D8] bg-white text-[#5C5F62] hover:bg-[#F6F6F7] hover:text-[#1A1A1A] transition shadow-2xs"
                  aria-label="Back to catalogs"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <h1 className="text-[20px] font-bold text-[#1A1A1A] tracking-tight">New catalog</h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/admin/online-store/catalogues")}
                  className="rounded-lg border border-[#D2D5D8] bg-white px-3.5 py-1.5 text-sm font-medium text-[#5C5F62] hover:bg-[#F6F6F7] hover:text-[#1A1A1A] transition"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-lg bg-[#1A1A1A] px-4 py-1.5 text-sm font-medium text-white shadow-xs hover:bg-[#303030] transition disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            {/* 1. GENERAL INFORMATION CARD */}
            <section
              aria-labelledby="general-info-heading"
              className="mb-4 rounded-2xl border border-[#E1E3E5] bg-white p-5 shadow-xs"
            >
              <h2 id="general-info-heading" className="sr-only">
                General Information
              </h2>

              {/* Title row */}
              <div>
                <label
                  htmlFor="catalog-title-input"
                  className="block text-xs font-semibold text-[#1A1A1A] mb-1.5"
                >
                  Title
                </label>
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-1">
                    <input
                      id="catalog-title-input"
                      type="text"
                      maxLength={255}
                      placeholder=""
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-lg border border-[#D2D5D8] px-3.5 py-2 text-sm text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none pr-14"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8C9196]">
                      {title.length}/255
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <div className="relative shrink-0">
                    <select
                      id="catalog-status-select"
                      aria-label="Catalog status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="appearance-none rounded-lg border border-[#D2D5D8] bg-white px-3.5 py-2 pr-8 text-sm font-medium text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Draft">Draft</option>
                    </select>
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#5C5F62]">
                      ↕
                    </span>
                  </div>
                </div>
              </div>

              {/* Markets row */}
              <div className="mt-4 pt-4 border-t border-[#F1F2F4] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#1A1A1A]">Markets</span>
                  {markets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {markets.map((m, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-md bg-[#F1F2F4] px-2 py-0.5 text-xs font-medium text-[#1A1A1A]"
                        >
                          {m}
                          <button
                            type="button"
                            onClick={() => handleRemoveMarket(idx)}
                            className="text-[#8C9196] hover:text-[#1A1A1A]"
                            aria-label={`Remove market ${m}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsMarketModalOpen(true)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#1A1A1A] hover:underline"
                >
                  <span className="text-base leading-none">⊕</span>
                  Add a market
                </button>
              </div>
            </section>

            {/* 2. PRICING CARD */}
            <section
              aria-labelledby="pricing-heading"
              className="mb-4 rounded-2xl border border-[#E1E3E5] bg-white p-5 shadow-xs"
            >
              <h2
                id="pricing-heading"
                className="text-sm font-semibold text-[#1A1A1A] mb-4 tracking-tight"
              >
                Pricing
              </h2>

              {/* Set prices in */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="set-prices-currency"
                    className="text-sm text-[#1A1A1A] font-normal"
                  >
                    Set prices in
                  </label>
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#8C9196] text-[10px] text-[#5C5F62] cursor-help"
                    title="Choose which currency catalog prices will be denominated in."
                  >
                    ⓘ
                  </span>
                </div>

                <div className="relative">
                  <select
                    id="set-prices-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full sm:w-auto min-w-[240px] appearance-none rounded-lg border border-[#D2D5D8] bg-white px-3.5 py-2 pr-8 text-sm text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none cursor-pointer"
                  >
                    <option value="Store currency (AUD $)">Store currency (AUD $)</option>
                    <option value="Store currency (USD $)">Store currency (USD $)</option>
                    <option value="Store currency (CAD $)">Store currency (CAD $)</option>
                    <option value="Store currency (EUR €)">Store currency (EUR €)</option>
                    <option value="Store currency (GBP £)">Store currency (GBP £)</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#5C5F62]">
                    ⌄
                  </span>
                </div>
              </div>

              {/* Price adjustment */}
              <div className="mt-4 pt-4 border-t border-[#F1F2F4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-sm text-[#1A1A1A] font-normal">Price adjustment</div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Percentage Adjustment Input */}
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      aria-label="Price adjustment percentage"
                      value={priceAdjustment}
                      onChange={(e) => setPriceAdjustment(e.target.value)}
                      className="w-20 rounded-lg border border-[#D2D5D8] px-3 py-1.5 text-sm text-right text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none pr-7"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#5C5F62]">
                      %
                    </span>
                  </div>

                  {/* Decrease / Increase Dropdown */}
                  <div className="relative">
                    <select
                      aria-label="Adjustment direction"
                      value={adjustmentDirection}
                      onChange={(e) => setAdjustmentDirection(e.target.value)}
                      className="appearance-none rounded-lg border border-[#D2D5D8] bg-white px-3.5 py-1.5 pr-8 text-sm text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none cursor-pointer"
                    >
                      <option value="Decrease">Decrease</option>
                      <option value="Increase">Increase</option>
                    </select>
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#5C5F62]">
                      ↕
                    </span>
                  </div>

                  {/* Include compare-at price Switch */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={includeCompareAtPrice}
                      onClick={() => setIncludeCompareAtPrice((prev) => !prev)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
                        includeCompareAtPrice ? "bg-[#1A1A1A]" : "bg-[#D2D5D8]"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          includeCompareAtPrice ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className="text-xs text-[#1A1A1A] font-medium">
                      Include compare-at price
                    </span>
                  </label>
                </div>
              </div>
            </section>

            {/* 3. PRODUCTS SECTION */}
            <section
              aria-labelledby="products-heading"
              className="rounded-2xl border border-[#E1E3E5] bg-white shadow-xs overflow-hidden"
            >
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[#E1E3E5]">
                <h2 id="products-heading" className="text-sm font-semibold text-[#1A1A1A]">
                  Products
                </h2>

                <div className="flex items-center gap-4">
                  {/* Automatically include new products toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoIncludeNewProducts}
                      onClick={() => setAutoIncludeNewProducts((prev) => !prev)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
                        autoIncludeNewProducts ? "bg-[#1A1A1A]" : "bg-[#D2D5D8]"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          autoIncludeNewProducts ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className="text-xs text-[#5C5F62] font-normal">
                      Automatically include new products
                    </span>
                  </label>

                  {/* Export & Import buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => showToast("Export will be available when products are added.")}
                      className="rounded-lg bg-[#EFEFEF] px-3 py-1 text-xs font-medium text-[#8C9196] hover:bg-[#E4E5E7] hover:text-[#1A1A1A] transition"
                    >
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={() => showToast("Import will be available when products are added.")}
                      className="rounded-lg bg-[#EFEFEF] px-3 py-1 text-xs font-medium text-[#8C9196] hover:bg-[#E4E5E7] hover:text-[#1A1A1A] transition"
                    >
                      Import
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs & Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-[#E1E3E5] bg-[#FAFBFB]">
                {/* Left Tabs: Included, Excluded, All */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("included")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                      activeTab === "included"
                        ? "bg-[#E4E5E7] text-[#1A1A1A] font-semibold"
                        : "text-[#5C5F62] hover:text-[#1A1A1A]"
                    }`}
                  >
                    Included
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("excluded")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                      activeTab === "excluded"
                        ? "bg-[#E4E5E7] text-[#1A1A1A] font-semibold"
                        : "text-[#5C5F62] hover:text-[#1A1A1A]"
                    }`}
                  >
                    Excluded
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                      activeTab === "all"
                        ? "bg-[#E4E5E7] text-[#1A1A1A] font-semibold"
                        : "text-[#5C5F62] hover:text-[#1A1A1A]"
                    }`}
                  >
                    All
                  </button>
                </div>

                {/* Right Action Icons */}
                <div className="flex items-center gap-1 text-[#5C5F62]">
                  {isSearchOpen && (
                    <input
                      type="text"
                      placeholder="Filter products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-lg border border-[#D2D5D8] bg-white px-2.5 py-0.5 text-xs text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none w-36 sm:w-48"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen((prev) => !prev)}
                    className="p-1.5 rounded-md hover:bg-[#EFEFEF] hover:text-[#1A1A1A] transition"
                    title="Search products"
                    aria-label="Search products"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-md hover:bg-[#EFEFEF] hover:text-[#1A1A1A] transition"
                    title="Filter options"
                    aria-label="Filter options"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-md hover:bg-[#EFEFEF] hover:text-[#1A1A1A] transition"
                    title="Sort products"
                    aria-label="Sort products"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* PRODUCTS TABLE STRUCTURE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#E1E3E5] bg-[#FAFBFB] text-xs font-semibold text-[#5C5F62]">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          disabled
                          className="h-4 w-4 rounded border-[#D2D5D8] text-[#1A1A1A] focus:ring-black cursor-not-allowed opacity-50"
                          aria-label="Select all products"
                        />
                      </th>
                      <th className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          Product
                          <span className="text-xs text-[#8C9196]">↕</span>
                        </span>
                      </th>
                      <th className="px-4 py-3">Price in {currencyCode}</th>
                      <th className="px-4 py-3">Compare-at price</th>
                      <th className="px-4 py-3 text-right">Rules</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Empty table state ready for dynamic integration */}
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F2F4] text-[#8C9196] mb-3">
                            <svg
                              className="h-6 w-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth="1.6"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                              />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-[#1A1A1A]">
                            No products in this catalog yet
                          </p>
                          <p className="mt-1 text-xs text-[#5C5F62] max-w-sm">
                            When products are added to this catalog, they will appear here with
                            custom pricing and comparison rates.
                          </p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* ADD MARKET MODAL */}
      {isMarketModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-market-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-[#E1E3E5]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E3E5]">
              <h3 id="add-market-modal-title" className="text-sm font-semibold text-[#1A1A1A]">
                Add market
              </h3>
              <button
                type="button"
                onClick={() => setIsMarketModalOpen(false)}
                className="text-[#5C5F62] hover:text-[#1A1A1A] text-lg font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMarket} className="mt-4 flex flex-col gap-3">
              <div>
                <label
                  htmlFor="market-name-input"
                  className="block text-xs font-semibold text-[#1A1A1A] mb-1"
                >
                  Market name *
                </label>
                <input
                  id="market-name-input"
                  type="text"
                  required
                  placeholder="e.g. Australia, United States, Europe"
                  value={newMarketName}
                  onChange={(e) => setNewMarketName(e.target.value)}
                  className="w-full rounded-lg border border-[#D2D5D8] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none"
                />
              </div>

              <div className="mt-2 flex items-center justify-end gap-2 pt-3 border-t border-[#E1E3E5]">
                <button
                  type="button"
                  onClick={() => setIsMarketModalOpen(false)}
                  className="rounded-lg border border-[#D2D5D8] bg-white px-3.5 py-1.5 text-xs font-medium text-[#1A1A1A] hover:bg-[#F6F6F7] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newMarketName.trim()}
                  className="rounded-lg bg-[#1A1A1A] px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#303030] transition disabled:opacity-50"
                >
                  Add market
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
