import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { apiGet, apiPost } from "@/lib/api";
import { getSession, useCan, useSession } from "@/lib/auth";

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

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
    return `This file is ${formatFileSize(file.size)}. The maximum file size is 15MB.`;
  }
  return "";
}

// First sheet of file as { headers: [string], rows: [[cell]] }
async function readSheet(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const table = sheet
    ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false })
    : [];
  const headers = (table[0] || []).map((h) => String(h).trim());
  return { headers, rows: table.slice(1) };
}

// Columns that an imported file can feed
const IMPORT_FIELDS = [
  {
    key: "title",
    label: "Product Name",
    required: true,
    aliases: [
      "product",
      "product name",
      "product title",
      "title",
      "name",
      "item",
      "item name",
      "description",
    ],
  },
  {
    key: "sku",
    label: "SKU",
    required: false,
    aliases: ["sku", "variant sku", "code", "barcode", "item code", "product code"],
  },
  {
    key: "available",
    label: "Available",
    required: false,
    aliases: [
      "available",
      "quantity",
      "qty",
      "stock",
      "inventory",
      "available quantity",
      "variant inventory qty",
    ],
  },
  {
    key: "unavailable",
    label: "Unavailable",
    required: false,
    aliases: ["unavailable", "not available", "hold", "damaged"],
  },
  {
    key: "committed",
    label: "Committed",
    required: false,
    aliases: ["committed", "reserved", "ordered"],
  },
  {
    key: "incoming",
    label: "Incoming",
    required: false,
    aliases: ["incoming", "on order", "in transit"],
  },
];

// Auto-match headers with field aliases
function suggestMapping(headers) {
  const used = new Set();
  const mapping = {};
  IMPORT_FIELDS.forEach((field) => {
    const index = headers.findIndex(
      (h, i) => !used.has(i) && field.aliases.includes(h.toLowerCase().trim())
    );
    mapping[field.key] = index === -1 ? "" : index;
    if (index !== -1) used.add(index);
  });
  return mapping;
}

// Generic product thumbnail: displays image URL if available, otherwise a clean package icon
function ProductThumbnail({ item }) {
  if (item.image_url) {
    return (
      <img
        src={item.image_url}
        alt={item.title}
        className="h-9 w-9 rounded-md border border-[#E1E3E5] object-cover bg-white shrink-0"
      />
    );
  }

  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E3E7ED] bg-[#F7F8FA] text-[#6D7175]"
      title={item.title}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
        <circle cx="7.5" cy="7.5" r="1" fill="currentColor" />
      </svg>
    </div>
  );
}

function storeItems(storeId, items) {
  try {
    localStorage.setItem(`inventory_items_${storeId}`, JSON.stringify(items));
  } catch {}
}

// Inline editable Available quantity cell
function QuantityCell({ value, onChange, disabled, symbol = "⇋" }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);

  // Show the new value when it changes from outside
  const [shownValue, setShownValue] = useState(value);
  if (shownValue !== value) {
    setShownValue(value);
    setTempVal(value);
  }

  const handleCommit = () => {
    setIsEditing(false);
    const parsed = parseInt(tempVal, 10);
    if (!isNaN(parsed) && parsed !== value) {
      onChange(parsed);
    } else {
      setTempVal(value);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleCommit();
    if (e.key === "Escape") {
      setTempVal(value);
      setIsEditing(false);
    }
  };

  const step = (delta) => {
    const next = (parseInt(value, 10) || 0) + delta;
    onChange(next);
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-end">
        <input
          type="number"
          autoFocus
          value={tempVal}
          onChange={(e) => setTempVal(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          className="h-7 w-16 rounded border border-[#202223] bg-white px-1.5 text-right text-sm font-medium text-[#161C2C] shadow-inner outline-none focus:ring-1 focus:ring-[#161C2C]"
        />
      </div>
    );
  }

  return (
    <div className="group relative flex items-center justify-end">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsEditing(true)}
        className="flex h-7 items-center gap-1.5 rounded px-2 text-right text-sm font-medium text-[#161C2C] transition hover:bg-[#E4E5E7] group-hover:border group-hover:border-[#C9CCCF] group-hover:bg-[#F1F2F4]"
        title="Click to adjust quantity"
      >
        <span>{value}</span>
        {symbol && (
          <span className="text-[11px] text-[#6D7175] opacity-75 group-hover:opacity-100">
            {symbol}
          </span>
        )}
      </button>

      {/* Quick +/- micro steppers on hover */}
      {!disabled && (
        <div className="absolute -right-2 top-1/2 hidden -translate-y-1/2 flex-col rounded border border-[#D8DFE8] bg-white shadow-sm group-hover:flex">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label="Increase quantity"
            className="flex h-3.5 w-4 items-center justify-center text-[8px] text-[#53627E] hover:bg-[#F3F6FA] border-b border-[#E3E7ED]"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label="Decrease quantity"
            className="flex h-3.5 w-4 items-center justify-center text-[8px] text-[#53627E] hover:bg-[#F3F6FA]"
          >
            ▼
          </button>
        </div>
      )}
    </div>
  );
}

