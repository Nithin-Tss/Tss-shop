import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import { apiGet, apiPost } from "@/lib/api";
import { getSession, useCan } from "@/lib/auth";

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
  const XLSX = await import("xlsx");
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
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E4DEFB] bg-[#F5F3FF] text-[#6D7175]"
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

// Reasons offered in the adjust popup, and the key the server stores for each
const ADJUST_REASONS = {
  Correction: "correction",
  "Inventory count": "cycle_count",
  Received: "received",
  Damaged: "shrinkage",
  Returned: "return_restock",
  Promotion: "other",
};

// Why stock is set aside (Unavailable)
const UNAVAILABLE_REASONS = {
  damaged: "Damaged",
  quality_control: "Quality control",
  safety_stock: "Safety stock",
  other: "Other",
};

const listOf = (res) =>
  res?.ok ? (Array.isArray(res.data) ? res.data : res.data?.results || []) : [];

// Text of a failed request
function errorText(res) {
  return (
    res?.formError ||
    Object.values(res?.fieldErrors || {})[0] ||
    res?.error ||
    "Something went wrong. Please try again."
  );
}

// One row per stock record (product variant at a location). A variant with no stock record yet
// is listed too, with 0, at the store's first location: adjusting it creates the record.
function buildRows(stock, products, locations) {
  const image = {};
  products.forEach((p) => {
    image[p.id] = p.images?.[0]?.url || null;
  });

  const rows = stock.map((s) => ({
    id: s.id,
    itemId: s.id,
    product: s.product,
    variant: s.variant,
    location: s.location,
    locationName: s.location_name,
    title: s.product_title,
    sku: s.sku,
    image_url: image[s.product] || null,
    available: s.available,
    committed: s.committed,
    unavailable: s.unavailable,
    incoming: s.incoming,
  }));

  const tracked = new Set(stock.map((s) => s.variant));
  const first = locations[0];
  products.forEach((p) => {
    (p.variants || []).forEach((v) => {
      if (tracked.has(v.id)) return;
      rows.push({
        id: `variant-${v.id}`,
        itemId: null,
        product: p.id,
        variant: v.id,
        location: first?.id || null,
        locationName: first?.name || "",
        title: p.title,
        sku: v.sku,
        image_url: image[p.id] || null,
        available: 0,
        committed: 0,
        unavailable: 0,
        incoming: 0,
      });
    });
  });

  return rows.sort(
    (a, b) =>
      (a.title || "").localeCompare(b.title || "") || (a.sku || "").localeCompare(b.sku || "")
  );
}

// Closes a popover when you click outside it
function useClickOutside(ref, onClose) {
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, onClose]);
}

