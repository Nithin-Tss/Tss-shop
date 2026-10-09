import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

const lineIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

// Sample product pictures shown next to "Add your products"
const sampleProducts = [
  {
    name: "Sneaker",
    icon: (
      <svg {...lineIcon}>
        <path d="M2 16v-3.5l3-1 3 2.5h3l4-4 7 3.5V16Z" />
        <path d="M2 16v2h20v-2" />
        <path d="M9.5 12.5l1.5 2M12 11.5l1.5 2" />
      </svg>
    ),
  },
  {
    name: "Tote bag",
    icon: (
      <svg {...lineIcon}>
        <path d="M5 8h14l-1 13H6Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    ),
  },
  {
    name: "Cream tube",
    icon: (
      <svg {...lineIcon}>
        <path d="M3 10h13l3 1.5v1L16 14H3Z" />
        <path d="M19 11.5h2v1h-2" />
        <path d="M6 12c1-1 2 1 3 0s2 1 3 0" />
      </svg>
    ),
  },
  {
    name: "Mug",
    icon: (
      <svg {...lineIcon}>
        <path d="M5 7h11v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3Z" />
        <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
      </svg>
    ),
  },
];

function ImportProductsModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const selectFile = (selected) => {
    if (!selected) return;
    const message = validateFile(selected);
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

  const handleImport = () => {
    if (!file) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#161C2C]/50 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-products-title"
        className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E3E7ED] px-5 py-4">
          <h2 id="import-products-title" className="text-base font-semibold text-[#161C2C]">
            Import products
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#53627E] hover:bg-[#F3F6FA] transition"
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

          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#D8DFE8] bg-[#F7F8FA] px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#30466F]">
                <svg {...lineIcon} className="h-5 w-5">
                  <path d="M14 3H6v18h12V7Z" />
                  <path d="M14 3v4h4M9 12h6M9 16h6" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#161C2C]">{file.name}</p>
                <p className="text-xs text-[#53627E]">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#53627E] hover:bg-white hover:text-[#161C2C] transition"
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
                  ? "border-[#141b2d] bg-[#EEF1F6]"
                  : error
                    ? "border-[#E5484D]/60 bg-white hover:border-[#141b2d]"
                    : "border-[#D8DFE8] bg-white hover:border-[#141b2d] hover:bg-[#F7F8FA]"
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF1F6] text-[#30466F]">
                <svg {...lineIcon} strokeWidth="1.8" className="h-5 w-5">
                  <path d="M12 15V3M7 8l5-5 5 5M5 21h14" />
                </svg>
              </span>
              <p className="mt-3 text-sm font-medium text-[#161C2C]">
                <span className="underline underline-offset-2">Click to browse</span> or drag and drop
              </p>
              <p className="mt-1 text-xs text-[#53627E]">
                Excel (.xlsx, .xls) or CSV (.csv), up to 10MB
              </p>
            </button>
          )}

          {error && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-[#FDECEC] px-3 py-2 text-sm text-[#B42318]">
              <svg {...lineIcon} strokeWidth="1.8" className="mt-0.5 h-4 w-4 shrink-0">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              {error}
            </p>
          )}
        </div>


        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#E3E7ED] bg-[#F7F8FA] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#D8DFE8] bg-white px-5 py-2.5 text-base font-medium text-[#161C2C] hover:border-[#161C2C] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!file}
            onClick={handleImport}
            className="rounded-lg bg-[#141b2d] px-5 py-2.5 text-base font-semibold text-white hover:bg-[#252E45] transition disabled:cursor-not-allowed disabled:bg-[#C5CCD8] disabled:hover:bg-[#C5CCD8]"
          >
            Import
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
  const [isImportOpen, setIsImportOpen] = useState(Boolean(location.state?.openImport));

  return (
    <div className="min-h-screen bg-white text-[#161C2C]">

      <AdminHeader />


      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">

        {/* SIDEBAR */}
        <AdminSidebar />


        {/* MAIN CONTENT */}
        <main className="flex-1 bg-[#F7F8FA] px-6 lg:px-8 py-6 overflow-hidden">

          {/* TITLE */}
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#161C2C]">
            <PageIcon name="products" />
            Products
          </h1>


          {/* PRODUCTS CARD */}
          <section className="mt-5 overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white shadow-sm">

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-[#E3E7ED] px-4 py-3">
              <button
                type="button"
                className="rounded-lg bg-[#EEF1F6] px-3 py-1.5 text-sm font-medium text-[#161C2C]"
              >
                All
              </button>

              <button
                type="button"
                aria-label="Add view"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#53627E] hover:bg-[#F3F6FA] transition"
              >
                +
              </button>
            </div>


            {/* Add your products */}
            <div className="flex items-center justify-between gap-10 px-6 py-14 sm:px-12 lg:pl-[14%] lg:pr-10">

              <div>
                <h2 className="text-xl font-semibold text-[#161C2C]">
                  Add your products
                </h2>

                <p className="mt-2 text-base leading-relaxed text-[#53627E]">
                  Start by stocking your store with products your customers will love
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    to="/admin/online-store/products/new"
                    className="flex items-center gap-2 rounded-lg bg-[#141b2d] px-5 py-2.5 text-base font-semibold text-white hover:bg-[#252E45] transition"
                  >
                    <span className="text-lg leading-none">+</span>
                    Add product
                  </Link>

                  <button
                    type="button"
                    onClick={() => setIsImportOpen(true)}
                    className="flex items-center gap-2 rounded-lg border border-[#D8DFE8] bg-white px-5 py-2.5 text-base font-medium text-[#161C2C] hover:border-[#161C2C] transition"
                  >
                    <svg {...lineIcon} strokeWidth="1.8" className="h-4 w-4">
                      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
                    </svg>
                    Import
                  </button>
                </div>
              </div>


              {/* Product pictures */}
              <div className="hidden lg:grid shrink-0 grid-cols-2 gap-3">
                {sampleProducts.map((product, index) => (
                  <div
                    key={product.name}
                    title={product.name}
                    className={`flex h-[90px] w-[140px] items-center justify-center rounded-xl bg-[#F3F5F8] text-[#30466F] ${index % 2 === 1 ? "-mt-6" : "mt-6"
                      }`}
                  >
                    <span className="block h-12 w-12 [&>svg]:h-full [&>svg]:w-full">
                      {product.icon}
                    </span>
                  </div>
                ))}
              </div>

            </div>


            {/* Find products to sell */}
            <div className="bg-[#F7F8FA] px-6 py-10 sm:px-12 lg:px-[14%]">
              <h3 className="text-lg font-semibold text-[#161C2C]">
                Find products to sell
              </h3>

              <p className="mt-2 max-w-[640px] text-base leading-relaxed text-[#53627E]">
                Have dropshipping or print on demand products shipped directly
                from the supplier to your customer, and only pay for what you sell.
              </p>

              <button
                type="button"
                className="mt-6 rounded-lg border border-[#D8DFE8] bg-white px-5 py-2.5 text-base font-medium text-[#161C2C] hover:border-[#161C2C] transition"
              >
                Discover products to sell
              </button>
            </div>

          </section>

        </main>

      </div>

      {isImportOpen && (
        <ImportProductsModal
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
