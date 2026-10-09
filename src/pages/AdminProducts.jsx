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
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#F7F8FA] p-5 lg:p-6">

          {/* TITLE */}
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-[#161C2C]">
            <PageIcon name="products" />
            Products
          </h1>


          {/* PRODUCTS CARD */}
          <section className="mt-5 flex flex-1 flex-col overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white shadow-sm">

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-[#E3E7ED] px-4 py-3">
              <button
                type="button"
                className="rounded-lg bg-[#EEF1F6] px-3.5 py-1.5 text-[15px] font-medium text-[#161C2C]"
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
            <div className="flex flex-1 items-center justify-between gap-10 px-6 py-12 sm:px-12 lg:pl-[14%] lg:pr-[8%]">

              <div>
                <h2 className="text-[30px] font-semibold leading-tight text-[#161C2C] sm:text-[34px]">
                  Add your products
                </h2>

                <p className="mt-3 text-xl leading-relaxed text-[#53627E]">
                  Start by stocking your store with products your customers will love
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    to="/admin/online-store/products/new"
                    className="flex items-center gap-2 rounded-lg bg-[#141b2d] px-7 py-3.5 text-[17px] font-semibold text-white hover:bg-[#252E45] transition"
                  >
                    <span className="text-2xl leading-none">+</span>
                    Add product
                  </Link>

                  <button
                    type="button"
                    onClick={() => setIsImportOpen(true)}
                    className="flex items-center gap-2 rounded-lg border border-[#D8DFE8] bg-white px-7 py-3.5 text-[17px] font-medium text-[#161C2C] hover:border-[#161C2C] transition"
                  >
                    <svg {...lineIcon} strokeWidth="1.8" className="h-5 w-5">
                      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
                    </svg>
                    Import
                  </button>
                </div>
              </div>


              {/* Storefront mockup */}
              <div
                aria-hidden="true"
                className="hidden xl:block w-[420px] shrink-0 overflow-hidden rounded-xl border border-[#E6E9EF] bg-white shadow-[0_12px_32px_-24px_rgba(20,27,45,0.3)]"
              >
                {/* Browser bar */}
                <div className="flex items-center gap-3 border-b border-[#EEF0F4] bg-[#FAFBFC] px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#D9DEE6]" />
                    <span className="h-2 w-2 rounded-full bg-[#D9DEE6]" />
                    <span className="h-2 w-2 rounded-full bg-[#D9DEE6]" />
                  </div>
                  <span className="flex-1 rounded-md border border-[#EEF0F4] bg-white px-3 py-0.5 text-center text-[11px] text-[#8A94A8]">
                    yourstore.com
                  </span>
                </div>

                {/* Shop header */}
                <div className="px-5 pb-1 pt-4">
                  <span className="text-xs font-bold tracking-[0.2em] text-[#141b2d]">STORE</span>
                </div>

                {/* Product grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-5 p-5">
                  {sampleProducts.map((product) => (
                    <div key={product.name}>
                      <div className="flex h-[104px] items-center justify-center rounded-lg bg-[#F5F6F8] text-[#53627E]">
                        <span className="block h-9 w-9 [&>svg]:h-full [&>svg]:w-full [&>svg]:stroke-[1.25]">
                          {product.icon}
                        </span>
                      </div>
                      <p className="mt-2.5 text-[13px] font-medium text-[#161C2C]">{product.name}</p>
                      <p className="text-xs text-[#8A94A8]">{product.price}</p>
                    </div>
                  ))}
                </div>
              </div>

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
