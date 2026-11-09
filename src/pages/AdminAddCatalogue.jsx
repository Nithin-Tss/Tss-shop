import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import AssignMarketsModal from "@/components/AssignMarketsModal";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useCan } from "@/lib/auth";

const CATALOGUES = "/api/v1/catalog/catalogues/";
const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "CAD", "INR"];

export default function AdminAddCatalogue() {
  const navigate = useNavigate();
  const { catalogueId } = useParams();
  const canManage = useCan("products.manage");

  // General Information State
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("active");
  const [markets, setMarkets] = useState([]);
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);

  // Pricing State
  // Blank means the store's own currency
  const [currency, setCurrency] = useState("");
  const [priceAdjustment, setPriceAdjustment] = useState("0");
  const [adjustmentDirection, setAdjustmentDirection] = useState("decrease");
  const [includeCompareAtPrice, setIncludeCompareAtPrice] = useState(false);

  // Products Section State
  const [autoIncludeNewProducts, setAutoIncludeNewProducts] = useState(true);
  const [activeTab, setActiveTab] = useState("included");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sort Popover State (Product Title / Created, A-Z / Z-A)
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState("title"); // "title" | "created"
  const [sortDirection, setSortDirection] = useState("asc"); // "asc" | "desc"
  const sortMenuRef = useRef(null);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Products of the store, and which ones this catalog holds.
  // Included = not excluded, and (picked, or "automatically include" is on).
  const [products, setProducts] = useState([]);
  const [picked, setPicked] = useState(() => new Set());
  const [excluded, setExcluded] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const importRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [prods, existing] = await Promise.all([
        apiGet("/api/v1/catalog/products/"),
        catalogueId ? apiGet(`${CATALOGUES}${catalogueId}/`) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      if (prods.ok) setProducts(prods.data?.results ?? prods.data ?? []);
      if (existing?.ok) {
        const c = existing.data;
        setTitle(c.name);
        setStatus(c.status);
        setMarkets(c.markets);
        setCurrency(c.currency_code);
        setPriceAdjustment(String(Number(c.price_adjustment)));
        setAdjustmentDirection(c.adjustment_direction);
        setIncludeCompareAtPrice(c.include_compare_at_price);
        setAutoIncludeNewProducts(c.auto_include_new_products);
        setPicked(new Set(c.products));
        setExcluded(new Set(c.excluded_products));
      } else if (existing) {
        showToast(existing.error);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogueId]);

  const isIncluded = (id) => !excluded.has(id) && (autoIncludeNewProducts || picked.has(id));

  const toggleProduct = (id) => {
    const nextPicked = new Set(picked);
    const nextExcluded = new Set(excluded);
    if (isIncluded(id)) {
      nextPicked.delete(id);
      nextExcluded.add(id);
    } else {
      nextExcluded.delete(id);
      nextPicked.add(id);
    }
    setPicked(nextPicked);
    setExcluded(nextExcluded);
  };

  const visibleProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const direction = sortDirection === "asc" ? 1 : -1;
    const key = (p) => (sortBy === "created" ? (p.createdAt ?? "") : (p.title ?? "").toLowerCase());
    return products
      .filter((p) => (p.title ?? "").toLowerCase().includes(q))
      .filter((p) => activeTab === "all" || (activeTab === "included") === isIncluded(p.id))
      .sort((a, b) => (key(a) < key(b) ? -direction : key(a) > key(b) ? direction : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    products,
    searchQuery,
    activeTab,
    sortBy,
    sortDirection,
    picked,
    excluded,
    autoIncludeNewProducts,
  ]);

  // The product's base price with this catalog's percentage applied
  const adjustedPrice = (price) => {
    const base = Number(price);
    if (!Number.isFinite(base)) return "—";
    const pct = (Number(priceAdjustment) || 0) / 100;
    return (base * (adjustmentDirection === "increase" ? 1 + pct : 1 - pct)).toFixed(2);
  };

  // Included products as CSV: Title,Price
  const handleExportProducts = () => {
    const rows = products
      .filter((p) => isIncluded(p.id))
      .map((p) => `"${String(p.title).replace(/"/g, '""')}",${adjustedPrice(p.price)}`);
    if (!rows.length) return showToast("No included products to export.");
    const blob = new Blob(["Title,Price\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalog-products.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // A CSV whose first column is the product title: matching products become included
  const handleImportProducts = async (file) => {
    const titles = new Set(
      (await file.text())
        .split(/\r?\n/)
        .slice(1)
        .map((line) => line.split(",")[0].replace(/^"|"$/g, "").trim().toLowerCase())
        .filter(Boolean)
    );
    const matched = products.filter((p) => titles.has((p.title ?? "").toLowerCase()));
    const nextPicked = new Set(picked);
    const nextExcluded = new Set(excluded);
    matched.forEach((p) => {
      nextPicked.add(p.id);
      nextExcluded.delete(p.id);
    });
    setPicked(nextPicked);
    setExcluded(nextExcluded);
    showToast(`${matched.length} of ${titles.size} products matched.`);
  };

  // Close sort menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
    };
    if (isSortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSortOpen]);

  const handleRemoveMarket = (index) => {
    setMarkets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showToast("Please enter a catalog title.");
      return;
    }
    setIsSaving(true);
    const body = {
      name: title.trim(),
      status,
      markets,
      currency_code: currency,
      price_adjustment: String(Number(priceAdjustment) || 0),
      adjustment_direction: adjustmentDirection,
      include_compare_at_price: includeCompareAtPrice,
      auto_include_new_products: autoIncludeNewProducts,
      products: [...picked].filter((id) => !excluded.has(id)),
      excluded_products: [...excluded],
    };
    const res = catalogueId
      ? await apiPatch(`${CATALOGUES}${catalogueId}/`, body)
      : await apiPost(CATALOGUES, body);
    setIsSaving(false);
    if (!res.ok) {
      showToast(res.formError || Object.values(res.fieldErrors)[0] || "Couldn't save the catalog.");
      return;
    }
    showToast("Catalog saved successfully.");
    setTimeout(() => navigate("/admin/online-store/catalogues"), 500);
  };

  const currencyCode = currency || "store currency";

  return (
    <div className="min-h-screen bg-white text-ink">
      <AdminHeader />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white shadow-xl transition-all"
        >
          {toastMessage}
        </div>
      )}

      {/* BODY */}
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex flex-1 flex-col bg-slate-100 px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
          <div className="mx-auto w-full max-w-5xl">
            {/* TOP BAR / BREADCRUMB & SAVE ACTIONS */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Link
                  to="/admin/online-store/catalogues"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-orange-600 transition shadow-2xs"
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
                <h1 className="text-[20px] font-bold text-ink tracking-tight">
                  {catalogueId ? title || "Catalog" : "New catalog"}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/admin/online-store/catalogues")}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-orange-600 transition"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || loading || !canManage}
                  className="rounded-lg bg-orange-600 px-4 py-1.5 text-sm font-medium text-white shadow-xs hover:bg-orange-600/90 transition disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            {/* 1. GENERAL INFORMATION CARD */}
            <section
              aria-labelledby="general-info-heading"
              className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <h2 id="general-info-heading" className="sr-only">
                General Information
              </h2>

              {/* Title row */}
              <div>
                <label
                  htmlFor="catalog-title-input"
                  className="block text-xs font-semibold text-ink mb-1.5"
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
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-ink focus:border-orange-600 focus:outline-none pr-14"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
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
                      className="appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2 pr-8 text-sm font-medium text-ink focus:border-orange-600 focus:outline-none cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                    </select>
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                      ↕
                    </span>
                  </div>
                </div>
              </div>

              {/* Markets row */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">Markets</span>
                  {markets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {markets.map((m, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-ink"
                        >
                          {m}
                          <button
                            type="button"
                            onClick={() => handleRemoveMarket(idx)}
                            className="text-slate-400 hover:text-orange-600"
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
                  className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:underline"
                >
                  <span className="text-base leading-none">⊕</span>
                  Add a market
                </button>
              </div>
            </section>

            {/* 2. PRICING CARD */}
            <section
              aria-labelledby="pricing-heading"
              className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <h2
                id="pricing-heading"
                className="text-sm font-semibold text-ink mb-4 tracking-tight"
              >
                Pricing
              </h2>

              {/* Set prices in */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <label htmlFor="set-prices-currency" className="text-sm text-ink font-normal">
                    Set prices in
                  </label>
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-400 text-[10px] text-slate-600 cursor-help"
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
                    className="w-full sm:w-auto min-w-60 appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2 pr-8 text-sm text-ink focus:border-orange-600 focus:outline-none cursor-pointer"
                  >
                    <option value="">Store currency</option>
                    {CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                    ⌄
                  </span>
                </div>
              </div>

              {/* Price adjustment */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-sm text-ink font-normal">Price adjustment</div>

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
                      className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-right text-ink focus:border-orange-600 focus:outline-none pr-7"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                      %
                    </span>
                  </div>

                  {/* Decrease / Increase Dropdown */}
                  <div className="relative">
                    <select
                      aria-label="Adjustment direction"
                      value={adjustmentDirection}
                      onChange={(e) => setAdjustmentDirection(e.target.value)}
                      className="appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 pr-8 text-sm text-ink focus:border-orange-600 focus:outline-none cursor-pointer"
                    >
                      <option value="decrease">Decrease</option>
                      <option value="increase">Increase</option>
                    </select>
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-600">
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
                        includeCompareAtPrice ? "bg-ink" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          includeCompareAtPrice ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className="text-xs text-ink font-medium">Include compare-at price</span>
                  </label>
                </div>
              </div>
            </section>

            {/* 3. PRODUCTS SECTION */}
            <section
              aria-labelledby="products-heading"
              className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
            >
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200">
                <h2 id="products-heading" className="text-sm font-semibold text-ink">
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
                        autoIncludeNewProducts ? "bg-ink" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          autoIncludeNewProducts ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className="text-xs text-slate-600 font-normal">
                      Automatically include new products
                    </span>
                  </label>

                  {/* Export & Import buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleExportProducts}
                      className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-400 hover:bg-slate-200 hover:text-orange-600 transition"
                    >
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={() => importRef.current?.click()}
                      className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-400 hover:bg-slate-200 hover:text-orange-600 transition"
                    >
                      Import
                    </button>
                    <input
                      ref={importRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleImportProducts(e.target.files[0]);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Tabs & Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-200 bg-slate-50">
                {/* Left Tabs: Included, Excluded, All */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("included")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                      activeTab === "included"
                        ? "bg-slate-200 text-ink font-semibold"
                        : "text-slate-600 hover:text-orange-600"
                    }`}
                  >
                    Included
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("excluded")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                      activeTab === "excluded"
                        ? "bg-slate-200 text-ink font-semibold"
                        : "text-slate-600 hover:text-orange-600"
                    }`}
                  >
                    Excluded
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                      activeTab === "all"
                        ? "bg-slate-200 text-ink font-semibold"
                        : "text-slate-600 hover:text-orange-600"
                    }`}
                  >
                    All
                  </button>
                </div>

                {/* Right Action Toolbar matching reference */}
                <div className="flex items-center gap-1.5 text-slate-600">
                  {isSearchOpen && (
                    <input
                      type="text"
                      placeholder="Filter products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-ink focus:border-orange-600 focus:outline-none w-36 sm:w-48 shadow-2xs"
                    />
                  )}

                  {/* Combined Search & Filter Button */}
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-xs transition shadow-2xs ${
                      isSearchOpen
                        ? "border-orange-600 bg-slate-100"
                        : "border-slate-300 hover:bg-slate-100"
                    }`}
                    title="Search and filter products"
                    aria-label="Search and filter products"
                  >
                    <svg
                      className="h-3.5 w-3.5 text-ink"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="6.5" cy="6.5" r="4.5" />
                      <path d="M10 10L13.5 13.5" />
                    </svg>
                    <svg
                      className="h-3.5 w-3.5 text-ink"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    >
                      <line x1="2" y1="4" x2="14" y2="4" />
                      <line x1="2" y1="8" x2="11" y2="8" />
                      <line x1="2" y1="12" x2="7" y2="12" />
                    </svg>
                  </button>

                  {/* Sort Button and Popover Dropdown */}
                  <div className="relative" ref={sortMenuRef}>
                    <button
                      type="button"
                      id="sort-products-btn"
                      onClick={() => setIsSortOpen((prev) => !prev)}
                      className={`inline-flex items-center justify-center rounded-lg border bg-white px-2 py-1.5 text-xs transition shadow-2xs ${
                        isSortOpen
                          ? "border-orange-600 bg-slate-100"
                          : "border-slate-300 hover:bg-slate-100"
                      }`}
                      title="Sort products"
                      aria-label="Sort products"
                      aria-expanded={isSortOpen}
                    >
                      <svg
                        className="h-3.5 w-3.5 text-ink"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12.5V3.5M5 3.5L2.5 6M5 3.5L7.5 6" />
                        <path d="M11 3.5V12.5M11 12.5L8.5 10M11 12.5L13.5 10" />
                      </svg>
                    </button>

                    {/* SORT BY DROPDOWN POPOVER */}
                    {isSortOpen && (
                      <div
                        id="sort-by-popover"
                        role="menu"
                        aria-orientation="vertical"
                        className="absolute right-0 top-full mt-1.5 z-40 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                      >
                        <div className="px-2 pt-1 pb-2 text-[13px] font-semibold text-ink">
                          Sort by
                        </div>

                        {/* Radio: Product Title */}
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={sortBy === "title"}
                          onClick={() => setSortBy("title")}
                          className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-left text-[13px] text-ink hover:bg-slate-100 transition-colors"
                        >
                          <span
                            className={`w-4 h-4 rounded-full transition-all shrink-0 ${
                              sortBy === "title"
                                ? "border-[4.5px] border-[#18181B] bg-white"
                                : "border border-slate-400 bg-white hover:border-slate-600"
                            }`}
                          />
                          <span className="font-medium text-ink">Product Title</span>
                        </button>

                        {/* Radio: Created */}
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={sortBy === "created"}
                          onClick={() => setSortBy("created")}
                          className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-left text-[13px] text-ink hover:bg-slate-100 transition-colors"
                        >
                          <span
                            className={`w-4 h-4 rounded-full transition-all shrink-0 ${
                              sortBy === "created"
                                ? "border-[4.5px] border-[#18181B] bg-white"
                                : "border border-slate-400 bg-white hover:border-slate-600"
                            }`}
                          />
                          <span className="font-normal text-ink">Created</span>
                        </button>

                        {/* Divider */}
                        <div className="border-t border-slate-200 my-1.5" />

                        {/* Direction: Ascending (A-Z) */}
                        <button
                          type="button"
                          onClick={() => setSortDirection("asc")}
                          className={`flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-left text-[13px] font-medium transition-colors ${
                            sortDirection === "asc"
                              ? "bg-[rgba(24,24,27,0.06)] text-ink"
                              : "text-ink hover:bg-slate-100"
                          }`}
                        >
                          <svg
                            className="h-3.5 w-3.5 text-ink shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 16 16"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M8 13.5V2.5M8 2.5L3.5 7M8 2.5L12.5 7" />
                          </svg>
                          <span>A-Z</span>
                        </button>

                        {/* Direction: Descending (Z-A) */}
                        <button
                          type="button"
                          onClick={() => setSortDirection("desc")}
                          className={`flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-left text-[13px] font-medium transition-colors ${
                            sortDirection === "desc"
                              ? "bg-[rgba(24,24,27,0.06)] text-ink"
                              : "text-ink hover:bg-slate-100"
                          }`}
                        >
                          <svg
                            className="h-3.5 w-3.5 text-ink shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 16 16"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M8 2.5V13.5M8 13.5L3.5 9M8 13.5L12.5 9" />
                          </svg>
                          <span>Z-A</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PRODUCTS TABLE STRUCTURE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          disabled
                          className="h-4 w-4 rounded border-slate-300 text-ink focus:ring-black cursor-not-allowed opacity-50"
                          aria-label="Select all products"
                        />
                      </th>
                      <th className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          Product
                          <span className="text-xs text-slate-400">↕</span>
                        </span>
                      </th>
                      <th className="px-4 py-3">Price in {currencyCode}</th>
                      <th className="px-4 py-3">Compare-at price</th>
                      <th className="px-4 py-3 text-right">Rules</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProducts.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-100">
                        <td className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isIncluded(p.id)}
                            onChange={() => toggleProduct(p.id)}
                            aria-label={`Include ${p.title}`}
                            className="h-4 w-4 rounded border-slate-300 text-ink"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-ink">{p.title}</td>
                        <td className="px-4 py-3">{adjustedPrice(p.price)}</td>
                        <td className="px-4 py-3 text-slate-600">—</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-600">
                          {Number(priceAdjustment) > 0
                            ? `${priceAdjustment}% ${adjustmentDirection}`
                            : "None"}
                        </td>
                      </tr>
                    ))}
                    {!visibleProducts.length && (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <p className="text-sm font-medium text-ink">
                            {loading
                              ? "Loading products…"
                              : products.length
                                ? "No products match"
                                : "No products in this store yet"}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* ASSIGN MARKETS MODAL */}
      {isMarketModalOpen && (
        <AssignMarketsModal
          isOpen={isMarketModalOpen}
          onClose={() => setIsMarketModalOpen(false)}
          selectedMarkets={markets}
          onConfirm={(selectedList) => setMarkets(selectedList)}
        />
      )}
    </div>
  );
}
