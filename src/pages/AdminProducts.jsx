import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { apiGet, apiPost } from "@/lib/api";
import { getSession, useCan } from "@/lib/auth";
import {
  EXTRA_FIELDS,
  fetchFieldLabels,
  isRenamable,
  saveFieldLabels,
  withLabels,
} from "@/lib/productFields";

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PAGE_SIZES = [25, 50, 100];

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
];

const SORT_OPTIONS = [
  { value: "default", label: "Sort by" },
  { value: "title_asc", label: "A to Z" },
  { value: "title_desc", label: "Z to A" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

function parseProductPrice(price) {
  if (price === null || price === undefined || price === "") return 0;
  const num = Number(String(price).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

// One CSV cell. Text starting with = + - @ would run as a formula in Excel, so it gets a ' first.
function csvCell(value, { text = true } = {}) {
  let v = value === null || value === undefined ? "" : String(value);
  if (text && /^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// Every product field, in the order and with the names the Import mapping recognises, so an
// export can be imported again. Empty fields stay as empty cells.
function exportColumns(labels = {}) {
  const list = (v) => (Array.isArray(v) ? v.join(", ") : v);
  const fixed = [
    ["Title", (p) => p.title],
    ["Description", (p) => p.description],
    ["Price", (p) => p.price, false],
    ["SKU", (p) => p.sku],
    ["Vendor", (p) => p.vendor],
    ["Product type", (p) => p.product_type],
    ["Category", (p) => p.category],
    ["Status", (p) => p.status],
    ["Tags", (p) => list(p.tags)],
    ["Collections", (p) => list(p.collections)],
    ["Quantity", (p) => p.quantity, false],
  ];
  const extra = withLabels(labels).map((f) => [f.label, (p) => p[f.key]]);
  const more = [
    ["SEO title", (p) => p.seo_title],
    ["SEO description", (p) => p.seo_description],
    ["Page layout", (p) => p.theme_template],
    ["Images", (p) => (p.images || []).map((i) => i.url).join(", ")],
    ["Created", (p) => p.createdAt, false],
    ["Updated", (p) => p.updatedAt, false],
  ];
  return [...fixed, ...extra, ...more].map(([header, get, text = true]) => ({ header, get, text }));
}

function downloadProductsCsv(items, labels) {
  const columns = exportColumns(labels);
  const header = columns.map((c) => csvCell(c.header, { text: false })).join(",");
  const lines = items.map((p) => columns.map((c) => csvCell(c.get(p), { text: c.text })).join(","));
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(["\uFEFF" + [header, ...lines].join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const IMPORT_BATCH_SIZE = 200; // products per request; the server accepts up to 500

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file) {
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "This file type isn't supported. Please choose an Excel (.xlsx, .xls) or CSV (.csv) file.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return `This file is ${formatFileSize(file.size)}. The maximum file size is 10MB.`;
  }
  return "";
}

// Product fields a file column can be mapped to. "aliases" are only used to
// suggest a column; the user confirms or changes every mapping before importing.
const IMPORT_FIELDS = [
  {
    key: "title",
    label: "Title",
    required: true,
    aliases: ["title", "name", "product name", "product title"],
  },
  { key: "description", label: "Description", aliases: ["description", "body", "about"] },
  { key: "price", label: "Price", aliases: ["price", "variant price"] },
  { key: "sku", label: "SKU", required: true, aliases: ["sku", "variant sku"] },
  { key: "vendor", label: "Vendor", aliases: ["vendor", "brand"] },
  { key: "product_type", label: "Product type", aliases: ["product_type", "product type", "type"] },
  { key: "category", label: "Category", aliases: ["category"] },
  { key: "status", label: "Status", aliases: ["status"] },
  { key: "tags", label: "Tags", aliases: ["tags"] },
  { key: "collections", label: "Collections", aliases: ["collections", "collection"] },
  {
    key: "quantity",
    label: "Quantity",
    aliases: ["quantity", "qty", "stock", "inventory", "variant inventory qty"],
  },
  ...EXTRA_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    aliases: [f.key, f.label.toLowerCase(), f.key.replace(/_/g, " ")],
  })),
];

const splitList = (value) =>
  String(value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

// First sheet of the file as { headers: [string], rows: [[cell]] }
async function readSheet(file) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const table = sheet
    ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false })
    : [];
  const headers = (table[0] || []).map((h) => String(h).trim());
  return { headers, rows: table.slice(1) };
}

// A starting mapping { fieldKey: columnIndex | "" }: each field takes the first
// unused column whose header matches one of its aliases
function suggestMapping(headers) {
  const used = new Set();
  const mapping = {};
  IMPORT_FIELDS.forEach((field) => {
    const index = headers.findIndex(
      (h, i) => !used.has(i) && field.aliases.includes(h.toLowerCase())
    );
    mapping[field.key] = index === -1 ? "" : index;
    if (index !== -1) used.add(index);
  });
  return mapping;
}

// Product payloads for the products API, reading each field from the column the user chose
function buildProductRows(rows, mapping) {
  return rows.map((cells) => {
    const pick = (field) => {
      const column = mapping[field];
      return column === "" || column === undefined ? "" : String(cells[column] ?? "").trim();
    };

    const status = pick("status").toLowerCase();
    const price = pick("price").replace(/[^0-9.]/g, "");
    const quantity = pick("quantity").replace(/[^0-9]/g, "");
    return {
      title: pick("title"),
      description: pick("description"),
      vendor: pick("vendor"),
      product_type: pick("product_type"),
      category: pick("category"),
      status: status === "active" ? "active" : "draft",
      tags: splitList(pick("tags")),
      collections: splitList(pick("collections")),
      price: price === "" ? null : price,
      sku: pick("sku"),
      // Stocked at the store's first location (0 when the file has no quantity)
      quantity: quantity === "" ? null : Number(quantity),
      ...Object.fromEntries(EXTRA_FIELDS.map((f) => [f.key, pick(f.key)])),
    };
  });
}

// The last product list loaded, so coming back to this page shows it at once
// while a fresh copy loads. Only reused for the same store.
let productsCache = { storeId: null, items: null };

const activeStoreId = () => getSession()?.storeId || null;

const lineIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

// Sample products in the storefront mockup next to "Add your products" (line icons from the Lucide set)
const sampleProducts = [
  {
    name: "T-shirt",
    price: "$24",
    icon: (
      <svg {...lineIcon}>
        <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
      </svg>
    ),
  },
  {
    name: "Tote bag",
    price: "$38",
    icon: (
      <svg {...lineIcon}>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    name: "Headphones",
    price: "$89",
    icon: (
      <svg {...lineIcon}>
        <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
      </svg>
    ),
  },
  {
    name: "Mug",
    price: "$16",
    icon: (
      <svg {...lineIcon}>
        <path d="M10 2v2M14 2v2M6 2v2" />
        <path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />
      </svg>
    ),
  },
];

function ImportProductsModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [sheet, setSheet] = useState(null); // { headers, rows } once the file has been read
  const [mapping, setMapping] = useState({}); // fieldKey -> column index, or "" for none
  const [labels, setLabels] = useState({}); // columnN -> the name the owner gave that field
  const [savedLabels, setSavedLabels] = useState({});
  const inputRef = useRef(null);

  // Names already given to the generic columns
  useEffect(() => {
    fetchFieldLabels()
      .then((saved) => {
        setLabels(saved);
        setSavedLabels(saved);
      })
      .catch(() => {});
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const selectFile = (selected) => {
    if (!selected) return;
    const message = validateFile(selected);
    setSheet(null);
    if (message) {
      setFile(null);
      setError(message);
    } else {
      setFile(selected);
      setError("");
    }
  };

  const handleInputChange = (e) => {
    selectFile(e.target.files?.[0]);
    // Reset so picking the same file again still triggers onChange
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    selectFile(e.dataTransfer.files?.[0]);
  };

  // Step 1 -> 2: read the file and let the user choose which column feeds each field
  const handleContinue = async () => {
    if (!file || importing) return;
    setError("");
    try {
      const read = await readSheet(file);
      if (!read.headers.length || !read.rows.length) {
        setError("This file has no product rows.");
        return;
      }
      setSheet(read);
      setMapping(suggestMapping(read.headers));
    } catch {
      setError("We couldn't read this file. Check that it's a valid Excel or CSV file.");
    }
  };

  const missingRequired = IMPORT_FIELDS.filter((f) => f.required && mapping[f.key] === "");

  const handleImport = async () => {
    if (!sheet || importing || missingRequired.length) return;
    setImporting(true);
    setError("");

    // Keep the names for mapped generic columns; a name only makes sense with data behind it
    const nextLabels = {};
    EXTRA_FIELDS.filter((f) => isRenamable(f.key)).forEach((f) => {
      const name = (labels[f.key] || "").trim();
      if (name) nextLabels[f.key] = name;
    });
    const names = Object.values(nextLabels).map((n) => n.toLowerCase());
    if (new Set(names).size !== names.length) {
      setError("Each field needs a different name.");
      setImporting(false);
      return;
    }
    if (JSON.stringify(nextLabels) !== JSON.stringify(savedLabels)) {
      try {
        setSavedLabels(await saveFieldLabels(nextLabels));
      } catch (err) {
        setError(err?.message || "We couldn't save the field names.");
        setImporting(false);
        return;
      }
    }

    const rows = buildProductRows(sheet.rows, mapping);

    const failures = [];
    let created = 0;
    let skipped = 0;
    let processed = 0;

    for (let start = 0; start < rows.length; start += IMPORT_BATCH_SIZE) {
      const batch = rows.slice(start, start + IMPORT_BATCH_SIZE);
      setProgress(`Importing ${processed} of ${rows.length}...`);

      const res = await apiPost("/api/v1/catalog/products/bulk/", { products: batch });

      if (!res.ok) {
        setImporting(false);
        setProgress("");
        if (created) onImported();
        setError(
          `${created} of ${rows.length} products imported before the import stopped. ` +
            (res.status === 401
              ? "Your session expired. Sign in again, then import the file again."
              : res.formError ||
                Object.values(res.fieldErrors || {})[0] ||
                "The server rejected the file.")
        );
        return;
      }

      created += res.data.created;
      skipped += res.data.skipped;
      res.data.errors.forEach((e) =>
        failures.push(
          `Row ${start + e.index + 2} (${batch[e.index].title || "no title"}): ${e.message}`
        )
      );
      processed += batch.length;
    }

    setProgress("");
    setImporting(false);
    if (created) onImported();

    if (failures.length) {
      setFile(null);
      setError(
        `${created} of ${rows.length} products imported${skipped ? `, ${skipped} already existed` : ""}. ${failures.slice(0, 3).join("; ")}${
          failures.length > 3 ? `; and ${failures.length - 3} more` : ""
        }.`
      );
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-navy/50 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-products-title"
        className="w-full max-w-140 overflow-hidden rounded-2xl border border-[#E4DEFB] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4DEFB] px-5 py-4">
          <h2 id="import-products-title" className="text-base font-semibold text-charcoal-navy">
            Import products
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4C4F7A] hover:bg-[#F3F0FF] transition"
          >
            <svg {...lineIcon} strokeWidth="1.8" className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleInputChange}
          />

          {sheet ? (
            <div>
              <p className="text-sm text-[#4C4F7A]">
                Choose which column in{" "}
                <span className="font-medium text-charcoal-navy">{file.name}</span> fills each
                product field. {sheet.rows.length} {sheet.rows.length === 1 ? "row" : "rows"} found.
              </p>
              <div className="mt-3 max-h-[46vh] space-y-2 overflow-y-auto pr-1">
                {IMPORT_FIELDS.map((field) => (
                  <label key={field.key} className="flex items-center justify-between gap-3">
                    {isRenamable(field.key) ? (
                      // Generic column: the owner names it, and that name labels the field on the product page
                      <input
                        type="text"
                        value={labels[field.key] ?? ""}
                        maxLength={60}
                        disabled={importing}
                        placeholder={field.label}
                        aria-label={`Name for ${field.label}`}
                        onChange={(e) =>
                          setLabels((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        className="h-10 w-[38%] rounded-lg border border-dashed border-[#DDD6FE] bg-white px-3 text-sm text-charcoal-navy outline-none placeholder:text-[#7A869A] focus:border-[#0B1020]"
                      />
                    ) : (
                      <span className="text-sm text-charcoal-navy">
                        {field.label}
                        {field.required && <span className="text-[#B42318]"> *</span>}
                      </span>
                    )}
                    <select
                      value={mapping[field.key]}
                      disabled={importing}
                      onChange={(e) => {
                        const column = e.target.value === "" ? "" : Number(e.target.value);
                        setMapping((prev) => ({ ...prev, [field.key]: column }));
                        // Name an unnamed generic column after the file's column
                        if (
                          isRenamable(field.key) &&
                          column !== "" &&
                          !(labels[field.key] || "").trim()
                        ) {
                          const header = sheet.headers[column];
                          if (header) setLabels((prev) => ({ ...prev, [field.key]: header }));
                        }
                      }}
                      className="h-10 w-[55%] rounded-lg border border-[#DDD6FE] bg-white px-3 text-sm text-charcoal-navy outline-none focus:border-[#0B1020]"
                    >
                      <option value="">Don't import</option>
                      {sheet.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ) : file ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#3B3F8F]">
                <svg {...lineIcon} className="h-5 w-5">
                  <path d="M14 3H6v18h12V7Z" />
                  <path d="M14 3v4h4M9 12h6M9 16h6" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-charcoal-navy">{file.name}</p>
                <p className="text-xs text-[#4C4F7A]">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#4C4F7A] hover:bg-white hover:text-charcoal-navy transition"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                isDragging
                  ? "border-[#0B1020] bg-[#EDE9FE]"
                  : error
                    ? "border-[#E5484D]/60 bg-white hover:border-[#0B1020]"
                    : "border-[#DDD6FE] bg-white hover:border-[#0B1020] hover:bg-[#F5F3FF]"
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EDE9FE] text-[#3B3F8F]">
                <svg {...lineIcon} strokeWidth="1.8" className="h-5 w-5">
                  <path d="M12 15V3M7 8l5-5 5 5M5 21h14" />
                </svg>
              </span>
              <p className="mt-3 text-sm font-medium text-charcoal-navy">
                <span className="underline underline-offset-2">Click to browse</span> or drag and
                drop
              </p>
              <p className="mt-1 text-xs text-[#4C4F7A]">
                Excel (.xlsx, .xls) or CSV (.csv), up to 10MB
              </p>
            </button>
          )}

          {importing && progress && (
            <p role="status" className="mt-3 text-sm text-[#4C4F7A]">
              {progress}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-lg bg-[#FDECEC] px-3 py-2 text-sm text-[#B42318]"
            >
              <svg {...lineIcon} strokeWidth="1.8" className="mt-0.5 h-4 w-4 shrink-0">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#E4DEFB] bg-[#F5F3FF] px-5 py-4">
          <button
            type="button"
            disabled={importing}
            onClick={sheet ? () => setSheet(null) : onClose}
            className="rounded-lg border border-[#DDD6FE] bg-white px-5 py-2.5 text-base font-medium text-charcoal-navy hover:border-charcoal-navy transition disabled:opacity-50"
          >
            {sheet ? "Back" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={sheet ? importing || missingRequired.length > 0 : !file}
            title={
              missingRequired.length
                ? `Choose a column for ${missingRequired.map((f) => f.label).join(", ")}`
                : undefined
            }
            onClick={sheet ? handleImport : handleContinue}
            className="rounded-lg bg-[#0B1020] px-5 py-2.5 text-base font-semibold text-white hover:bg-[#1C2347] transition disabled:cursor-not-allowed disabled:bg-[#C5CCD8] disabled:hover:bg-[#C5CCD8]"
          >
            {importing ? "Importing..." : sheet ? "Import" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  // The Home page "Import products" shortcut opens the import popup straight away
  const location = useLocation();
  const navigate = useNavigate();
  // What the user's roles allow here; the backend refuses the rest anyway
  const canManage = useCan("products.manage");
  const canDelete = useCan("products.delete");
  const [isImportOpen, setIsImportOpen] = useState(
    Boolean(location.state?.openImport) && canManage
  );
  const [products, setProducts] = useState(() =>
    productsCache.items && productsCache.storeId === activeStoreId() ? productsCache.items : []
  );
  const [loaded, setLoaded] = useState(
    Boolean(productsCache.items) && productsCache.storeId === activeStoreId()
  );
  const [selected, setSelected] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [searchQuery, setSearchQuery] = useState("");

  const loadProducts = () =>
    apiGet("/api/v1/catalog/products/").then((res) => {
      setLoaded(true);
      if (!res.ok) return;
      const items = Array.isArray(res.data) ? res.data : res.data?.results || [];
      productsCache = { storeId: activeStoreId(), items };
      setProducts(items);
    });

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredAndSortedProducts = useMemo(() => {
    let list = products;

    if (statusFilter !== "all") {
      list = list.filter((p) => (p.status || "").toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.sku || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
      );
    }

    if (sortBy === "title_asc") {
      list = [...list].sort((a, b) => {
        const nameA = String(a.title || a.name || "")
          .trim()
          .toLowerCase();
        const nameB = String(b.title || b.name || "")
          .trim()
          .toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else if (sortBy === "title_desc") {
      list = [...list].sort((a, b) => {
        const nameA = String(a.title || a.name || "")
          .trim()
          .toLowerCase();
        const nameB = String(b.title || b.name || "")
          .trim()
          .toLowerCase();
        return nameB.localeCompare(nameA);
      });
    } else if (sortBy === "price_asc") {
      list = [...list].sort((a, b) => parseProductPrice(a.price) - parseProductPrice(b.price));
    } else if (sortBy === "price_desc") {
      list = [...list].sort((a, b) => parseProductPrice(b.price) - parseProductPrice(a.price));
    }

    return list;
  }, [products, statusFilter, searchQuery, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredAndSortedProducts.length / pageSize));
  const currentPage = Math.min(page, pageCount); // e.g. after deleting the last items on a page
  const pageStart = (currentPage - 1) * pageSize;
  const pageProducts = filteredAndSortedProducts.slice(pageStart, pageStart + pageSize);
  const allSelected = pageProducts.length > 0 && pageProducts.every((p) => selected.has(p.id));

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // "Select all" covers the products on this page only, so a bulk delete never reaches unseen rows
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      pageProducts.forEach((p) => (allSelected ? next.delete(p.id) : next.add(p.id)));
      return next;
    });

  const exportCsv = async () => {
    // The store's own names for the extra fields; the defaults if they can't be fetched
    const labels = await fetchFieldLabels().catch(() => ({}));
    downloadProductsCsv(
      selected.size ? products.filter((p) => selected.has(p.id)) : filteredAndSortedProducts,
      labels
    );
  };

  const deleteSelected = async () => {
    const count = selected.size;
    if (!count || deleting) return;
    if (!window.confirm(`Delete ${count} product${count === 1 ? "" : "s"}? This can't be undone.`))
      return;

    setDeleting(true);
    setNotice("");
    const ids = [...selected];
    let deleted = 0;
    const blocked = [];

    for (let start = 0; start < ids.length; start += 500) {
      const res = await apiPost("/api/v1/catalog/products/bulk-delete/", {
        ids: ids.slice(start, start + 500),
      });
      if (!res.ok) {
        setNotice(
          `${deleted} deleted. ${
            res.status === 401
              ? "Your session expired. Sign in again."
              : res.formError || "Something went wrong."
          }`
        );
        break;
      }
      deleted += res.data.deleted;
      blocked.push(...res.data.blocked);
    }

    if (blocked.length) {
      setNotice(
        `${deleted} deleted. ${blocked.length} couldn't be deleted because orders or inventory use them (set them to Draft instead): ${blocked
          .slice(0, 3)
          .join(", ")}${blocked.length > 3 ? ", ..." : ""}.`
      );
    }

    setSelected(new Set());
    setDeleting(false);
    await loadProducts();
  };

  return (
    <div className="min-h-screen bg-white text-charcoal-navy">
      <AdminHeader />

      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#F5F3FF] p-5 lg:p-6">
          {/* TITLE */}
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-charcoal-navy">
            <PageIcon name="products" />
            Products
          </h1>

          {/* PRODUCTS CARD */}
          <section className="mt-5 flex flex-1 flex-col overflow-hidden rounded-2xl border border-[#E4DEFB] bg-white shadow-sm">
            {/* Tabs & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4DEFB] px-4 py-2.5">
              {/* Status Filter Dropdown: "All ▼" */}
              <div className="relative inline-flex items-center">
                <select
                  id="products-status-filter"
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 appearance-none rounded-lg bg-[#EDE9FE] pl-3 pr-7 text-xs sm:text-sm font-medium text-charcoal-navy outline-none hover:bg-[#E4DEFB] transition cursor-pointer"
                >
                  {STATUS_TABS.map((tab) => (
                    <option key={tab.id} value={tab.id} className="bg-white text-charcoal-navy">
                      {tab.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] text-charcoal-navy">
                  ▼
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Search */}
                <div className="flex items-center gap-2 h-8 w-full sm:w-56 rounded-lg border border-[#DDD6FE] bg-white px-2.5 text-xs sm:text-sm">
                  <span className="text-slate-400">⌕</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search and filter"
                    aria-label="Search products"
                    className="w-full bg-transparent outline-none text-xs text-[#0B1020] placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setPage(1);
                      }}
                      aria-label="Clear search"
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sort By Dropdown (compact) */}
                <div className="relative shrink-0">
                  <select
                    id="products-sort-by"
                    aria-label="Sort products"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 appearance-none rounded-lg border border-[#DDD6FE] bg-white pl-2.5 pr-6 text-xs font-medium text-charcoal-navy outline-none hover:border-charcoal-navy transition cursor-pointer"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-[#4C4F7A]">
                    ▼
                  </span>
                </div>
              </div>
            </div>

            {products.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-6 py-4">
                  <p className="text-sm text-[#4C4F7A]">
                    {selected.size
                      ? `${selected.size} selected`
                      : `${filteredAndSortedProducts.length} product${filteredAndSortedProducts.length === 1 ? "" : "s"}`}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={exportCsv}
                      className="rounded-lg border border-[#DDD6FE] bg-white px-4 py-2 text-sm font-medium text-charcoal-navy hover:border-charcoal-navy transition"
                    >
                      {selected.size ? `Export ${selected.size}` : "Export"}
                    </button>
                    {canDelete && selected.size > 0 && (
                      <button
                        type="button"
                        onClick={deleteSelected}
                        disabled={deleting}
                        className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition disabled:opacity-50"
                      >
                        {deleting ? "Deleting..." : `Delete ${selected.size}`}
                      </button>
                    )}
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsImportOpen(true)}
                          className="rounded-lg border border-[#DDD6FE] bg-white px-4 py-2 text-sm font-medium text-charcoal-navy hover:border-charcoal-navy transition"
                        >
                          Import
                        </button>
                        <Link
                          to="/admin/online-store/products/new"
                          className="rounded-lg bg-[#0B1020] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1C2347] transition"
                        >
                          + Add product
                        </Link>
                      </>
                    )}
                  </div>
                </div>
                {notice && (
                  <p
                    role="status"
                    className="mx-6 mb-3 rounded-lg bg-[#FFF6E5] px-3 py-2 text-sm text-[#7A4B00]"
                  >
                    {notice}
                  </p>
                )}
                <table className="w-full text-left text-sm">
                  <thead className="border-y border-[#E4DEFB] bg-[#F5F3FF] text-[#4C4F7A]">
                    <tr>
                      {/* Selecting is only for bulk delete */}
                      {canDelete && (
                        <th className="w-10 py-3 pl-6">
                          <input
                            type="checkbox"
                            aria-label="Select all products"
                            checked={allSelected}
                            onChange={toggleAll}
                          />
                        </th>
                      )}
                      <th className={`${canDelete ? "px-4" : "pl-6 pr-4"} py-3 font-medium`}>
                        Product
                      </th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">SKU</th>
                      <th className="px-6 py-3 text-right font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageProducts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={canDelete ? 6 : 5}
                          className="px-6 py-10 text-center text-sm text-[#4C4F7A]"
                        >
                          No products found matching the selected filter.
                        </td>
                      </tr>
                    ) : (
                      pageProducts.map((product) => (
                        <tr
                          key={product.id}
                          className={`border-b border-[#E4DEFB] last:border-0 hover:bg-[#F5F3FF] ${
                            selected.has(product.id) ? "bg-[#F3F0FF]" : ""
                          }`}
                        >
                          {canDelete && (
                            <td className="w-10 py-3 pl-6">
                              <input
                                type="checkbox"
                                aria-label={`Select ${product.title}`}
                                checked={selected.has(product.id)}
                                onChange={() => toggleOne(product.id)}
                              />
                            </td>
                          )}
                          <td
                            className={`${canDelete ? "px-4" : "pl-6 pr-4"} py-3 font-medium text-charcoal-navy`}
                          >
                            <Link
                              to={`/admin/online-store/products/${product.id}`}
                              className="hover:underline"
                            >
                              {product.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3 capitalize text-[#4C4F7A]">{product.status}</td>
                          <td className="px-4 py-3 text-[#4C4F7A]">{product.category || "-"}</td>
                          <td className="px-4 py-3 text-[#4C4F7A]">{product.sku || "-"}</td>
                          <td className="px-6 py-3 text-right text-charcoal-navy">
                            {product.price ?? "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <nav
                  aria-label="Pagination"
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4DEFB] px-6 py-3 text-sm text-[#4C4F7A]"
                >
                  <div className="flex items-center gap-2">
                    <label htmlFor="products-page-size">Rows per page</label>
                    <select
                      id="products-page-size"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="rounded-lg border border-[#DDD6FE] bg-white px-2 py-1 text-charcoal-navy"
                    >
                      {PAGE_SIZES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <span>
                      {filteredAndSortedProducts.length === 0
                        ? "0 of 0"
                        : `${pageStart + 1}-${Math.min(pageStart + pageSize, filteredAndSortedProducts.length)} of ${filteredAndSortedProducts.length}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="rounded-lg border border-[#DDD6FE] bg-white px-3 py-1.5 font-medium text-charcoal-navy hover:border-charcoal-navy transition disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage(currentPage + 1)}
                      disabled={currentPage >= pageCount}
                      className="rounded-lg border border-[#DDD6FE] bg-white px-3 py-1.5 font-medium text-charcoal-navy hover:border-charcoal-navy transition disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </nav>
              </div>
            )}

            {!loaded && products.length === 0 && (
              <p role="status" className="px-6 py-14 text-center text-sm text-[#4C4F7A]">
                Loading products...
              </p>
            )}

            {/* Add your products */}
            {loaded && products.length === 0 && (
              <div className="flex flex-1 items-center justify-between gap-10 px-6 py-12 sm:px-12 lg:pl-[14%] lg:pr-[8%]">
                <div>
                  <h2 className="text-[30px] font-semibold leading-tight text-charcoal-navy sm:text-[34px]">
                    {canManage ? "Add your products" : "No products yet"}
                  </h2>

                  <p className="mt-3 text-xl leading-relaxed text-[#4C4F7A]">
                    {canManage
                      ? "Start by stocking your store with products your customers will love"
                      : "Products added to this store will show up here."}
                  </p>

                  {canManage && (
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <Link
                        to="/admin/online-store/products/new"
                        className="flex items-center gap-2 rounded-lg bg-[#0B1020] px-7 py-3.5 text-[17px] font-semibold text-white hover:bg-[#1C2347] transition"
                      >
                        <span className="text-2xl leading-none">+</span>
                        Add product
                      </Link>

                      <button
                        type="button"
                        onClick={() => setIsImportOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-[#DDD6FE] bg-white px-7 py-3.5 text-[17px] font-medium text-charcoal-navy hover:border-charcoal-navy transition"
                      >
                        <svg {...lineIcon} strokeWidth="1.8" className="h-5 w-5">
                          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
                        </svg>
                        Import
                      </button>
                    </div>
                  )}
                </div>

                {/* Storefront mockup */}
                <div
                  aria-hidden="true"
                  className="hidden xl:block w-105 shrink-0 overflow-hidden rounded-xl border border-[#E6E9EF] bg-white shadow-[0_12px_32px_-24px_rgba(20,27,45,0.3)]"
                >
                  {/* Browser bar */}
                  <div className="flex items-center gap-3 border-b border-[#EEF0F4] bg-[#FAFBFC] px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#D9DEE6]" />
                      <span className="h-2 w-2 rounded-full bg-[#D9DEE6]" />
                      <span className="h-2 w-2 rounded-full bg-[#D9DEE6]" />
                    </div>
                    <span className="flex-1 rounded-md border border-[#EEF0F4] bg-white px-3 py-0.5 text-center text-[11px] text-[#8B8FB8]">
                      yourstore.com
                    </span>
                  </div>

                  {/* Shop header */}
                  <div className="px-5 pb-1 pt-4">
                    <span className="text-xs font-bold tracking-[0.2em] text-[#0B1020]">STORE</span>
                  </div>

                  {/* Product grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5 p-5">
                    {sampleProducts.map((product) => (
                      <div key={product.name}>
                        <div className="flex h-26 items-center justify-center rounded-lg bg-[#F5F6F8] text-[#4C4F7A]">
                          <span className="block h-9 w-9 [&>svg]:h-full [&>svg]:w-full [&>svg]:stroke-[1.25]">
                            {product.icon}
                          </span>
                        </div>
                        <p className="mt-2.5 text-[13px] font-medium text-charcoal-navy">
                          {product.name}
                        </p>
                        <p className="text-xs text-[#8B8FB8]">{product.price}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {isImportOpen && (
        <ImportProductsModal
          onImported={loadProducts}
          onClose={() => {
            setIsImportOpen(false);
            // Clear the shortcut flag so a page refresh doesn't reopen the popup
            if (location.state?.openImport) navigate(".", { replace: true, state: null });
          }}
        />
      )}
    </div>
  );
}