// Adjust popup for Available and On hand: change by an amount or set a new total, with a reason
// and an optional note. target: "available" | "onhand"
function AdjustPopover({ item, target, currentValue, onSave, onHistory, onClose }) {
  const [actionType, setActionType] = useState("set"); // "set" | "add"
  const [inputVal, setInputVal] = useState(currentValue);
  const [reason, setReason] = useState("Correction");
  const [note, setNote] = useState("");
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const popoverRef = useRef(null);

  useClickOutside(popoverRef, onClose);

  const handleConfirm = async () => {
    const val = parseInt(inputVal, 10);
    if (isNaN(val) || busy) return;

    let payload;
    if (actionType === "add") {
      if (val === 0) return onClose();
      payload = { delta: val };
    } else {
      // On hand = Available + Committed + Unavailable, so setting On hand sets Available
      const available =
        target === "onhand" ? val - (item.committed || 0) - (item.unavailable || 0) : val;
      if (available < 0) {
        setError("That is less than what is already committed or unavailable.");
        return;
      }
      payload = { available };
    }

    setBusy(true);
    setError("");
    const message = await onSave({ ...payload, reason: ADJUST_REASONS[reason], note: note.trim() });
    setBusy(false);
    if (message) setError(message);
    else onClose();
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
      className="absolute right-0 top-full mt-1.5 z-50 flex items-center gap-2 rounded-xl border border-[#DDD6FE] bg-white p-2 shadow-[0_6px_22px_rgba(0,0,0,0.16)] whitespace-nowrap text-left"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Action + Quantity Compound Control */}
      <div className="flex h-9 items-center rounded-lg border border-[#8C9196] bg-white overflow-hidden shadow-2xs focus-within:border-[#0B1020] focus-within:ring-1 focus-within:ring-[#0B1020]">
        {/* Action dropdown: Set to / Add */}
        <div className="relative border-r border-[#DDD6FE] bg-white">
          <select
            value={actionType}
            onChange={(e) => {
              const next = e.target.value;
              setActionType(next);
              setInputVal(next === "add" ? 0 : currentValue);
            }}
            className="h-9 appearance-none bg-transparent pl-2.5 pr-6 text-xs sm:text-sm font-normal text-[#0B1020] outline-none cursor-pointer"
          >
            <option value="set">Set to</option>
            <option value="add">Add</option>
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#4C4F7A]">
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
          className="h-9 w-14 sm:w-16 px-1.5 text-center text-sm font-medium text-[#0B1020] outline-none bg-white"
        />

        {/* Micro Steppers (▲ / ▼) */}
        <div className="flex h-full flex-col border-l border-[#DDD6FE]">
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Increase quantity"
            className="flex h-4.5 w-4.5 items-center justify-center text-[8px] text-[#4C4F7A] hover:bg-[#F3F0FF] border-b border-[#E4DEFB]"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Decrease quantity"
            className="flex h-4.5 w-4.5 items-center justify-center text-[8px] text-[#4C4F7A] hover:bg-[#F3F0FF]"
          >
            ▼
          </button>
        </div>
      </div>

      {/* 2. Location (the stock record being changed) */}
      <div className="relative">
        <select
          value={item.locationName}
          disabled
          onChange={() => {}}
          className="h-9 appearance-none rounded-lg border border-[#8C9196] bg-white pl-3 pr-7 text-xs sm:text-sm font-normal text-[#0B1020] outline-none shadow-2xs min-w-[130px]"
        >
          <option value={item.locationName}>{item.locationName}</option>
        </select>
      </div>

      {/* 3. Reason for Adjustment Icon Button & Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowReasonDropdown((prev) => !prev)}
          title={`Adjustment reason: ${reason}`}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDD6FE] bg-white text-[#4C4F7A] hover:bg-[#F3F0FF] hover:text-[#0B1020] transition shadow-2xs ${
            showReasonDropdown ? "ring-1 ring-[#0B1020] border-[#0B1020]" : ""
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
          <div className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-lg border border-[#E4DEFB] bg-white py-1 shadow-lg text-xs text-[#0B1020]">
            <div className="px-3 py-1 font-semibold text-[11px] text-[#4C4F7A] border-b border-[#F0F2F5]">
              Reason for adjustment
            </div>
            {Object.keys(ADJUST_REASONS).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setReason(r);
                  setShowReasonDropdown(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-[#F3F0FF] transition ${
                  reason === r ? "font-semibold text-[#005BD3] bg-[#F0F4FA]" : ""
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Optional note */}
      <input
        type="text"
        value={note}
        maxLength={500}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Note (optional)"
        aria-label="Note"
        className="h-9 w-36 rounded-lg border border-[#8C9196] bg-white px-2.5 text-xs sm:text-sm text-[#0B1020] outline-none shadow-2xs focus:border-[#0B1020] focus:ring-1 focus:ring-[#0B1020]"
      />

      {/* 5. Confirm / Save Button */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={busy}
        title="Confirm quantity change"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDD6FE] bg-white text-[#0B1020] hover:bg-[#0B1020] hover:text-white transition shadow-2xs disabled:opacity-50"
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

      {/* 6. History */}
      {item.itemId && (
        <button
          type="button"
          onClick={onHistory}
          className="text-xs font-medium text-[#005BD3] hover:underline"
        >
          View history
        </button>
      )}

      {error && (
        <p className="absolute left-2 top-full mt-1 rounded bg-white px-1 text-xs text-[#D82C0D]">
          {error}
        </p>
      )}
    </div>
  );
}