// On Hand Quantity Editing Popover matching the reference screenshot
function OnHandPopover({ item, currentOnHand, locationName, onSave, onClose }) {
  const [actionType, setActionType] = useState("set"); // "set" | "add"
  const [inputVal, setInputVal] = useState(currentOnHand);
  const [selectedLocation, setSelectedLocation] = useState(locationName || "SIPNOW");
  const [reason, setReason] = useState("Correction");
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const popoverRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleConfirm = () => {
    const val = parseInt(inputVal, 10);
    if (isNaN(val)) return;

    const newOnHand = actionType === "add" ? currentOnHand + val : val;
    // On Hand = Available + Committed + Unavailable
    // Available = newOnHand - Committed - Unavailable
    const newAvailable = newOnHand - (item.committed || 0) - (item.unavailable || 0);
    onSave(item.id, newAvailable, newOnHand);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onClose();
  };

  const step = (delta) => {
    setInputVal((prev) => (parseInt(prev, 10) || 0) + delta);
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-1.5 z-50 flex items-center gap-2 rounded-xl border border-[#D8DFE8] bg-white p-2 shadow-[0_6px_22px_rgba(0,0,0,0.16)] whitespace-nowrap text-left"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Action + Quantity Compound Control */}
      <div className="flex h-9 items-center rounded-lg border border-[#8C9196] bg-white overflow-hidden shadow-2xs focus-within:border-[#161C2C] focus-within:ring-1 focus-within:ring-[#161C2C]">
        {/* Action dropdown: Set to / Add */}
        <div className="relative border-r border-[#D8DFE8] bg-white">
          <select
            value={actionType}
            onChange={(e) => {
              const next = e.target.value;
              setActionType(next);
              setInputVal(next === "add" ? 0 : currentOnHand);
            }}
            className="h-9 appearance-none bg-transparent pl-2.5 pr-6 text-xs sm:text-sm font-normal text-[#161C2C] outline-none cursor-pointer"
          >
            <option value="set">Set to</option>
            <option value="add">Add</option>
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#53627E]">
            ▼
          </span>
        </div>

        {/* Quantity Input */}
        <input
          type="number"
          autoFocus
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-9 w-14 sm:w-16 px-1.5 text-center text-sm font-medium text-[#161C2C] outline-none bg-white"
        />

        {/* Micro Steppers (▲ / ▼) */}
        <div className="flex h-full flex-col border-l border-[#D8DFE8]">
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Increase quantity"
            className="flex h-4.5 w-4.5 items-center justify-center text-[8px] text-[#53627E] hover:bg-[#F3F6FA] border-b border-[#E3E7ED]"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Decrease quantity"
            className="flex h-4.5 w-4.5 items-center justify-center text-[8px] text-[#53627E] hover:bg-[#F3F6FA]"
          >
            ▼
          </button>
        </div>
      </div>

      {/* 2. Location Dropdown */}
      <div className="relative">
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="h-9 appearance-none rounded-lg border border-[#8C9196] bg-white pl-3 pr-7 text-xs sm:text-sm font-normal text-[#161C2C] outline-none shadow-2xs cursor-pointer hover:border-[#161C2C] min-w-[130px]"
        >
          <option value={locationName}>{locationName}</option>
          <option value="Main Warehouse">Main Warehouse</option>
          <option value="Online Store">Online Store</option>
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-col text-[7px] text-[#53627E] leading-[6px]">
          ▲▼
        </span>
      </div>

      {/* 3. Reason for Adjustment Icon Button & Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowReasonDropdown((prev) => !prev)}
          title={`Adjustment reason: ${reason}`}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8DFE8] bg-white text-[#53627E] hover:bg-[#F3F6FA] hover:text-[#161C2C] transition shadow-2xs ${
            showReasonDropdown ? "ring-1 ring-[#161C2C] border-[#161C2C]" : ""
          }`}
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
            <path d="M8 12h8" />
            <path d="M12 8v8" />
          </svg>
        </button>

        {showReasonDropdown && (
          <div className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-lg border border-[#E3E7ED] bg-white py-1 shadow-lg text-xs text-[#161C2C]">
            <div className="px-3 py-1 font-semibold text-[11px] text-[#53627E] border-b border-[#F0F2F5]">
              Reason for adjustment
            </div>
            {["Correction", "Inventory count", "Received", "Damaged", "Returned", "Promotion"].map(
              (r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setReason(r);
                    setShowReasonDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-[#F3F6FA] transition ${
                    reason === r ? "font-semibold text-[#005BD3] bg-[#F0F4FA]" : ""
                  }`}
                >
                  {r}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* 4. Confirm / Save Button */}
      <button
        type="button"
        onClick={handleConfirm}
        title="Confirm quantity change"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8DFE8] bg-white text-[#161C2C] hover:bg-[#161C2C] hover:text-white transition shadow-2xs"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
    </div>
  );
}

// Reusable Import Modal
function ImportModal({ onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef(null);

  const selectFile = (selected) => {
    if (!selected) return;
    const msg = validateFile(selected);
    setSheet(null);
    if (msg) {
      setFile(null);
      setError(msg);
    } else {
      setFile(selected);
      setError("");
    }
  };

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

  const handleImport = async () => {
    if (!sheet || importing) return;
    if (mapping.title === "" || mapping.title === undefined) {
      setError("Please select a column for Product Name.");
      return;
    }

    setImporting(true);
    setError("");

    try {
      const parsedItems = sheet.rows
        .map((cells, idx) => {
          const pick = (key) => {
            const col = mapping[key];
            if (col === "" || col === undefined) return "";
            return String(cells[col] ?? "").trim();
          };

          const title = pick("title");
          if (!title) return null;

          const sku = pick("sku");
          const availableStr = pick("available").replace(/[^0-9.-]/g, "");
          const unavailableStr = pick("unavailable").replace(/[^0-9.-]/g, "");
          const committedStr = pick("committed").replace(/[^0-9.-]/g, "");
          const incomingStr = pick("incoming").replace(/[^0-9.-]/g, "");

          return {
            id: `inv-${Date.now()}-${idx}`,
            title,
            sku: sku || `SKU-${idx + 1000}`,
            available: availableStr !== "" ? Number(availableStr) : 0,
            unavailable: unavailableStr !== "" ? Number(unavailableStr) : 0,
            committed: committedStr !== "" ? Number(committedStr) : 0,
            incoming: incomingStr !== "" ? Number(incomingStr) : 0,
          };
        })
        .filter(Boolean);

      if (!parsedItems.length) {
        setError("No valid products could be extracted from the file.");
        setImporting(false);
        return;
      }

      // Also sync to catalog bulk endpoint in background if accessible
      const catalogBatch = parsedItems.map((p) => ({
        title: p.title,
        sku: p.sku,
        quantity: p.available,
        status: "active",
      }));
      apiPost("/api/v1/catalog/products/bulk/", { products: catalogBatch }).catch(() => {});

      onImportSuccess(parsedItems);
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to import items from file.");
      setImporting(false);
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
        aria-labelledby="import-modal-title"
        className="w-full max-w-lg rounded-2xl border border-[#E3E7ED] bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E3E7ED] px-5 py-4">
          <h2 id="import-modal-title" className="text-base font-semibold text-[#161C2C]">
            Import inventory
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#53627E] hover:bg-[#F3F6FA] transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              selectFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {sheet ? (
            <div>
              <p className="text-sm text-[#53627E] mb-3">
                Match columns in <span className="font-medium text-[#161C2C]">{file?.name}</span> to
                inventory fields. Found {sheet.rows.length} rows.
              </p>
              <div className="max-h-[46vh] space-y-2.5 overflow-y-auto pr-1">
                {IMPORT_FIELDS.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-[#161C2C] font-medium">
                      {field.label}
                      {field.required && <span className="text-red-500"> *</span>}
                    </span>
                    <select
                      value={mapping[field.key] ?? ""}
                      disabled={importing}
                      onChange={(e) => {
                        const col = e.target.value === "" ? "" : Number(e.target.value);
                        setMapping((prev) => ({ ...prev, [field.key]: col }));
                      }}
                      className="h-9 w-[55%] rounded-lg border border-[#D8DFE8] bg-white px-3 text-sm text-[#161C2C] outline-none focus:border-[#161C2C]"
                    >
                      <option value="">Don&apos;t import</option>
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
            <div className="flex items-center gap-3 rounded-xl border border-[#D8DFE8] bg-[#F7F8FA] px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 border border-[#D8DFE8]">
                📄
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#161C2C]">{file.name}</p>
                <p className="text-xs text-[#53627E]">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#53627E] hover:bg-white hover:text-[#161C2C] transition"
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
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                selectFile(e.dataTransfer.files?.[0]);
              }}
              className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                isDragging
                  ? "border-[#161C2C] bg-[#EEF1F6]"
                  : error
                    ? "border-red-300 bg-red-50/20"
                    : "border-[#D8DFE8] bg-[#FAFBFD] hover:border-[#161C2C] hover:bg-white"
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white border border-[#D8DFE8] text-[#161C2C] shadow-2xs mb-2">
                ⬆
              </span>
              <p className="text-sm font-medium text-[#161C2C]">
                <span className="underline underline-offset-2">Click to browse</span> or drag and
                drop
              </p>
              <p className="mt-1 text-xs text-[#53627E]">
                Excel (.xlsx, .xls) or CSV (.csv), up to 15MB
              </p>
            </button>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 border-t border-[#E3E7ED] bg-[#FAFBFD] px-5 py-3.5">
          <button
            type="button"
            disabled={importing}
            onClick={sheet ? () => setSheet(null) : onClose}
            className="rounded-lg border border-[#D8DFE8] bg-white px-4 py-2 text-sm font-medium text-[#161C2C] hover:bg-[#F3F6FA] transition"
          >
            {sheet ? "Back" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={sheet ? importing : !file}
            onClick={sheet ? handleImport : handleContinue}
            className="rounded-lg bg-[#161C2C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#252E45] transition disabled:opacity-50"
          >
            {importing ? "Importing..." : sheet ? "Import" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const canManage = useCan("inventory.manage");
  const session = useSession();
  const storeId = getSession()?.storeId || "default";

  // Location name: reads from active session / store, defaults to "SIPNOW" matching screenshot
  const locationName =
    session?.store?.storeName ||
    session?.stores?.find((s) => s.storeId === storeId)?.storeName ||
    "SIPNOW";

  // Dynamic inventory items loaded from catalog or imported by the user
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(`inventory_items_${storeId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [filterTab, setFilterTab] = useState("all"); // 'all' | 'in_stock' | 'out_of_stock'
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [notice, setNotice] = useState("");

  // ID of row currently editing On Hand quantity
  const [editingOnHandId, setEditingOnHandId] = useState(null);

  const pageSize = 50;

  // Persist imported items in localStorage for this store
  const saveItems = (newItems) => {
    setItems(newItems);
    storeItems(storeId, newItems);
  };

  // On mount, if no items are in local storage, load existing products from the store's backend catalog
  useEffect(() => {
    let active = true;
    apiGet("/api/v1/catalog/products/").then((res) => {
      if (!active || !res?.ok) return;
      const results = Array.isArray(res.data) ? res.data : res.data?.results || [];
      if (results.length > 0) {
        setItems((current) => {
          if (current.length > 0) return current; // Keep user imported items if present
          const catalogItems = results.map((p, idx) => ({
            id: p.id || `prod-${idx}`,
            title: p.title || "Untitled Product",
            sku: p.sku || `SKU-${idx + 1000}`,
            unavailable: p.unavailable || 0,
            committed: p.committed || 0,
            available: typeof p.quantity === "number" ? p.quantity : 0,
            incoming: p.incoming || 0,
            image_url: p.primary_image?.image_url || p.image_url || null,
          }));
          storeItems(storeId, catalogItems);
          return catalogItems;
        });
      }
    });

    return () => {
      active = false;
    };
  }, [storeId]);

  // Handle successful import of file items
  const handleImportSuccess = (importedProducts) => {
    saveItems(importedProducts);
    setNotice(
      `Successfully imported ${importedProducts.length} product${importedProducts.length === 1 ? "" : "s"}.`
    );
    setCurrentPage(1);
    setTimeout(() => setNotice(""), 4500);
  };

  // Filter items by search query & tab
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (filterTab === "in_stock" && item.available <= 0) return false;
      if (filterTab === "out_of_stock" && item.available > 0) return false;

      if (!q) return true;
      return item.title?.toLowerCase().includes(q) || item.sku?.toLowerCase().includes(q);
    });
  }, [items, searchQuery, filterTab]);

  // Pagination calculation
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = filteredItems.slice(startIndex, startIndex + pageSize);

  // Selection handlers
  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((item) => selectedIds.has(item.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageItems.forEach((i) => next.delete(i.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageItems.forEach((i) => next.add(i.id));
        return next;
      });
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Inline Available quantity adjustment
  const updateAvailable = (id, newAvailable) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, available: newAvailable } : item
    );
    saveItems(updated);
  };

  // Inline Unavailable quantity adjustment
  const updateUnavailable = (id, newUnavailable) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, unavailable: newUnavailable } : item
    );
    saveItems(updated);
  };

  // Save On Hand quantity adjustment from the popover
  const handleSaveOnHand = (id, newAvailable, newOnHand) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, available: newAvailable } : item
    );
    saveItems(updated);
    setNotice(`Updated on hand quantity to ${newOnHand}.`);
    setTimeout(() => setNotice(""), 3500);
  };

  // Export current inventory table as CSV
  const handleExport = () => {
    if (!filteredItems.length) return;
    const headers = [
      "Product Name",
      "SKU",
      "Unavailable",
      "Committed",
      "Available",
      "On Hand",
      "Incoming",
    ];

    const rows = filteredItems.map((item) => {
      const onHand = (item.available || 0) + (item.committed || 0) + (item.unavailable || 0);
      return [
        `"${(item.title || "").replace(/"/g, '""')}"`,
        `"${item.sku || ""}"`,
        item.unavailable ?? 0,
        item.committed ?? 0,
        item.available ?? 0,
        onHand,
        item.incoming ?? 0,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white text-[#161C2C]">
      <AdminHeader />

      {/* BODY LAYOUT */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 bg-[#F7F8FA] px-4 sm:px-8 py-6 max-w-full overflow-x-hidden">
          {/* TITLE & ACTIONS */}
          <div className="mb-4 flex items-center justify-between">
            <h1 className="flex items-center gap-2.5 text-[20px] sm:text-[22px] font-bold text-[#161C2C]">
              <PageIcon name="inventory" />
              Inventory
            </h1>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={items.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-[#D8DFE8] bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-[#161C2C] shadow-2xs hover:bg-[#F3F6FA] disabled:opacity-50 transition cursor-pointer"
              >
                Export
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#D8DFE8] bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-[#161C2C] shadow-2xs hover:bg-[#F3F6FA] transition cursor-pointer"
              >
                Import
              </button>
            </div>
          </div>

          {/* SUCCESS NOTIFICATION */}
          {notice && (
            <div className="mb-4 flex items-center justify-between rounded-lg bg-[#EBF5FB] px-4 py-2.5 text-sm text-[#004B87]">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                className="text-xs font-semibold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* INVENTORY TABLE CARD */}
          <section className="rounded-xl border border-[#E3E7ED] bg-white shadow-2xs overflow-visible">
            {/* TOOLBAR */}
            <div className="flex items-center justify-between border-b border-[#E3E7ED] px-3 sm:px-4 py-2.5 bg-white">
              {/* Left: View Filter (All ⇅) + Search input */}
              <div className="flex items-center gap-2 flex-1 max-w-xl">
                {/* View dropdown: All ⇅ matching screenshot */}
                <div className="relative">
                  <select
                    value={filterTab}
                    onChange={(e) => {
                      setFilterTab(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-9 appearance-none rounded-lg border border-[#D8DFE8] bg-white pl-3 pr-7 text-xs sm:text-sm font-medium text-[#161C2C] outline-none hover:bg-[#F3F6FA] cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="in_stock">In stock</option>
                    <option value="out_of_stock">Out of stock</option>
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-col text-[7px] text-[#53627E] leading-[6px]">
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
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search and filter"
                    className="h-9 w-full rounded-lg border border-[#D8DFE8] bg-white pl-9 pr-8 text-xs sm:text-sm text-[#161C2C] placeholder:text-slate-400 outline-none focus:border-[#161C2C] focus:ring-1 focus:ring-[#161C2C]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-600"
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
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8DFE8] bg-white text-[#53627E] hover:bg-[#F3F6FA] transition shrink-0 ml-2"
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

            {/* SELECTION BAR */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between border-b border-[#E3E7ED] bg-[#F7F9FC] px-5 py-2 text-xs font-medium text-[#161C2C]">
                <span>{selectedIds.size} selected</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-slate-500 hover:underline"
                >
                  Clear selection
                </button>
              </div>
            )}

            {/* INVENTORY TABLE STRUCTURE */}
            <div className="overflow-x-auto min-h-[300px] pb-16">
              <table className="w-full border-collapse text-left text-sm text-[#161C2C]">
                <thead>
                  <tr className="border-b border-[#E3E7ED] bg-[#FAFBFD] text-xs font-semibold text-[#5C5F62] whitespace-nowrap select-none">
                    <th className="py-3 pl-4 pr-2 w-10">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all products on page"
                        className="h-4 w-4 rounded border-slate-300 accent-[#161C2C] cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3 min-w-[280px]">Product</th>
                    <th className="py-3 px-3 min-w-[200px]">SKU</th>
                    <th className="py-3 px-3 text-right min-w-[100px]">
                      <span
                        className="border-b border-dotted border-slate-400 cursor-help"
                        title="Unavailable inventory"
                      >
                        Unavailable
                      </span>
                    </th>
                    <th className="py-3 px-3 text-right min-w-[100px]">
                      <span
                        className="border-b border-dotted border-slate-400 cursor-help"
                        title="Committed to open orders"
                      >
                        Committed
                      </span>
                    </th>
                    <th className="py-3 px-3 text-right min-w-[100px]">
                      <span
                        className="border-b border-dotted border-slate-400 cursor-help"
                        title="Available to sell"
                      >
                        Available
                      </span>
                    </th>
                    <th className="py-3 px-3 text-right min-w-[110px]">
                      <span
                        className="border-b border-dotted border-slate-400 cursor-help"
                        title="Total on hand: Available + Committed + Unavailable"
                      >
                        On hand
                      </span>
                    </th>
                    <th className="py-3 pl-3 pr-6 text-right min-w-[90px]">Incoming</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E3E7ED]">
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-sm text-[#53627E]">
                        <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0F2F5] text-[#161C2C]">
                            <PageIcon name="inventory" />
                          </span>
                          <p className="font-semibold text-base text-[#161C2C]">
                            {searchQuery ? "No matching products found" : "No inventory items yet"}
                          </p>
                          <p className="mt-1 text-xs text-[#53627E]">
                            {searchQuery
                              ? `No products match "${searchQuery}".`
                              : "Click Import to upload your product inventory file (CSV or Excel)."}
                          </p>
                          {!searchQuery && (
                            <button
                              type="button"
                              onClick={() => setIsImportModalOpen(true)}
                              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#161C2C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#252E45] transition shadow-xs cursor-pointer"
                            >
                              Import products
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((item) => {
                      const onHand =
                        (item.available || 0) + (item.committed || 0) + (item.unavailable || 0);
                      const isSelected = selectedIds.has(item.id);
                      const isEditingThisOnHand = editingOnHandId === item.id;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-[#F9FAFB] transition-colors ${
                            isSelected ? "bg-[#F3F6FA]" : "bg-white"
                          } ${isEditingThisOnHand ? "bg-[#FAFBFD]" : ""}`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 pl-4 pr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(item.id)}
                              aria-label={`Select ${item.title}`}
                              className="h-4 w-4 rounded border-slate-300 accent-[#161C2C] cursor-pointer"
                            />
                          </td>

                          {/* Product Thumbnail + Title */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-3">
                              <ProductThumbnail item={item} />
                              <Link
                                to={`/admin/online-store/products/${item.id}`}
                                className="font-medium text-[#161C2C] hover:text-[#005BD3] hover:underline line-clamp-1 leading-snug"
                                title={item.title}
                              >
                                {item.title}
                              </Link>
                            </div>
                          </td>

                          {/* SKU */}
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-xs text-[#53627E] select-all tracking-tight">
                              {item.sku || "—"}
                            </span>
                          </td>

                          {/* Unavailable */}
                          <td className="py-2.5 px-3 text-right">
                            <QuantityCell
                              value={item.unavailable ?? 0}
                              onChange={(val) => updateUnavailable(item.id, val)}
                              disabled={!canManage}
                              symbol="▾"
                            />
                          </td>

                          {/* Committed */}
                          <td className="py-2.5 px-3 text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-[#161C2C]">
                              {item.committed ?? 0}
                              <span className="text-[10px] text-[#6D7175]">▾</span>
                            </span>
                          </td>

                          {/* Available (Interactive inline quantity editor) */}
                          <td className="py-2.5 px-3 text-right">
                            <QuantityCell
                              value={item.available ?? 0}
                              onChange={(val) => updateAvailable(item.id, val)}
                              disabled={!canManage}
                              symbol="⇋"
                            />
                          </td>

                          {/* On Hand (Clickable to open inline editing popover matching screenshot) */}
                          <td className="py-2.5 px-3 text-right relative">
                            <button
                              type="button"
                              disabled={!canManage}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingOnHandId(isEditingThisOnHand ? null : item.id);
                              }}
                              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium transition cursor-pointer select-none ${
                                isEditingThisOnHand
                                  ? "bg-[#E4E5E7] text-[#161C2C] ring-1 ring-[#8C9196]"
                                  : onHand < 0
                                    ? "text-[#D82C0D] hover:bg-[#E4E5E7]"
                                    : "text-[#161C2C] hover:bg-[#E4E5E7]"
                              }`}
                              title="Click to edit on hand quantity"
                            >
                              <span>{onHand}</span>
                              <span className="text-[11px] text-[#6D7175]">⇋</span>
                            </button>

                            {/* On Hand Editing Popover */}
                            {isEditingThisOnHand && (
                              <OnHandPopover
                                item={item}
                                currentOnHand={onHand}
                                locationName={locationName}
                                onSave={handleSaveOnHand}
                                onClose={() => setEditingOnHandId(null)}
                              />
                            )}
                          </td>

                          {/* Incoming */}
                          <td className="py-2.5 pl-3 pr-6 text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-[#161C2C]">
                              {item.incoming ?? 0}
                              <span className="text-[10px] text-[#6D7175]">▾</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION BAR */}
            <div className="flex items-center justify-between border-t border-[#E3E7ED] bg-[#FAFBFD] px-4 py-3 text-xs sm:text-sm text-[#5C5F62]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  className="flex h-7 w-7 items-center justify-center rounded border border-[#D8DFE8] bg-white text-slate-700 shadow-2xs hover:bg-[#F3F6FA] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ‹
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  className="flex h-7 w-7 items-center justify-center rounded border border-[#D8DFE8] bg-white text-slate-700 shadow-2xs hover:bg-[#F3F6FA] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ›
                </button>
                <span className="ml-1 font-medium text-[#161C2C]">
                  {totalItems > 0
                    ? `${startIndex + 1}-${Math.min(startIndex + pageSize, totalItems)}`
                    : "0-0"}
                </span>
              </div>

              <div className="text-xs text-slate-500">Showing {totalItems} total items</div>
            </div>
          </section>

          {/* FOOTER LINK */}
          <div className="mt-8 mb-6 text-center">
            <a
              href="https://help.shopify.com/en/manual/products/inventory"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#5C5F62] hover:text-[#161C2C] hover:underline"
            >
              Learn more about managing inventory
            </a>
          </div>
        </main>
      </div>

      {/* REUSABLE IMPORT MODAL */}
      {isImportModalOpen && (
        <ImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}
