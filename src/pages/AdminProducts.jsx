
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "@/lib/api";

const menuItems = [
  { icon: "⌂", label: "Home", href: "/admin/online-store/home" },
  { icon: "▣", label: "Orders",  href: "/admin/online-store/orders" },
  { icon: "◇", label: "Products", href: "/admin/online-store/products", active: true },
  { icon: "♙", label: "Catalogues", href: "/admin/online-store/catalogues" },
  { icon: "▥", label: "Inventory", href: "/admin/online-store/inventory" },
  { icon: "⌁", label: "Content", href: "/admin/online-store/content" },
];

const lineIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#161C2C] px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(22,28,44,0.25)] hover:bg-[#252E45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/40 focus-visible:ring-offset-2 transition disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";

const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#D8DFE8] bg-white px-4 text-sm font-medium text-[#161C2C] hover:border-[#161C2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/30 transition disabled:cursor-not-allowed disabled:opacity-40";

export default function ProductsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [notice, setNotice] = useState("");
  // The store's products, from /api/v1/catalog/products/
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    apiRequest("/api/v1/catalog/products/")
      .then((data) => !cancelled && setProducts(data.map(toRow)))
      .catch((error) => !cancelled && setLoadError(error.message));

    return () => {
      cancelled = true;
    };
  }, []);

  // Hide the success message after a few seconds
  useEffect(() => {
    if (!notice) return undefined;

    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const openAddForm = () => {
    setNotice("");
    setShowAddForm(true);
  };

  const handleSaved = (product) => {
    setProducts((current) => [toRow(product), ...current]);
    setShowAddForm(false);
    setNotice(`“${product.title}” was added.`);
  };

  return (
    <div className="min-h-screen bg-white text-[#161C2C]">

      {/* HEADER */}
      <header className="h-[72px] border-b border-gray-200 flex items-center justify-between px-7">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#161C2C] flex items-center justify-center">
            <span className="text-white text-2xl font-bold">S</span>
          </div>

          <span className="text-[22px] font-bold">
            Store
          </span>
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center w-[420px] h-11 rounded-full bg-[#F3F6FA] px-5 gap-3">
          <span className="text-xl">⌕</span>

          <input
            type="text"
            placeholder="Search anything..."
            className="w-full bg-transparent outline-none text-sm text-[#161C2C] placeholder:text-slate-500"
          />
        </div>

        {/* Right */}
        <div className="flex items-center gap-6">

          <button className="relative text-2xl">
            ♧
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#161C2C] text-white flex items-center justify-center font-medium">
              A
            </div>

            <span className="text-sm font-medium">
              Admin
            </span>

            <span>⌄</span>
          </div>

        </div>
      </header>


      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">

        {/* SIDEBAR */}
        <aside className="hidden md:flex w-[256px] bg-[#161C2C] text-white flex-col">

          <nav className="px-4 py-6 space-y-1">

            {menuItems.map((item) => {
              // Items with a page are links
              const Row = item.href ? Link : "div";

              return (
                <Row
                  key={item.label}
                  to={item.href}
                  className={`h-11 px-3 rounded-lg flex items-center justify-between transition ${
                    item.active ? "bg-[#30466F] font-medium" : "hover:bg-white/10"
                  }`}
                >

                  <div className="flex items-center gap-4">
                    <span className="w-5 text-center text-lg">
                      {item.icon}
                    </span>

                    <span className="text-sm">
                      {item.label}
                    </span>
                  </div>

                  {item.badge && (
                    <span className="bg-[#53627E] px-2.5 py-1 rounded-full text-xs">
                      {item.badge}
                    </span>
                  )}

                </Row>
              );
            })}


            {/* ONLINE STORE */}
            <div className="pt-5">

              <div className="h-11 px-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-lg">▣</span>

                  <span className="text-sm">
                    Online Store
                  </span>
                </div>

                <span>⌃</span>
              </div>


              {/* THEMES */}
              <Link
                to="/admin/online-store"
                className="mt-1 h-11 rounded-lg px-4 flex items-center gap-4 hover:bg-white/10 transition"
              >
                <span className="text-lg">◉</span>

                <span className="text-sm">
                  Themes
                </span>
              </Link>


              {/* PAGES */}
              <div className="h-11 px-4 flex items-center gap-4">
                <span className="text-lg">▤</span>

                <span className="text-sm">
                  Pages
                </span>
              </div>


              {/* BLOG */}
              <div className="h-11 px-4 flex items-center gap-4">
                <span className="text-lg">✎</span>

                <span className="text-sm">
                  Blog Posts
                </span>
              </div>

            </div>


            {/* APPS */}
            <div className="pt-5">

              <div className="h-11 px-3 flex items-center justify-between">

                <div className="flex items-center gap-4">
                  <span className="text-lg">◉</span>

                  <span className="text-sm">
                    Apps
                  </span>
                </div>

                <span>⌄</span>

              </div>

            </div>

          </nav>


          {/* SETTINGS */}
          <div className="mt-auto px-7 pb-8 flex items-center gap-4">
            <span className="text-xl">⚙</span>

            <span className="text-sm">
              Settings
            </span>
          </div>

        </aside>


        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1 bg-[#F7F8FA] px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-[1280px]">
            {showAddForm ? (
              <AddProductForm
                onClose={() => setShowAddForm(false)}
                onSaved={handleSaved}
              />
            ) : (
              <>
              {loadError && (
                <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  Couldn't load products: {loadError}
                </p>
              )}
              <ProductsOverview
                products={products}
                notice={notice}
                onDismissNotice={() => setNotice("")}
                onNotice={setNotice}
                onAddProduct={openAddForm}
              />
              </>
            )}
          </div>
        </main>

      </div>

    </div>
  );
}


/* ------------------------------------------------------------------ */
/* PRODUCTS OVERVIEW                                                   */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

const SORTERS = {
  newest: (a, b) => b.createdAt - a.createdAt,
  oldest: (a, b) => a.createdAt - b.createdAt,
  title: (a, b) => a.title.localeCompare(b.title),
  "price-asc": (a, b) => Number(a.price || 0) - Number(b.price || 0),
  "price-desc": (a, b) => Number(b.price || 0) - Number(a.price || 0),
};

const productRowGrid =
  "md:grid md:grid-cols-[minmax(0,2.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_110px] md:items-center md:gap-4";

function initials(title) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function stockLabel(product) {
  if (!product.track_quantity) return <span className="text-[#53627E]">Not tracked</span>;

  const quantity = Number(product.quantity || 0);

  if (quantity === 0) return <span className="font-medium text-[#D72C0D]">Out of stock</span>;

  return (
    <span>
      <span className="font-medium tabular-nums">{quantity}</span>
      <span className="text-[#53627E]"> in stock</span>
    </span>
  );
}

function downloadCsv(products) {
  const header = ["Title", "Status", "Category", "Type", "Vendor", "SKU", "Price", "Quantity"];
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const lines = [
    header.join(","),
    ...products.map((p) =>
      [p.title, p.status, p.category, p.product_type, p.vendor, p.sku, p.price, p.quantity].map(escape).join(",")
    ),
  ];

  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "products.csv";
  link.click();
  URL.revokeObjectURL(url);
}

// Bigger version of a button style for the page header
const largeButton = (base) =>
  base.replace("h-10", "h-11").replace("px-4", "px-5").replace("text-sm", "text-[15px]");

function ProductsOverview({ products, notice, onDismissNotice, onNotice, onAddProduct }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [importOpen, setImportOpen] = useState(false);

  const handleImported = () => {
    setImportOpen(false);
    onNotice("Products file selected successfully. Backend import will be connected later.");
  };

  const counts = useMemo(() => {
    const result = { all: products.length, active: 0, draft: 0, scheduled: 0, units: 0 };

    products.forEach((product) => {
      if (product.status in result) result[product.status] += 1;
      if (product.track_quantity) result.units += Number(product.quantity || 0);
    });

    return result;
  }, [products]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products
      .filter((product) => statusFilter === "all" || product.status === statusFilter)
      .filter(
        (product) =>
          !term ||
          [product.title, product.sku, product.vendor, product.product_type, product.category]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(term))
      )
      .sort(SORTERS[sort]);
  }, [products, search, statusFilter, sort]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const stats = [
    { label: "Total products", value: counts.all },
    { label: "Active", value: counts.active, dot: STATUS_STYLES.active.dot },
    { label: "Drafts", value: counts.draft, dot: STATUS_STYLES.draft.dot },
    { label: "Units in stock", value: counts.units.toLocaleString() },
  ];

  return (
    <>

      {/* Success message */}
      {notice && (
        <div
          role="status"
          className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {notice}

          <button
            type="button"
            aria-label="Dismiss message"
            onClick={onDismissNotice}
            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-emerald-100 transition"
          >
            ×
          </button>
        </div>
      )}


      {/* Header + stats: centred in the page while the catalogue is empty */}
      <div
        className={`mx-auto w-full max-w-[1120px] ${
          products.length === 0 ? "flex min-h-[calc(100vh-11rem)] flex-col justify-center" : ""
        }`}
      >

        {/* PAGE HEADER */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[34px] font-semibold leading-tight tracking-tight">Products</h1>

            <p className="mt-1.5 text-base text-[#53627E]">
              Create, organise and price everything you sell.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setImportOpen(true)} className={largeButton(primaryButton)}>
              <svg {...lineIcon} strokeWidth="1.8" className="h-[18px] w-[18px]">
                <path d="M12 15V4M7 9l5-5 5 5M5 20h14" />
              </svg>
              Import
            </button>

            {/* The empty state has its own Add Product button */}
            {products.length > 0 && (
              <button type="button" onClick={onAddProduct} className={largeButton(primaryButton)}>
                <span className="text-lg leading-none">+</span>
                Add Product
              </button>
            )}
          </div>
        </div>


        {/* STATS */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#D8DFE8]/80 bg-white px-6 py-5 shadow-[0_1px_3px_rgba(22,28,44,0.05)]"
            >
              <p className="flex items-center gap-2 text-sm text-[#53627E]">
                {stat.dot && <span className={`h-2 w-2 rounded-full ${stat.dot}`} />}
                {stat.label}
              </p>

              <p className="mt-2 text-[30px] font-semibold leading-none tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>


        {/* EMPTY STATE (shown instead of the table while there are no products) */}
        {products.length === 0 && (
          <section
            aria-labelledby="products-empty-heading"
            className="mt-6 flex flex-col items-center rounded-2xl border border-[#D8DFE8]/80 bg-white px-6 py-14 text-center shadow-[0_1px_3px_rgba(22,28,44,0.05)] sm:py-16"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7F8FA] text-[#161C2C] ring-1 ring-[#D8DFE8]">
              <svg {...lineIcon} strokeWidth="1.6" className="h-8 w-8">
                <path d="M4 8l8-4 8 4v8l-8 4-8-4Z" />
                <path d="M4 8l8 4 8-4M12 12v8" />
              </svg>
            </span>

            <h2 id="products-empty-heading" className="mt-5 text-xl font-semibold text-[#161C2C]">
              No products yet
            </h2>

            <p className="mt-1.5 max-w-[360px] text-sm text-[#53627E]">
              Add your first product to start building your store.
            </p>

            <button type="button" onClick={onAddProduct} className={`${primaryButton} mt-6`}>
              <span className="text-base leading-none">+</span>
              Add Product
            </button>
          </section>
        )}

      </div>


      {/* PRODUCT WORKSPACE (hidden until there are products) */}
      {products.length > 0 && (
      <section className="mt-6 overflow-hidden rounded-2xl border border-[#D8DFE8]/80 bg-white shadow-[0_1px_3px_rgba(22,28,44,0.05)]">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[#D8DFE8]/80 p-3 sm:p-4">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Search products</span>

            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#53627E]">
              <svg {...lineIcon} strokeWidth="1.8" className="h-4 w-4">
                <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4" />
              </svg>
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, SKU, vendor or category"
              className="h-10 w-full rounded-xl border border-transparent bg-[#F7F8FA] pl-10 pr-3 text-sm outline-none placeholder:text-[#8A96AB] focus:border-[#D8DFE8] focus:bg-white transition"
            />
          </label>

          <div role="group" aria-label="Filter by status" className="flex max-w-full overflow-x-auto rounded-xl bg-[#F7F8FA] p-1">
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition ${
                    isActive
                      ? "bg-white font-medium text-[#161C2C] shadow-[0_1px_2px_rgba(22,28,44,0.08)]"
                      : "text-[#53627E] hover:text-[#161C2C]"
                  }`}
                >
                  {filter.label}
                  <span className="text-xs tabular-nums text-[#53627E]">{counts[filter.value]}</span>
                </button>
              );
            })}
          </div>

          <label className="relative flex h-10 items-center gap-2 rounded-xl border border-[#D8DFE8] bg-white pl-3 text-sm">
            <span className="text-[#53627E]">Sort</span>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="h-full cursor-pointer appearance-none bg-transparent pr-8 font-medium outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <span className="pointer-events-none absolute right-3">{chevron}</span>
          </label>

          <button
            type="button"
            onClick={() => downloadCsv(visible)}
            disabled={visible.length === 0}
            className={secondaryButton}
          >
            <svg {...lineIcon} strokeWidth="1.8" className="h-4 w-4">
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
            </svg>
            Export
          </button>
        </div>


        {/* Column labels */}
        {visible.length > 0 && (
          <div className={`hidden bg-[#FBFCFD] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#53627E] ${productRowGrid}`}>
            <span>Product</span>
            <span>SKU</span>
            <span>Stock</span>
            <span>Status</span>
            <span className="text-right">Price</span>
          </div>
        )}


        {/* Rows */}
        {visible.length > 0 && (
          <ul className="divide-y divide-[#D8DFE8]/60">
            {visible.map((product) => {
              const status = STATUS_STYLES[product.status] || STATUS_STYLES.draft;
              const subtitle = [product.category, product.vendor].filter(Boolean).join(" · ");

              return (
                <li
                  key={product.id}
                  className={`grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 px-5 py-4 text-sm hover:bg-[#F7F8FA]/70 transition ${productRowGrid}`}
                >
                  <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF1F6] text-xs font-semibold text-[#30466F]">
                      {initials(product.title)}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate font-medium">{product.title}</p>
                      <p className="truncate text-xs text-[#53627E]">{subtitle || "No category or vendor"}</p>
                    </div>
                  </div>

                  <span className="hidden truncate font-mono text-xs text-[#53627E] md:block">{product.sku || "—"}</span>

                  <span className="text-[13px]">{stockLabel(product)}</span>

                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium max-md:justify-self-end">
                    <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>

                  <span className="col-span-2 font-semibold tabular-nums md:col-span-1 md:text-right">
                    {formatMoney(product.price || 0)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}


        {/* No matches */}
        {products.length > 0 && visible.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="font-medium">No products match your filters</p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 text-sm font-medium text-[#30466F] underline-offset-4 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}


        {/* Footer */}
        {products.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#D8DFE8]/80 bg-[#FBFCFD] px-5 py-3 text-xs text-[#53627E]">
            <span>Showing {visible.length} of {products.length} products</span>
            <span>Products added here are kept until you reload the page.</span>
          </div>
        )}

      </section>
      )}


      {importOpen && (
        <ImportProductsModal
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
        />
      )}
    </>
  );
}


/* ------------------------------------------------------------------ */
/* IMPORT PRODUCTS                                                     */
/* ------------------------------------------------------------------ */

const IMPORT_EXTENSIONS = ["csv", "xls", "xlsx"];
const IMPORT_MAX_BYTES = 25 * 1024 * 1024;

const IMPORT_BADGES = {
  csv: "bg-[#E8EEF8] text-[#30466F]",
  xls: "bg-emerald-50 text-emerald-700",
  xlsx: "bg-emerald-50 text-emerald-700",
};

function fileExtension(name) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Returns an error message, or "" when the file can be imported
function validateImportFile(file) {
  if (!IMPORT_EXTENSIONS.includes(fileExtension(file.name))) {
    return "Only CSV, XLS and XLSX files are supported.";
  }

  if (file.size > IMPORT_MAX_BYTES) {
    return "File size must be less than 25 MB.";
  }

  return "";
}

function ImportProductsModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const browseRef = useRef(null);
  const onCloseRef = useRef(onClose);

  onCloseRef.current = onClose;

  // Focus the dialog's main action once, and close on Escape
  useEffect(() => {
    browseRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectFile = (candidate) => {
    if (!candidate) return;

    const message = validateImportFile(candidate);

    // Never keep an invalid file selected
    setError(message);
    setFile(message ? null : candidate);
  };

  const removeFile = () => {
    setFile(null);
    setError("");
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  };

  // TODO: send `file` to the backend import endpoint once it exists
  const handleImport = () => {
    if (!file || validateImportFile(file)) return;

    onImported(file);
  };

  const extension = file ? fileExtension(file.name) : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#161C2C]/50 px-4 py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-products-title"
        aria-describedby="import-products-description"
        className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(22,28,44,0.25)]"
      >

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#D8DFE8] px-6 py-5">
          <div>
            <h2 id="import-products-title" className="text-lg font-semibold text-[#161C2C]">
              Import Products
            </h2>

            <p id="import-products-description" className="mt-0.5 text-sm text-[#53627E]">
              Upload a spreadsheet to add products in bulk.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg text-[#53627E] hover:bg-[#F7F8FA] hover:text-[#161C2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/30 transition"
          >
            ×
          </button>
        </div>


        {/* Body */}
        <div className="space-y-4 px-6 py-6">

          {/* Drop zone */}
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              // Ignore leaving into a child element
              if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
            }}
            onDrop={handleDrop}
            className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-9 text-center transition ${
              dragging
                ? "border-[#161C2C] bg-[#EEF1F6]"
                : error
                  ? "border-[#D72C0D]/50 bg-[#D72C0D]/[0.03]"
                  : "border-[#D8DFE8] bg-[#F7F8FA] hover:border-[#53627E]"
            }`}
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition ${
                dragging ? "bg-[#161C2C] text-white" : "bg-white text-[#30466F]"
              }`}
            >
              <svg {...lineIcon} strokeWidth="1.8" className="h-6 w-6">
                <path d="M12 15V4M7 9l5-5 5 5" />
                <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
              </svg>
            </span>

            <p className="mt-4 text-sm font-semibold text-[#161C2C]">
              {dragging ? "Drop your file to upload" : "Drag & drop your file here"}
            </p>

            <p className="my-2 text-xs uppercase tracking-[0.12em] text-[#53627E]">or</p>

            <button
              ref={browseRef}
              type="button"
              onClick={() => inputRef.current?.click()}
              className={secondaryButton}
            >
              Browse Files
            </button>

            <p className="mt-4 text-xs text-[#53627E]">
              Supported formats: CSV, XLS, XLSX · Maximum file size: 25 MB
            </p>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              aria-label="Choose a products file"
              onChange={(event) => {
                selectFile(event.target.files?.[0]);
                // Allow picking the same file again after removing it
                event.target.value = "";
              }}
            />
          </div>


          {/* Validation error */}
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-[#D72C0D]/25 bg-[#D72C0D]/5 px-3.5 py-2.5 text-sm text-[#D72C0D]">
              <span aria-hidden="true" className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold">
                !
              </span>
              {error}
            </p>
          )}


          {/* Selected file */}
          {file && (
            <div className="flex items-center gap-3 rounded-xl border border-[#D8DFE8] bg-white px-3.5 py-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold uppercase ${IMPORT_BADGES[extension]}`}
              >
                {extension}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#161C2C]">{file.name}</p>
                <p className="text-xs text-[#53627E]">
                  {formatFileSize(file.size)} · {extension.toUpperCase()} file
                </p>
              </div>

              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={removeFile}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg text-[#53627E] hover:bg-[#D72C0D]/5 hover:text-[#D72C0D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/30 transition"
              >
                ×
              </button>
            </div>
          )}

        </div>


        {/* Footer */}
        <div className="flex flex-col-reverse gap-2.5 border-t border-[#D8DFE8] bg-[#F7F8FA] px-6 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancel
          </button>

          <button type="button" onClick={handleImport} disabled={!file} className={`${primaryButton} sm:min-w-[110px]`}>
            Import
          </button>
        </div>

      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* ADD PRODUCT SCREEN                                                  */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  "Apparel & Accessories",
  "Health & Beauty",
  "Home & Garden",
  "Food & Beverages",
  "Electronics",
  "Toys & Games",
  "Other",
];

// TODO: load the store's real collections from the backend
const COLLECTIONS = ["Home page", "New arrivals", "Best sellers", "Sale"];

const STATUS_STYLES = {
  draft: { label: "Draft", pill: "bg-[#EEF1F6] text-[#53627E]", dot: "bg-[#9AA6BA]" },
  active: { label: "Active", pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  scheduled: { label: "Scheduled", pill: "bg-[#E8EEF8] text-[#30466F]", dot: "bg-[#30466F]" },
};

const WEIGHT_UNITS = ["kg", "g", "lb", "oz"];
const DIMENSION_UNITS = ["cm", "in"];
const OPTION_SUGGESTIONS = ["Size", "Color", "Material", "Style"];
const MAX_OPTIONS = 3;
const SEO_TITLE_LIMIT = 60;
const SEO_DESCRIPTION_LIMIT = 160;
const STORE_DOMAIN = "yourstore.com";

const INITIAL_FORM = {
  // General
  title: "",
  description: "",
  category: "",
  product_type: "",
  vendor: "",

  // Media: [{ id, name, url }]
  images: [],

  // Pricing
  price: "",
  compare_at_price: "",
  cost: "",
  charge_tax: true,

  // Inventory & Shipping
  sku: "",
  barcode: "",
  quantity: "",
  track_quantity: true,
  continue_selling: false,
  is_physical: true,
  weight: "",
  weight_unit: "kg",
  length: "",
  width: "",
  height: "",
  dimension_unit: "cm",
  country_of_origin: "",
  hs_code: "",

  // Variants: options [{ id, name, values }], variants { "Red / S": { price, sku, stock } }
  options: [],
  variants: {},

  // SEO
  seo_title: "",
  seo_description: "",
  handle: "",
  handle_edited: false,

  // Side column
  status: "draft",
  publish_date: "",
  collections: [],
  tags: [],
  channels: { online_store: true, pos: false },
};

const newId = () => Math.random().toString(36).slice(2, 10);

// API product -> the shape the products table uses
function toRow(product) {
  return {
    ...product,
    price: product.price ?? "",
    createdAt: Date.parse(product.createdAt) || Date.now(),
    // Stock lives in the inventory app, which has no API yet
    track_quantity: false,
  };
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Looser version while typing, so "my-" can be followed by the next word
function slugifyWhileTyping(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-");
}

// DOMParser documents are inert, so nothing in the HTML runs here
function htmlToText(html) {
  if (!html) return "";

  const text = new DOMParser().parseFromString(html, "text/html").body.textContent || "";
  return text.replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatMoney(value) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const isNonNegativeNumber = (value) => value === "" || (toNumber(value) !== null && Number(value) >= 0);

function validate(form) {
  const errors = {};

  if (!form.title.trim()) errors.title = "Title is required.";
  if (!isNonNegativeNumber(form.price)) errors.price = "Price must be a number of 0 or more.";
  if (!isNonNegativeNumber(form.compare_at_price)) errors.compare_at_price = "Compare-at price must be a number of 0 or more.";
  if (!isNonNegativeNumber(form.cost)) errors.cost = "Cost must be a number of 0 or more.";
  if (!isNonNegativeNumber(form.quantity)) errors.quantity = "Quantity must be a number of 0 or more.";

  return errors;
}

// Every combination of option values, e.g. [["Red", "S"], ["Red", "M"], ...]
function buildCombinations(options) {
  const filled = options.filter((option) => option.name.trim() && option.values.length);

  if (filled.length === 0) return [];

  return filled.reduce(
    (combos, option) => combos.flatMap((combo) => option.values.map((value) => [...combo, value])),
    [[]]
  );
}

function buildPayload(form) {
  const { handle_edited: _handleEdited, images, options, variants, ...fields } = form;

  return {
    ...fields,
    title: form.title.trim(),
    // Image upload isn't connected yet, so only names are sent
    images: images.map((image) => image.name),
    options: options
      .filter((option) => option.name.trim() && option.values.length)
      .map(({ name, values }) => ({ name: name.trim(), values })),
    variants: buildCombinations(options).map((combo) => {
      const key = combo.join(" / ");

      return {
        title: key,
        option_values: combo,
        price: variants[key]?.price || form.price,
        sku: variants[key]?.sku || "",
        stock: variants[key]?.stock || "",
      };
    }),
  };
}


function AddProductForm({ onClose, onSaved }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const imagesRef = useRef(form.images);

  imagesRef.current = form.images;

  // One helper for every field. A few fields keep others in sync.
  const handleChange = (name, value) => {
    setForm((current) => {
      const next = { ...current, [name]: value };

      // The URL handle follows the title until it's edited by hand
      if (name === "title" && !current.handle_edited) next.handle = slugify(value);
      if (name === "handle" && value !== current.handle) next.handle_edited = true;

      return next;
    });

    setTouched((current) => (current[name] ? current : { ...current, [name]: true }));
  };

  const resetHandle = () => {
    setForm((current) => ({ ...current, handle: slugify(current.title), handle_edited: false }));
  };

  const allErrors = useMemo(() => validate(form), [form]);
  const errors = Object.fromEntries(Object.entries(allErrors).filter(([name]) => touched[name]));
  const isValid = Object.keys(allErrors).length === 0;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(INITIAL_FORM), [form]);
  const canSave = isValid && isDirty && !saving;

  // Start at the top of the page when the form opens
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // Free image previews when the form closes
  useEffect(() => {
    return () => imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
  }, []);

  // Warn before closing or reloading the tab with unsaved changes
  useEffect(() => {
    if (!isDirty) return undefined;

    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const handleDiscard = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return;

    onClose();
  };

  // SAVE: POST /api/v1/catalog/products/ (category, collections, tags and
  // variants are saved with the product). Image upload isn't connected yet.
  const onSave = async () => {
    const payload = buildPayload(form);

    setSaving(true);
    setSaveError("");

    try {
      const product = await apiRequest("/api/v1/catalog/products/", {
        method: "POST",
        body: payload,
      });
      onSaved(product);
    } catch (error) {
      setSaveError(error.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!canSave) {
      // Reveal every error so the user can see what's blocking Save
      setTouched(Object.fromEntries(Object.keys(INITIAL_FORM).map((name) => [name, true])));
      return;
    }

    onSave();
  };

  const sectionProps = { form, errors, onChange: handleChange };

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* HEADER */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] text-[#53627E]">
        <button
          type="button"
          onClick={handleDiscard}
          className="inline-flex items-center gap-1.5 rounded hover:text-[#161C2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/30 transition"
        >
          <svg {...lineIcon} strokeWidth="1.8" className="h-3.5 w-3.5">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Products
        </button>

        <span aria-hidden="true">/</span>
        <span className="text-[#161C2C]">New product</span>
      </nav>

      {saveError && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn't save the product: {saveError}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-[28px] font-semibold leading-tight tracking-tight">
            {form.title.trim() || "New product"}
          </h1>

          <p className="mt-1 text-sm text-[#53627E]">
            Only the title is required. Everything else can be added now or later.
          </p>
        </div>

        <StatusSwitcher {...sectionProps} />
      </div>


      {/* FORM */}
      <div className="mt-7 space-y-5">

        <EssentialsSection {...sectionProps} />

        <div className="grid gap-5 lg:grid-cols-2">
          <MediaSection {...sectionProps} />
          <OrganizationSection {...sectionProps} />
        </div>

        <ShippingSection {...sectionProps} />
        <VariantsSection {...sectionProps} />
        <VisibilitySection {...sectionProps} onResetHandle={resetHandle} />

      </div>


      {/* ACTIONS */}
      <div className="mt-8 flex flex-col-reverse gap-4 border-t border-[#D8DFE8] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-[#53627E]">
          {isDirty ? (
            <>
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              Unsaved changes
            </>
          ) : (
            "No changes yet"
          )}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button type="button" onClick={handleDiscard} className={secondaryButton}>
            Cancel
          </button>

          <button type="submit" disabled={!canSave} className={`${primaryButton} min-w-[136px]`}>
            {saving ? "Saving..." : "Save Product"}
          </button>
        </div>
      </div>

    </form>
  );
}


/* ---------------------------- Sections ---------------------------- */

// Draft / Active / Scheduled as one segmented control, with the date when scheduled
function StatusSwitcher({ form, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="radiogroup" aria-label="Product status" className="flex rounded-xl border border-[#D8DFE8] bg-white p-1">
        {Object.entries(STATUS_STYLES).map(([value, style]) => {
          const checked = form.status === value;

          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange("status", value)}
              className={`flex h-8 items-center gap-2 rounded-lg px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/30 ${
                checked ? "bg-[#161C2C] font-medium text-white" : "text-[#53627E] hover:text-[#161C2C]"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${checked ? "bg-white" : style.dot}`} />
              {style.label}
            </button>
          );
        })}
      </div>

      {form.status === "scheduled" && (
        <FormInput
          id="ap-publish-date"
          aria-label="Publish date"
          type="datetime-local"
          value={form.publish_date}
          onChange={(event) => onChange("publish_date", event.target.value)}
          className="w-[220px]"
        />
      )}
    </div>
  );
}

function EssentialsSection({ form, errors, onChange }) {
  const price = toNumber(form.price);
  const cost = toNumber(form.cost);
  const profit = price !== null && cost !== null ? price - cost : null;
  const margin = profit !== null && price > 0 ? (profit / price) * 100 : null;
  const isLoss = profit !== null && profit < 0;

  const field = (name, label, props = {}) => (
    <FormInput
      id={`ap-${name}`}
      label={label}
      value={form[name]}
      onChange={(event) => onChange(name, event.target.value)}
      error={errors[name]}
      {...props}
    />
  );

  const money = { type: "number", min: "0", step: "0.01", inputMode: "decimal", placeholder: "0.00" };

  return (
    <FormCard id="ap-essentials" title="Essentials" description="The core details, price and stock for this product.">
      <div className="grid gap-x-5 gap-y-5 sm:grid-cols-6">

        {/* Row 1 */}
        {field("title", "Product title", { required: true, placeholder: "e.g. Linen overshirt", className: "sm:col-span-6" })}

        {/* Row 2 */}
        {field("price", "Price", { ...money, className: "sm:col-span-2" })}
        {field("sku", "SKU", { optional: true, placeholder: "e.g. LIN-OVR-01", className: "sm:col-span-2" })}
        {field("quantity", "Inventory", {
          type: "number",
          min: "0",
          step: "1",
          inputMode: "numeric",
          placeholder: "0",
          disabled: !form.track_quantity,
          hint: form.track_quantity ? "Units available to sell" : "Stock isn't tracked",
          className: "sm:col-span-2",
        })}

        {/* Row 3 */}
        {field("compare_at_price", "Compare-at price", { ...money, optional: true, className: "sm:col-span-2" })}
        {field("cost", "Cost per item", { ...money, optional: true, hint: "Customers won't see this", className: "sm:col-span-2" })}
        {field("barcode", "Barcode", { optional: true, placeholder: "ISBN, UPC, GTIN...", className: "sm:col-span-2" })}

        {/* Row 4: insight strip */}
        <div className="flex flex-col gap-4 rounded-xl bg-[#F7F8FA] p-4 sm:col-span-6 md:flex-row md:items-center md:justify-between">
          <dl className="flex gap-8">
            <div>
              <dt className="text-xs text-[#53627E]">Margin</dt>
              <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${isLoss ? "text-[#D72C0D]" : ""}`}>
                {margin === null ? "—" : `${margin.toFixed(1)}%`}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-[#53627E]">Profit</dt>
              <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${isLoss ? "text-[#D72C0D]" : ""}`}>
                {profit === null ? "—" : formatMoney(profit)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <ToggleChip
              id="ap-charge-tax"
              label="Charge tax"
              checked={form.charge_tax}
              onChange={(checked) => onChange("charge_tax", checked)}
            />

            <ToggleChip
              id="ap-track-quantity"
              label="Track quantity"
              checked={form.track_quantity}
              onChange={(checked) => onChange("track_quantity", checked)}
            />

            <ToggleChip
              id="ap-continue-selling"
              label="Sell when out of stock"
              checked={form.continue_selling}
              onChange={(checked) => onChange("continue_selling", checked)}
              disabled={!form.track_quantity}
            />
          </div>
        </div>

        {/* Row 5 */}
        <FormInput id="ap-description" label="Description" optional className="sm:col-span-6">
          <RichTextEditor
            id="ap-description"
            labelledBy="ap-description-label"
            value={form.description}
            onChange={(html) => onChange("description", html)}
            placeholder="Materials, fit, care instructions..."
          />
        </FormInput>

      </div>
    </FormCard>
  );
}

function MediaSection({ form, onChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));

    if (files.length === 0) return;

    onChange("images", [
      ...form.images,
      ...files.map((file) => ({ id: newId(), name: file.name, url: URL.createObjectURL(file) })),
    ]);
  };

  const removeImage = (id) => {
    const image = form.images.find((item) => item.id === id);
    if (image) URL.revokeObjectURL(image.url);

    onChange("images", form.images.filter((item) => item.id !== id));
  };

  return (
    <FormCard id="ap-media" title="Media" description="The first image is used as the cover.">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={`flex items-center gap-4 rounded-xl border border-dashed px-4 py-5 transition ${
          dragging ? "border-[#161C2C] bg-[#F3F6FA]" : "border-[#C7D0DC] bg-[#FBFCFD]"
        }`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#30466F] shadow-sm">
          <svg {...lineIcon} strokeWidth="1.8" className="h-5 w-5">
            <path d="M4 5h16v14H4ZM4 15l4-4 4 4 3-3 5 5" />
            <path d="M15 9.5h.01" />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Drop images here</p>
          <p className="text-xs text-[#53627E]">PNG, JPG or WebP</p>
        </div>

        <button type="button" onClick={() => inputRef.current?.click()} className={`${secondaryButton} h-9 shrink-0`}>
          Add images
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          aria-label="Add images"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {form.images.length > 0 && (
        <ul className="grid grid-cols-4 gap-3">
          {form.images.map((image, index) => (
            <li key={image.id} className="group relative aspect-square overflow-hidden rounded-xl border border-[#D8DFE8] bg-[#F7F8FA]">
              <img src={image.url} alt={image.name} className="h-full w-full object-cover" />

              {index === 0 && (
                <span className="absolute bottom-1.5 left-1.5 rounded bg-[#161C2C]/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Cover
                </span>
              )}

              <button
                type="button"
                aria-label={`Remove ${image.name}`}
                onClick={() => removeImage(image.id)}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-sm text-[#161C2C] shadow opacity-0 transition group-hover:opacity-100 focus:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <InfoHint>Image upload isn't connected yet, so images won't be saved.</InfoHint>
    </FormCard>
  );
}

function OrganizationSection({ form, onChange }) {
  const toggleCollection = (name) => {
    onChange(
      "collections",
      form.collections.includes(name)
        ? form.collections.filter((item) => item !== name)
        : [...form.collections, name]
    );
  };

  return (
    <FormCard id="ap-organization" title="Organization" description="Help customers find this product.">
      <FormInput
        id="ap-category"
        label="Category"
        as="select"
        value={form.category}
        onChange={(event) => onChange("category", event.target.value)}
      >
        <option value="">Choose a category</option>

        {CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </FormInput>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          id="ap-product-type"
          label="Product type"
          optional
          placeholder="e.g. Shirts"
          value={form.product_type}
          onChange={(event) => onChange("product_type", event.target.value)}
        />

        <FormInput
          id="ap-vendor"
          label="Vendor"
          optional
          placeholder="e.g. Store Studio"
          value={form.vendor}
          onChange={(event) => onChange("vendor", event.target.value)}
        />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-[#161C2C]">Collections</legend>

        <div className="flex flex-wrap gap-2">
          {COLLECTIONS.map((name) => {
            const selected = form.collections.includes(name);

            return (
              <button
                key={name}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleCollection(name)}
                className={`h-8 rounded-lg border px-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/30 transition ${
                  selected
                    ? "border-[#161C2C] bg-[#161C2C] text-white"
                    : "border-[#D8DFE8] bg-white text-[#53627E] hover:border-[#161C2C] hover:text-[#161C2C]"
                }`}
              >
                {selected ? "✓ " : "+ "}
                {name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <FormInput id="ap-tags" label="Tags" hint="Press Enter to add">
        <ChipInput
          id="ap-tags"
          labelledBy="ap-tags-label"
          values={form.tags}
          onChange={(values) => onChange("tags", values)}
          placeholder="e.g. summer, linen"
        />
      </FormInput>
    </FormCard>
  );
}

function ShippingSection({ form, errors, onChange }) {
  const field = (name, label, props = {}) => (
    <FormInput
      id={`ap-${name}`}
      label={label}
      value={form[name]}
      onChange={(event) => onChange(name, event.target.value)}
      error={errors[name]}
      {...props}
    />
  );

  return (
    <FormCard
      id="ap-shipping"
      title="Shipping & customs"
      description="Used to work out delivery rates and customs forms."
      action={
        <ToggleChip
          id="ap-physical"
          label="Physical product"
          checked={form.is_physical}
          onChange={(checked) => onChange("is_physical", checked)}
        />
      }
    >
      {form.is_physical ? (
        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-6">
          {field("weight", "Weight", {
            type: "number",
            min: "0",
            step: "0.01",
            inputMode: "decimal",
            placeholder: "0.0",
            className: "sm:col-span-2",
            suffix: (
              <UnitSelect
                label="Weight unit"
                value={form.weight_unit}
                units={WEIGHT_UNITS}
                onChange={(unit) => onChange("weight_unit", unit)}
              />
            ),
          })}

          <fieldset className="sm:col-span-4">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <legend className="text-[13px] font-medium text-[#161C2C]">Dimensions</legend>

              <span className="flex h-6 items-center rounded-md border border-[#D8DFE8] bg-white">
                <UnitSelect
                  label="Dimension unit"
                  value={form.dimension_unit}
                  units={DIMENSION_UNITS}
                  onChange={(unit) => onChange("dimension_unit", unit)}
                />
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { name: "length", label: "Length", short: "L" },
                { name: "width", label: "Width", short: "W" },
                { name: "height", label: "Height", short: "H" },
              ].map((dimension) => (
                <FormInput
                  key={dimension.name}
                  id={`ap-${dimension.name}`}
                  aria-label={dimension.label}
                  prefix={dimension.short}
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={form[dimension.name]}
                  onChange={(event) => onChange(dimension.name, event.target.value)}
                />
              ))}
            </div>
          </fieldset>

          {field("country_of_origin", "Country of origin", { optional: true, placeholder: "e.g. India", className: "sm:col-span-3" })}
          {field("hs_code", "HS code", { optional: true, placeholder: "e.g. 6205.20", hint: "Used for customs", className: "sm:col-span-3" })}
        </div>
      ) : (
        <InfoHint>No shipping details are needed for digital products and services.</InfoHint>
      )}
    </FormCard>
  );
}

function VariantsSection({ form, onChange }) {
  const { options, variants } = form;
  const combinations = buildCombinations(options);

  const updateOption = (id, changes) => {
    onChange("options", options.map((option) => (option.id === id ? { ...option, ...changes } : option)));
  };

  const updateVariant = (key, field, value) => {
    onChange("variants", { ...variants, [key]: { ...variants[key], [field]: value } });
  };

  const addOption = () => {
    onChange("options", [...options, { id: newId(), name: "", values: [] }]);
  };

  return (
    <FormCard
      id="ap-variants"
      title="Variants"
      description="Sell the same product in different sizes, colours or materials."
      action={
        options.length < MAX_OPTIONS && (
          <button type="button" onClick={addOption} className={`${secondaryButton} h-9`}>
            + Add option
          </button>
        )
      }
    >
      <datalist id="ap-option-suggestions">
        {OPTION_SUGGESTIONS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {options.length === 0 && (
        <p className="rounded-xl border border-dashed border-[#D8DFE8] px-4 py-5 text-center text-sm text-[#53627E]">
          No options yet. Add options like size or color, and each combination becomes a variant.
        </p>
      )}

      {options.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {options.map((option, index) => (
            <li key={option.id} className="rounded-xl border border-[#D8DFE8] bg-[#FBFCFD] p-4">
              <div className="flex items-end gap-3">
                <FormInput
                  id={`ap-option-name-${option.id}`}
                  label={`Option ${index + 1}`}
                  list="ap-option-suggestions"
                  placeholder="e.g. Size"
                  value={option.name}
                  onChange={(event) => updateOption(option.id, { name: event.target.value })}
                  className="flex-1"
                />

                <button
                  type="button"
                  aria-label={`Remove option ${option.name || index + 1}`}
                  onClick={() => onChange("options", options.filter((item) => item.id !== option.id))}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#53627E] hover:bg-[#D72C0D]/5 hover:text-[#D72C0D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/30 transition"
                >
                  <svg {...lineIcon} strokeWidth="1.8" className="h-4 w-4">
                    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                  </svg>
                </button>
              </div>

              <FormInput id={`ap-option-values-${option.id}`} label="Values" hint="Press Enter to add" className="mt-3">
                <ChipInput
                  id={`ap-option-values-${option.id}`}
                  labelledBy={`ap-option-values-${option.id}-label`}
                  values={option.values}
                  onChange={(values) => updateOption(option.id, { values })}
                  placeholder="Small, Medium, Large"
                />
              </FormInput>
            </li>
          ))}
        </ul>
      )}

      {combinations.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[#D8DFE8]">
          <div className="flex items-center justify-between bg-[#F7F8FA] px-4 py-2.5">
            <p className="text-[13px] font-semibold">
              {combinations.length} {combinations.length === 1 ? "variant" : "variants"}
            </p>

            <p className="text-xs text-[#53627E]">Empty price uses the main price</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-y border-[#D8DFE8] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#53627E]">
                <tr>
                  <th className="px-4 py-2 font-semibold">Variant</th>
                  <th className="w-[140px] px-2 py-2 font-semibold">Price</th>
                  <th className="w-[170px] px-2 py-2 font-semibold">SKU</th>
                  <th className="w-[110px] px-2 py-2 pr-4 font-semibold">Stock</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#D8DFE8]/70">
                {combinations.map((combo) => {
                  const key = combo.join(" / ");
                  const variant = variants[key] || {};

                  return (
                    <tr key={key}>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {combo.map((value, index) => (
                            <span key={index} className="rounded-md bg-[#EEF1F6] px-2 py-0.5 text-xs font-medium">
                              {value}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-2 py-2">
                        <FormInput
                          id={`ap-variant-price-${key}`}
                          aria-label={`Price for ${key}`}
                          size="sm"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={form.price || "0.00"}
                          value={variant.price ?? ""}
                          onChange={(event) => updateVariant(key, "price", event.target.value)}
                        />
                      </td>

                      <td className="px-2 py-2">
                        <FormInput
                          id={`ap-variant-sku-${key}`}
                          aria-label={`SKU for ${key}`}
                          size="sm"
                          value={variant.sku ?? ""}
                          onChange={(event) => updateVariant(key, "sku", event.target.value)}
                        />
                      </td>

                      <td className="px-2 py-2 pr-4">
                        <FormInput
                          id={`ap-variant-stock-${key}`}
                          aria-label={`Stock for ${key}`}
                          size="sm"
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={variant.stock ?? ""}
                          onChange={(event) => updateVariant(key, "stock", event.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </FormCard>
  );
}

function VisibilitySection({ form, errors, onChange, onResetHandle }) {
  const previewTitle = form.seo_title || form.title || "Product title";
  const previewDescription =
    form.seo_description ||
    htmlToText(form.description) ||
    "Add a description to see how this product appears in search results.";

  const truncate = (text, limit) => (text.length > limit ? `${text.slice(0, limit)}…` : text);

  return (
    <FormCard id="ap-visibility" title="Search & visibility" description="How this product appears on search engines and where it's sold.">
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Fields */}
        <div className="space-y-5">
          <FormInput
            id="ap-seo-title"
            label="Page title"
            optional
            placeholder={form.title || "Defaults to the product title"}
            value={form.seo_title}
            onChange={(event) => onChange("seo_title", event.target.value)}
            error={errors.seo_title}
            counter={<CharCounter length={form.seo_title.length} limit={SEO_TITLE_LIMIT} />}
          />

          <FormInput
            id="ap-seo-description"
            label="Meta description"
            optional
            as="textarea"
            rows={3}
            value={form.seo_description}
            onChange={(event) => onChange("seo_description", event.target.value)}
            error={errors.seo_description}
            counter={<CharCounter length={form.seo_description.length} limit={SEO_DESCRIPTION_LIMIT} />}
          />

          <div>
            <FormInput
              id="ap-handle"
              label="URL handle"
              prefix={`${STORE_DOMAIN}/products/`}
              placeholder="product-handle"
              value={form.handle}
              onChange={(event) => onChange("handle", slugifyWhileTyping(event.target.value))}
              onBlur={() => onChange("handle", slugify(form.handle))}
              hint={form.handle_edited ? "Edited by hand" : "Generated from the title"}
            />

            {form.handle_edited && (
              <button
                type="button"
                onClick={onResetHandle}
                className="mt-1 text-xs font-medium text-[#30466F] hover:underline"
              >
                Reset to match title
              </button>
            )}
          </div>
        </div>

        {/* Preview + channels */}
        <div className="space-y-5">
          <div className="rounded-xl border border-[#D8DFE8] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#53627E]">Search preview</p>

            <div className="mt-3 flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#161C2C] text-xs font-bold text-white">
                S
              </span>

              <div className="min-w-0 leading-tight">
                <p className="text-[13px] text-[#202124]">Store</p>
                <p className="truncate text-xs text-[#4D5156]">
                  https://{STORE_DOMAIN} › products › {form.handle || "product"}
                </p>
              </div>
            </div>

            <p className="mt-2 text-lg leading-snug text-[#1A0DAB]">{truncate(previewTitle, SEO_TITLE_LIMIT)}</p>

            <p className="mt-1 text-[13px] leading-relaxed text-[#4D5156]">
              {truncate(previewDescription, SEO_DESCRIPTION_LIMIT)}
            </p>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-[#161C2C]">Sales channels</legend>

            <div className="grid gap-2 sm:grid-cols-2">
              <Checkbox
                id="ap-channel-online"
                label="Online store"
                checked={form.channels.online_store}
                onChange={(checked) => onChange("channels", { ...form.channels, online_store: checked })}
              />

              <Checkbox
                id="ap-channel-pos"
                label="Point of sale"
                checked={form.channels.pos}
                onChange={(checked) => onChange("channels", { ...form.channels, pos: checked })}
              />
            </div>
          </fieldset>
        </div>

      </div>
    </FormCard>
  );
}


/* ---------------------------- Helpers ---------------------------- */

// White card with a heading row (title, subtext, optional action on the right)
function FormCard({ id, title, description, action, children }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="rounded-2xl border border-[#D8DFE8]/80 bg-white p-5 shadow-[0_1px_3px_rgba(22,28,44,0.05)] sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${id}-heading`} className="text-[15px] font-semibold text-[#161C2C]">
            {title}
          </h2>

          {description && <p className="mt-0.5 text-[13px] text-[#53627E]">{description}</p>}
        </div>

        {action}
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

const chevron = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="pointer-events-none h-3.5 w-3.5 shrink-0 text-[#53627E]"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/*
 * Label + control + hint/error (+ optional right-aligned counter).
 * Renders an <input> by default; `as="select"` / `as="textarea"` for others.
 * With `as="select"` children are the <option>s; otherwise children replace
 * the control entirely (the label then gets id `${id}-label`).
 */
function FormInput({
  id,
  label,
  hint,
  error,
  counter,
  optional = false,
  required = false,
  prefix,
  suffix,
  as: Control = "input",
  size = "md",
  className = "",
  children,
  ...props
}) {
  const isSelect = Control === "select";
  const isTextarea = Control === "textarea";
  const customControl = !isSelect && children;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const message = error || hint;

  return (
    <div className={className}>
      {label && (
        <label
          id={`${id}-label`}
          htmlFor={id}
          className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-[#161C2C]"
        >
          <span>
            {label}
            {required && <span className="text-[#D72C0D]"> *</span>}
          </span>

          {optional && <span className="text-xs font-normal text-[#8A96AB]">Optional</span>}
        </label>
      )}

      {customControl ? (
        children
      ) : (
        <div
          className={`relative flex items-center overflow-hidden rounded-xl border transition focus-within:ring-2 ${
            isTextarea ? "" : size === "sm" ? "h-9" : "h-10"
          } ${props.disabled || props.readOnly ? "bg-[#F7F8FA]" : "bg-white"} ${
            error
              ? "border-[#D72C0D] focus-within:ring-[#D72C0D]/15"
              : "border-[#D8DFE8] hover:border-[#B9C3D3] focus-within:border-[#161C2C] focus-within:ring-[#161C2C]/15"
          }`}
        >
          {prefix && (
            <span className="shrink-0 select-none pl-3 text-sm text-[#8A96AB]">{prefix}</span>
          )}

          <Control
            id={id}
            required={required || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`h-full w-full min-w-0 flex-1 bg-transparent text-sm text-[#161C2C] outline-none placeholder:text-[#A3ADBD] disabled:cursor-not-allowed disabled:text-[#8A96AB] ${
              prefix ? "pl-1.5" : "pl-3"
            } ${isSelect ? "pr-9" : suffix ? "pr-2" : "pr-3"} ${isTextarea ? "resize-y py-2.5" : ""} ${
              isSelect ? "cursor-pointer appearance-none" : ""
            } ${isSelect && !props.value ? "text-[#A3ADBD]" : ""}`}
            {...props}
          >
            {isSelect ? children : undefined}
          </Control>

          {isSelect && <span className="pointer-events-none absolute right-3">{chevron}</span>}

          {suffix && (
            <span className="flex shrink-0 items-center self-stretch border-l border-[#D8DFE8]">{suffix}</span>
          )}
        </div>
      )}

      {(message || counter) && (
        <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
          {message ? (
            <p
              id={error ? `${id}-error` : `${id}-hint`}
              className={error ? "font-medium text-[#D72C0D]" : "text-[#53627E]"}
            >
              {message}
            </p>
          ) : (
            <span />
          )}

          {counter && <span className="shrink-0 text-[#8A96AB]">{counter}</span>}
        </div>
      )}
    </div>
  );
}

// Pill-shaped switch: a real button with role="switch", so Tab, Space and Enter work
function ToggleChip({ id, label, checked, onChange, disabled = false }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-9 items-center gap-2.5 rounded-xl border bg-white pl-3 pr-2 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/30 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "border-[#161C2C] text-[#161C2C]" : "border-[#D8DFE8] text-[#53627E] hover:border-[#B9C3D3]"
      }`}
    >
      {label}

      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-[#161C2C]" : "bg-[#D8DFE8]"}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}

function Checkbox({ id, label, checked, onChange }) {
  return (
    <label
      htmlFor={id}
      className={`flex h-10 cursor-pointer items-center gap-3 rounded-xl border px-3 text-[13px] font-medium transition focus-within:ring-2 focus-within:ring-[#161C2C]/30 ${
        checked ? "border-[#161C2C] bg-[#F7F8FA]" : "border-[#D8DFE8] hover:border-[#B9C3D3]"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 cursor-pointer accent-[#161C2C]"
      />
      {label}
    </label>
  );
}

// Unit picker joined to the right edge of an input (or in its own small box)
function UnitSelect({ label, value, units, onChange }) {
  return (
    <span className="relative flex h-full items-center">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full cursor-pointer appearance-none bg-transparent pl-3 pr-7 text-[13px] font-medium text-[#161C2C] outline-none focus-visible:bg-[#F3F6FA]"
      >
        {units.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>

      <span className="pointer-events-none absolute right-2">{chevron}</span>
    </span>
  );
}

function CharCounter({ length, limit }) {
  return (
    <span className={length > limit ? "font-medium text-[#D72C0D]" : ""}>
      {length} / {limit}
    </span>
  );
}

// Neutral note, deliberately not styled as an error
function InfoHint({ children }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-[#F3F6FA] px-3 py-2 text-xs text-[#53627E]">
      <span aria-hidden="true" className="mt-px flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-current text-[9px] font-bold">
        i
      </span>
      <span>{children}</span>
    </p>
  );
}

/*
 * Type a value and press Enter (or comma) to add a chip.
 * Backspace on an empty input removes the last chip; duplicates are ignored.
 */
function ChipInput({ id, labelledBy, values, onChange, placeholder }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const addValues = (raw) => {
    const next = [...values];

    raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        if (!next.some((value) => value.toLowerCase() === part.toLowerCase())) next.push(part);
      });

    if (next.length !== values.length) onChange(next);
    setDraft("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      // Enter would otherwise submit the whole form
      event.preventDefault();
      if (draft.trim()) addValues(draft);
    } else if (event.key === "Backspace" && draft === "" && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex min-h-10 cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-[#D8DFE8] bg-white px-2 py-1 transition focus-within:border-[#161C2C] focus-within:ring-2 focus-within:ring-[#161C2C]/15"
    >
      {values.map((value) => (
        <span
          key={value}
          className="inline-flex h-7 items-center gap-1 rounded-md bg-[#EEF1F6] pl-2.5 pr-1 text-xs font-medium text-[#161C2C]"
        >
          {value}

          <button
            type="button"
            aria-label={`Remove ${value}`}
            onClick={(event) => {
              event.stopPropagation();
              onChange(values.filter((item) => item !== value));
            }}
            className="flex h-5 w-5 items-center justify-center rounded text-[#53627E] hover:bg-white hover:text-[#161C2C] transition"
          >
            ×
          </button>
        </span>
      ))}

      <input
        ref={inputRef}
        id={id}
        type="text"
        value={draft}
        onChange={(event) => {
          const text = event.target.value;
          if (text.includes(",")) addValues(text);
          else setDraft(text);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => draft.trim() && addValues(draft)}
        aria-labelledby={labelledBy}
        placeholder={values.length ? "" : placeholder}
        className="h-7 min-w-[120px] flex-1 bg-transparent px-1 text-sm text-[#161C2C] outline-none placeholder:text-[#A3ADBD]"
      />
    </div>
  );
}

const EDITOR_TOOLS = [
  { command: "bold", label: "Bold", content: <span className="font-bold">B</span> },
  { command: "italic", label: "Italic", content: <span className="font-serif italic">I</span> },
  { command: "insertUnorderedList", label: "Bullet list", content: <span className="text-base leading-none">•≡</span> },
  { command: "createLink", label: "Insert link", content: <span className="text-sm">🔗</span> },
];

const escapeHtml = (text) =>
  text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

/*
 * Small contentEditable editor (bold, italic, bullet list, link).
 * `value` seeds the content once; after that the DOM is the source of truth
 * and changes come back through onChange as HTML ("" when empty).
 */
function RichTextEditor({ id, labelledBy, value, onChange, placeholder }) {
  const editorRef = useRef(null);
  const [active, setActive] = useState({});
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    editorRef.current.innerHTML = value || "";
    // Seed only on mount, so typing never resets the caret
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshActive = () => {
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
    });
  };

  useEffect(() => {
    const onSelectionChange = () => {
      const node = document.getSelection()?.anchorNode;
      if (node && editorRef.current?.contains(node)) refreshActive();
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const emitChange = () => {
    const editor = editorRef.current;
    onChange(editor.textContent.trim() ? editor.innerHTML : "");
  };

  const insertLink = () => {
    const selection = window.getSelection();
    const range = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    const url = window.prompt("Link URL", "https://")?.trim();

    // Only real web/mail links, never javascript: URLs
    if (!url || !/^(https?:\/\/|mailto:)/i.test(url)) return;

    editorRef.current.focus();

    if (range) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    if (range && !range.collapsed) {
      document.execCommand("createLink", false, url);
    } else {
      const safe = escapeHtml(url);
      document.execCommand("insertHTML", false, `<a href="${safe}">${safe}</a>`);
    }
  };

  const runTool = (command) => {
    if (command === "createLink") {
      insertLink();
    } else {
      editorRef.current.focus();
      document.execCommand(command);
    }

    emitChange();
    refreshActive();
  };

  // Paste as plain text so outside styles and markup don't come along
  const handlePaste = (event) => {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
  };

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-white transition ${
        focused ? "border-[#161C2C] ring-2 ring-[#161C2C]/15" : "border-[#D8DFE8]"
      }`}
    >
      <div role="toolbar" aria-label="Text formatting" className="flex items-center gap-1 border-b border-[#E3E7ED] bg-[#F7F8FA] px-2 py-1.5">
        {EDITOR_TOOLS.map((tool) => {
          const isActive = Boolean(active[tool.command]);

          return (
            <button
              key={tool.command}
              type="button"
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={tool.command === "createLink" ? undefined : isActive}
              // Keep the text selection when clicking a tool
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runTool(tool.command)}
              className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm transition ${
                isActive ? "bg-[#161C2C] text-white" : "text-[#53627E] hover:bg-white hover:text-[#161C2C]"
              }`}
            >
              {tool.content}
            </button>
          );
        })}
      </div>

      <div className="relative">
        {!value && (
          <span className="pointer-events-none absolute left-3 top-3 text-sm text-[#A3ADBD]">{placeholder}</span>
        )}

        <div
          ref={editorRef}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={labelledBy}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="min-h-[150px] px-3 py-3 text-sm leading-relaxed text-[#161C2C] outline-none [&_a]:text-[#30466F] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
        />
      </div>
    </div>
  );
}