// Breakdown popup for Unavailable (by reason, with a way to set stock aside or put it back) and
// Committed (by open order). kind: "unavailable" | "committed"
function BreakdownPopover({ item, kind, canManage, onChange, onHistory, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("damaged");
  const [busy, setBusy] = useState(false);
  const popoverRef = useRef(null);

  useClickOutside(popoverRef, onClose);

  const load = useCallback(async () => {
    const res = await apiGet(`/api/v1/inventory/items/${item.itemId}/breakdown/`);
    if (res.ok) setData(res.data);
    else setError(res.error);
  }, [item.itemId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, item.unavailable, item.committed]);

  const move = async (amount, why, release) => {
    if (busy) return;
    setBusy(true);
    setError("");
    const message = await onChange({ quantity: amount, reason: why, release });
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl border border-[#DDD6FE] bg-white p-3 shadow-[0_6px_22px_rgba(0,0,0,0.16)] text-left text-xs text-[#0B1020]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-[11px] text-[#4C4F7A]">
          {kind === "unavailable" ? "Unavailable by reason" : "Committed by order"}
        </span>
        <button
          type="button"
          onClick={onHistory}
          className="text-xs font-medium text-[#005BD3] hover:underline"
        >
          View history
        </button>
      </div>

      {!data && !error && <p className="py-2 text-[#4C4F7A]">Loading…</p>}

      {data && kind === "unavailable" && (
        <ul className="divide-y divide-[#F0F2F5]">
          {data.unavailable.length === 0 && (
            <li className="py-2 text-[#4C4F7A]">Nothing set aside.</li>
          )}
          {data.unavailable.map((row) => (
            <li key={row.reason} className="flex items-center justify-between py-1.5">
              <span>
                {UNAVAILABLE_REASONS[row.reason] || row.reason}: <b>{row.quantity}</b>
              </span>
              {canManage && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => move(row.quantity, row.reason, true)}
                  className="text-[#005BD3] hover:underline disabled:opacity-50"
                >
                  Put back
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {data && kind === "committed" && (
        <ul className="divide-y divide-[#F0F2F5]">
          {data.committed.length === 0 && (
            <li className="py-2 text-[#4C4F7A]">
              {item.committed > 0
                ? "These orders were placed before history was kept."
                : "No open orders."}
            </li>
          )}
          {data.committed.map((row) => (
            <li key={row.order} className="flex items-center justify-between py-1.5">
              <span>{row.order_number || "Order"}</span>
              <b>{row.quantity}</b>
            </li>
          ))}
        </ul>
      )}

      {kind === "unavailable" && canManage && (
        <div className="mt-2 flex items-center gap-2 border-t border-[#F0F2F5] pt-2">
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-label="Quantity to set aside"
            className="h-8 w-14 rounded-lg border border-[#8C9196] bg-white px-1.5 text-center text-sm outline-none focus:border-[#0B1020]"
          />
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-8 flex-1 rounded-lg border border-[#8C9196] bg-white px-2 text-xs outline-none cursor-pointer"
          >
            {Object.entries(UNAVAILABLE_REASONS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() => move(parseInt(quantity, 10) || 0, reason, false)}
            className="h-8 rounded-lg border border-[#DDD6FE] bg-white px-2.5 text-xs font-medium hover:bg-[#0B1020] hover:text-white transition disabled:opacity-50"
          >
            Set aside
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-[#D82C0D]">{error}</p>}
    </div>
  );
}

// Every change to one product's stock at one location: date, change, reason, who, new quantity
function HistoryModal({ item, onClose }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiGet(
      `/api/v1/inventory/items/history/?variant=${item.variant}&location=${item.location}`
    ).then((res) => {
      if (!active) return;
      if (res.ok) setRows(res.data);
      else setError(res.error);
    });
    return () => {
      active = false;
    };
  }, [item.variant, item.location]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
        className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E4DEFB] px-5 py-3">
          <h2 id="history-modal-title" className="text-base font-semibold text-[#0B1020]">
            History · {item.title}
            {item.sku ? ` (${item.sku})` : ""}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-lg text-[#4C4F7A] hover:text-[#0B1020]"
          >
            ×
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {error && <p className="px-5 py-4 text-sm text-[#D82C0D]">{error}</p>}
          {!rows && !error && <p className="px-5 py-4 text-sm text-[#4C4F7A]">Loading…</p>}
          {rows && rows.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-[#4C4F7A]">No changes recorded yet.</p>
          )}
          {rows && rows.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#FAF8FF] text-xs text-[#4C4F7A]">
                <tr>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Change</th>
                  <th className="px-3 py-2 font-medium">Reason</th>
                  <th className="px-3 py-2 font-medium">Who</th>
                  <th className="px-5 py-2 text-right font-medium">New quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DEFB]">
                {rows.map((row) => (
                  <tr key={row.id} title={row.note || undefined}>
                    <td className="px-5 py-2 text-xs text-[#4C4F7A]">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${
                        row.change < 0 ? "text-[#D82C0D]" : "text-[#0B1020]"
                      }`}
                    >
                      {row.change > 0 ? `+${row.change}` : row.change}
                    </td>
                    <td className="px-3 py-2">
                      {row.reason_label}
                      {row.note ? <span className="text-[#4C4F7A]"> · {row.note}</span> : null}
                    </td>
                    <td className="px-3 py-2">{row.who}</td>
                    <td className="px-5 py-2 text-right font-medium">{row.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
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
        className="w-full max-w-lg rounded-2xl border border-[#E4DEFB] bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4DEFB] px-5 py-4">
          <h2 id="import-modal-title" className="text-base font-semibold text-[#0B1020]">
            Import inventory
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4C4F7A] hover:bg-[#F3F0FF] transition"
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
              <p className="text-sm text-[#4C4F7A] mb-3">
                Match columns in <span className="font-medium text-[#0B1020]">{file?.name}</span> to
                inventory fields. Found {sheet.rows.length} rows.
              </p>
              <div className="max-h-[46vh] space-y-2.5 overflow-y-auto pr-1">
                {IMPORT_FIELDS.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-[#0B1020] font-medium">
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
                      className="h-9 w-[55%] rounded-lg border border-[#DDD6FE] bg-white px-3 text-sm text-[#0B1020] outline-none focus:border-[#0B1020]"
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
            <div className="flex items-center gap-3 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 border border-[#DDD6FE]">
                📄
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0B1020]">{file.name}</p>
                <p className="text-xs text-[#4C4F7A]">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#4C4F7A] hover:bg-white hover:text-[#0B1020] transition"
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
                  ? "border-[#0B1020] bg-[#EDE9FE]"
                  : error
                    ? "border-red-300 bg-red-50/20"
                    : "border-[#DDD6FE] bg-[#FAF8FF] hover:border-[#0B1020] hover:bg-white"
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white border border-[#DDD6FE] text-[#0B1020] shadow-2xs mb-2">
                ⬆
              </span>
              <p className="text-sm font-medium text-[#0B1020]">
                <span className="underline underline-offset-2">Click to browse</span> or drag and
                drop
              </p>
              <p className="mt-1 text-xs text-[#4C4F7A]">
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
        <div className="flex justify-end gap-2.5 border-t border-[#E4DEFB] bg-[#FAF8FF] px-5 py-3.5">
          <button
            type="button"
            disabled={importing}
            onClick={sheet ? () => setSheet(null) : onClose}
            className="rounded-lg border border-[#DDD6FE] bg-white px-4 py-2 text-sm font-medium text-[#0B1020] hover:bg-[#F3F0FF] transition"
          >
            {sheet ? "Back" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={sheet ? importing : !file}
            onClick={sheet ? handleImport : handleContinue}
            className="rounded-lg bg-[#0B1020] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1C2347] transition disabled:opacity-50"
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
  const storeId = getSession()?.storeId || "default";

  // One row per stock record, always read from the server (the one inventory table)
  const [items, setItems] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [filterTab, setFilterTab] = useState("all"); // 'all' | 'in_stock' | 'out_of_stock'
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [notice, setNotice] = useState("");

  // The row whose popup is open: { id, kind: "available" | "onhand" | "unavailable" | "committed" }
  const [popover, setPopover] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);

  const pageSize = 50;

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3500);
  };

  // Load (or reload) the stock: after any change, and when you come back to this tab
  const refresh = useCallback(async () => {
    const [stock, products, locations] = await Promise.all([
      apiGet("/api/v1/inventory/items/"),
      apiGet("/api/v1/catalog/products/"),
      apiGet("/api/v1/inventory/locations/"),
    ]);
    if (!stock.ok) {
      setNotice(`Couldn't load stock: ${stock.error}`);
      return;
    }
    setItems(buildRows(listOf(stock), listOf(products), listOf(locations)));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const onFocus = () => document.visibilityState === "visible" && refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh, storeId]);

  // Change Available / On hand through the server; returns an error message, or "" when it worked
  const saveStock = async (item, payload, label) => {
    if (!item.location) return "Add a location first, then adjust this stock.";
    const base = {
      variant: item.variant,
      location: item.location,
      reason: payload.reason,
      note: payload.note,
    };
    const res =
      "available" in payload
        ? await apiPost("/api/v1/inventory/items/set/", { ...base, available: payload.available })
        : await apiPost("/api/v1/inventory/items/adjust/", { ...base, delta: payload.delta });
    if (!res.ok) return errorText(res);
    await refresh();
    flash(`Updated ${label} quantity.`);
    return "";
  };

  // Set stock aside (damaged, ...) or put it back
  const saveUnavailable = async (item, { quantity, reason, release }) => {
    if (!item.location) return "Add a location first, then adjust this stock.";
    const res = await apiPost("/api/v1/inventory/items/unavailable/", {
      variant: item.variant,
      location: item.location,
      quantity,
      reason,
      release,
    });
    if (!res.ok) return errorText(res);
    await refresh();
    flash(release ? "Put the stock back to available." : "Set the stock aside as unavailable.");
    return "";
  };

  // Import a file: products already in the store (same SKU) get their Available set, new ones
  // are created. Both go through the server, so the history records them.
  const handleImportSuccess = async (importedProducts) => {
    setCurrentPage(1);
    const bySku = new Map(items.filter((i) => i.sku).map((i) => [i.sku.toLowerCase(), i]));
    const fresh = [];
    let updated = 0;
    let failed = 0;

    for (const p of importedProducts) {
      const row = bySku.get((p.sku || "").toLowerCase());
      if (!row) {
        fresh.push({ title: p.title, sku: p.sku, quantity: p.available, status: "active" });
        continue;
      }
      const res = row.location
        ? await apiPost("/api/v1/inventory/items/set/", {
            variant: row.variant,
            location: row.location,
            available: Math.max(0, Math.round(p.available)),
            reason: "import",
            note: "Imported from file",
          })
        : { ok: false };
      if (res.ok) updated += 1;
      else failed += 1;
    }

    let created = 0;
    for (let i = 0; i < fresh.length; i += 500) {
      const res = await apiPost("/api/v1/catalog/products/bulk/", {
        products: fresh.slice(i, i + 500),
      });
      if (res.ok) created += res.data?.created || 0;
      else failed += fresh.slice(i, i + 500).length;
    }

    await refresh();
    const parts = [];
    if (created) parts.push(`${created} new product${created === 1 ? "" : "s"}`);
    if (updated) parts.push(`${updated} updated`);
    flash(
      `${parts.length ? `Imported ${parts.join(", ")}.` : "Nothing was imported."}${
        failed ? ` ${failed} could not be imported.` : ""
      }`
    );
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
    <div className="min-h-screen bg-white text-[#0B1020]">
      <AdminHeader />

      {/* BODY LAYOUT */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 bg-[#F5F3FF] px-4 sm:px-8 py-6 max-w-full overflow-x-hidden">
          {/* TITLE & ACTIONS */}
          <div className="mb-4 flex items-center justify-between">
            <h1 className="flex items-center gap-2.5 text-[20px] sm:text-[22px] font-bold text-[#0B1020]">
              <PageIcon name="inventory" />
              Inventory
            </h1>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={items.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-[#DDD6FE] bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-[#0B1020] shadow-2xs hover:bg-[#F3F0FF] disabled:opacity-50 transition cursor-pointer"
              >
                Export
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#DDD6FE] bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-[#0B1020] shadow-2xs hover:bg-[#F3F0FF] transition cursor-pointer"
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
          <section className="rounded-xl border border-[#E4DEFB] bg-white shadow-2xs overflow-visible">
            {/* TOOLBAR */}
            <div className="flex items-center justify-between border-b border-[#E4DEFB] px-3 sm:px-4 py-2.5 bg-white">
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
                    className="h-9 appearance-none rounded-lg border border-[#DDD6FE] bg-white pl-3 pr-7 text-xs sm:text-sm font-medium text-[#0B1020] outline-none hover:bg-[#F3F0FF] cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="in_stock">In stock</option>
                    <option value="out_of_stock">Out of stock</option>
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-col text-[7px] text-[#4C4F7A] leading-[6px]">
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
                    className="h-9 w-full rounded-lg border border-[#DDD6FE] bg-white pl-9 pr-8 text-xs sm:text-sm text-[#0B1020] placeholder:text-slate-400 outline-none focus:border-[#0B1020] focus:ring-1 focus:ring-[#0B1020]"
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
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDD6FE] bg-white text-[#4C4F7A] hover:bg-[#F3F0FF] transition shrink-0 ml-2"
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
              <div className="flex items-center justify-between border-b border-[#E4DEFB] bg-[#F7F9FC] px-5 py-2 text-xs font-medium text-[#0B1020]">
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
              <table className="w-full border-collapse text-left text-sm text-[#0B1020]">
                <thead>
                  <tr className="border-b border-[#E4DEFB] bg-[#FAF8FF] text-xs font-semibold text-[#5C5F62] whitespace-nowrap select-none">
                    <th className="py-3 pl-4 pr-2 w-10">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all products on page"
                        className="h-4 w-4 rounded border-slate-300 accent-[#0B1020] cursor-pointer"
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

                <tbody className="divide-y divide-[#E4DEFB]">
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-sm text-[#4C4F7A]">
                        <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0F2F5] text-[#0B1020]">
                            <PageIcon name="inventory" />
                          </span>
                          <p className="font-semibold text-base text-[#0B1020]">
                            {searchQuery ? "No matching products found" : "No inventory items yet"}
                          </p>
                          <p className="mt-1 text-xs text-[#4C4F7A]">
                            {searchQuery
                              ? `No products match "${searchQuery}".`
                              : "Click Import to upload your product inventory file (CSV or Excel)."}
                          </p>
                          {!searchQuery && (
                            <button
                              type="button"
                              onClick={() => setIsImportModalOpen(true)}
                              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0B1020] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1C2347] transition shadow-xs cursor-pointer"
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
                      const open = popover?.id === item.id ? popover.kind : null;
                      const isEditingThisOnHand = open !== null;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-[#F9FAFB] transition-colors ${
                            isSelected ? "bg-[#F3F0FF]" : "bg-white"
                          } ${isEditingThisOnHand ? "bg-[#FAF8FF]" : ""}`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 pl-4 pr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(item.id)}
                              aria-label={`Select ${item.title}`}
                              className="h-4 w-4 rounded border-slate-300 accent-[#0B1020] cursor-pointer"
                            />
                          </td>

                          {/* Product Thumbnail + Title */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-3">
                              <ProductThumbnail item={item} />
                              <Link
                                to={`/admin/online-store/products/${item.product}`}
                                className="font-medium text-[#0B1020] hover:text-[#005BD3] hover:underline line-clamp-1 leading-snug"
                                title={item.title}
                              >
                                {item.title}
                              </Link>
                            </div>
                          </td>

                          {/* SKU */}
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-xs text-[#4C4F7A] select-all tracking-tight">
                              {item.sku || "—"}
                            </span>
                          </td>

                          {/* Unavailable (opens the breakdown by reason) */}
                          <td className="py-2.5 px-3 text-right relative">
                            <button
                              type="button"
                              disabled={!item.itemId}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPopover(
                                  open === "unavailable"
                                    ? null
                                    : { id: item.id, kind: "unavailable" }
                                );
                              }}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-medium text-[#0B1020] transition hover:bg-[#E4E5E7] disabled:hover:bg-transparent cursor-pointer"
                              title="See why stock is unavailable"
                            >
                              {item.unavailable ?? 0}
                              <span className="text-[10px] text-[#6D7175]">▾</span>
                            </button>
                            {open === "unavailable" && (
                              <BreakdownPopover
                                item={item}
                                kind="unavailable"
                                canManage={canManage}
                                onChange={(change) => saveUnavailable(item, change)}
                                onHistory={() => {
                                  setPopover(null);
                                  setHistoryItem(item);
                                }}
                                onClose={() => setPopover(null)}
                              />
                            )}
                          </td>

                          {/* Committed (opens the open orders behind it) */}
                          <td className="py-2.5 px-3 text-right relative">
                            <button
                              type="button"
                              disabled={!item.itemId}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPopover(
                                  open === "committed" ? null : { id: item.id, kind: "committed" }
                                );
                              }}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-medium text-[#0B1020] transition hover:bg-[#E4E5E7] disabled:hover:bg-transparent cursor-pointer"
                              title="See which orders hold this stock"
                            >
                              {item.committed ?? 0}
                              <span className="text-[10px] text-[#6D7175]">▾</span>
                            </button>
                            {open === "committed" && (
                              <BreakdownPopover
                                item={item}
                                kind="committed"
                                canManage={canManage}
                                onChange={() => Promise.resolve("")}
                                onHistory={() => {
                                  setPopover(null);
                                  setHistoryItem(item);
                                }}
                                onClose={() => setPopover(null)}
                              />
                            )}
                          </td>

                          {/* Available (⇋ opens the adjust popup) */}
                          <td className="py-2.5 px-3 text-right relative">
                            <button
                              type="button"
                              disabled={!canManage}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPopover(
                                  open === "available" ? null : { id: item.id, kind: "available" }
                                );
                              }}
                              className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium text-[#0B1020] transition cursor-pointer select-none hover:bg-[#E4E5E7]"
                              title="Click to adjust quantity"
                            >
                              <span>{item.available ?? 0}</span>
                              <span className="text-[11px] text-[#6D7175]">⇋</span>
                            </button>
                            {open === "available" && (
                              <AdjustPopover
                                item={item}
                                target="available"
                                currentValue={item.available ?? 0}
                                onSave={(payload) => saveStock(item, payload, "available")}
                                onHistory={() => {
                                  setPopover(null);
                                  setHistoryItem(item);
                                }}
                                onClose={() => setPopover(null)}
                              />
                            )}
                          </td>

                          {/* On Hand (⇋ opens the adjust popup) */}
                          <td className="py-2.5 px-3 text-right relative">
                            <button
                              type="button"
                              disabled={!canManage}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPopover(
                                  open === "onhand" ? null : { id: item.id, kind: "onhand" }
                                );
                              }}
                              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium transition cursor-pointer select-none ${
                                open === "onhand"
                                  ? "bg-[#E4E5E7] text-[#0B1020] ring-1 ring-[#8C9196]"
                                  : onHand < 0
                                    ? "text-[#D82C0D] hover:bg-[#E4E5E7]"
                                    : "text-[#0B1020] hover:bg-[#E4E5E7]"
                              }`}
                              title="Click to edit on hand quantity"
                            >
                              <span>{onHand}</span>
                              <span className="text-[11px] text-[#6D7175]">⇋</span>
                            </button>

                            {open === "onhand" && (
                              <AdjustPopover
                                item={item}
                                target="onhand"
                                currentValue={onHand}
                                onSave={(payload) => saveStock(item, payload, "on hand")}
                                onHistory={() => {
                                  setPopover(null);
                                  setHistoryItem(item);
                                }}
                                onClose={() => setPopover(null)}
                              />
                            )}
                          </td>

                          {/* Incoming */}
                          <td className="py-2.5 pl-3 pr-6 text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-[#0B1020]">
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
            <div className="flex items-center justify-between border-t border-[#E4DEFB] bg-[#FAF8FF] px-4 py-3 text-xs sm:text-sm text-[#5C5F62]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  className="flex h-7 w-7 items-center justify-center rounded border border-[#DDD6FE] bg-white text-slate-700 shadow-2xs hover:bg-[#F3F0FF] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ‹
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  className="flex h-7 w-7 items-center justify-center rounded border border-[#DDD6FE] bg-white text-slate-700 shadow-2xs hover:bg-[#F3F0FF] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ›
                </button>
                <span className="ml-1 font-medium text-[#0B1020]">
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
              className="text-xs text-[#5C5F62] hover:text-[#0B1020] hover:underline"
            >
              Learn more about managing inventory
            </a>
          </div>
        </main>
      </div>

      {/* STOCK HISTORY */}
      {historyItem && <HistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />}

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
