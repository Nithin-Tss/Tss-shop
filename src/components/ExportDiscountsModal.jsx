import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Escapes values for safe CSV formatting.
 * Encapsulates values in double quotes, escapes internal quotes, and
 * protects against formula injection (=, +, -, @) in spreadsheet software.
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export default function ExportDiscountsModal({
  isOpen,
  onClose,
  discounts = [],
  paginatedDiscounts = [],
  filteredDiscounts = [],
  selectedIds = new Set(),
  searchQuery = "",
}) {
  const selectedCount = selectedIds.size;
  const isSearchActive = Boolean(searchQuery && searchQuery.trim().length > 0);
  const searchMatchCount = filteredDiscounts.length;

  const [chosenScope, setChosenScope] = useState(null);
  const [exportFormat, setExportFormat] = useState("excel");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  const handleClose = useCallback(() => {
    setChosenScope(null);
    setExportError("");
    setIsExporting(false);
    onClose();
  }, [onClose]);

  // Default scope: "selected" if rows are checked, otherwise "current_page"
  const defaultScope = selectedCount > 0 ? "selected" : "current_page";
  const preferredScope = chosenScope || defaultScope;

  // Fall back to "current_page" when chosen scope is not available
  const exportScope =
    (preferredScope === "selected" && selectedCount === 0) ||
    (preferredScope === "search" && (!isSearchActive || searchMatchCount === 0))
      ? "current_page"
      : preferredScope;

  // Handle escape key, focus trapping, and body scroll locking
  useEffect(() => {
    if (!isOpen) return undefined;
    previousActiveElement.current = document.activeElement;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (!isExporting) handleClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => {
      const firstActive = modalRef.current?.querySelector("button, input");
      firstActive?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === "function"
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, isExporting, handleClose]);

  if (!isOpen) return null;

  const handleExecuteExport = () => {
    if (isExporting) return;
    setExportError("");

    let itemsToExport = [];
    if (exportScope === "current_page") {
      itemsToExport = paginatedDiscounts.length > 0 ? paginatedDiscounts : filteredDiscounts;
    } else if (exportScope === "all") {
      itemsToExport = discounts;
    } else if (exportScope === "selected") {
      itemsToExport = discounts.filter((d) => selectedIds.has(d.id));
    } else if (exportScope === "search") {
      itemsToExport = filteredDiscounts;
    }

    if (itemsToExport.length === 0) {
      setExportError("No discounts available to export for the selected option.");
      return;
    }

    setIsExporting(true);

    try {
      const headers = [
        "Title",
        "Code",
        "Status",
        "Method",
        "Type",
        "Value",
        "Customer Eligibility",
        "Minimum Requirement",
        "Maximum Discount",
        "Usage Limit",
        "Per Customer Limit",
        "Times Used",
        "Starts At",
        "Ends At",
        "Created At",
      ];

      const now = new Date();

      const rows = itemsToExport.map((d) => {
        const codeDisplay = Array.isArray(d.codes) && d.codes.length > 0 ? d.codes.join(", ") : "";
        const title = d.name || codeDisplay || "Untitled discount";

        const isExpired = d.ends_at && new Date(d.ends_at) < now;
        const isScheduled = d.starts_at && new Date(d.starts_at) > now;
        let status = "Active";
        if (d.is_active === false) status = "Draft";
        else if (isExpired) status = "Expired";
        else if (isScheduled) status = "Scheduled";

        const method = Array.isArray(d.codes) && d.codes.length > 0 ? "Code" : "Automatic";

        let typeLabel = "Amount off products";
        if (d.discount_type === "percentage") typeLabel = "Percentage";
        else if (d.discount_type === "fixed_amount") typeLabel = "Fixed amount";
        else if (d.discount_type) typeLabel = d.discount_type.replace(/_/g, " ");

        let valueDisplay = "";
        if (d.discount_type === "percentage") {
          valueDisplay = `${d.value}%`;
        } else if (d.value !== undefined && d.value !== null) {
          valueDisplay = `$${parseFloat(d.value || 0).toFixed(2)}`;
        }

        const minRequirement = d.minimum_order_amount
          ? `$${parseFloat(d.minimum_order_amount).toFixed(2)}`
          : "None";

        const maxDiscount = d.maximum_discount_amount
          ? `$${parseFloat(d.maximum_discount_amount).toFixed(2)}`
          : "None";

        const usageLimit = d.usage_limit ? String(d.usage_limit) : "No limit";
        const perCustomerLimit = d.per_customer_limit ? String(d.per_customer_limit) : "No limit";
        const timesUsed = d.times_used ?? 0;
        const startsAt = d.starts_at
          ? new Date(d.starts_at).toISOString().slice(0, 19).replace("T", " ")
          : "";
        const endsAt = d.ends_at
          ? new Date(d.ends_at).toISOString().slice(0, 19).replace("T", " ")
          : "No end date";
        const createdAt = d.created_at
          ? new Date(d.created_at).toISOString().slice(0, 19).replace("T", " ")
          : "";

        return [
          escapeCsv(title),
          escapeCsv(codeDisplay),
          escapeCsv(status),
          escapeCsv(method),
          escapeCsv(typeLabel),
          escapeCsv(valueDisplay),
          escapeCsv("All customers"),
          escapeCsv(minRequirement),
          escapeCsv(maxDiscount),
          escapeCsv(usageLimit),
          escapeCsv(perCustomerLimit),
          timesUsed,
          escapeCsv(startsAt),
          escapeCsv(endsAt),
          escapeCsv(createdAt),
        ].join(",");
      });

      let csvContent = [headers.join(","), ...rows].join("\r\n");

      // Add UTF-8 BOM for Excel / Numbers so spreadsheet programs read characters properly
      if (exportFormat === "excel") {
        csvContent = "\uFEFF" + csvContent;
      }

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `discounts_${exportScope}_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      handleClose();
    } catch (err) {
      setExportError(err.message || "Failed to generate CSV export.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!isExporting) handleClose();
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="w-full max-w-[540px] rounded-2xl bg-white shadow-2xl border border-slate-200 transition-all animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-discounts-title"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="export-discounts-title" className="text-[17px] font-semibold text-ink">
            Export discounts
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isExporting}
            aria-label="Close modal"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="px-6 py-5 space-y-6">
          {/* Error Banner */}
          {exportError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {exportError}
            </div>
          )}

          {/* SECTION 1: EXPORT SCOPE */}
          <div>
            <h3 className="text-sm font-semibold text-ink mb-3.5">Export</h3>
            <div className="space-y-3">
              {/* Option 1: Current page */}
              <label
                onClick={() => setChosenScope("current_page")}
                className="flex items-center gap-3 cursor-pointer group select-none"
              >
                {exportScope === "current_page" ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-white">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                  </span>
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 bg-white transition-colors group-hover:border-slate-400" />
                )}
                <span className="text-sm text-ink">Current page</span>
              </label>

              {/* Option 2: All discounts */}
              <label
                onClick={() => setChosenScope("all")}
                className="flex items-center gap-3 cursor-pointer group select-none"
              >
                {exportScope === "all" ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-white">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                  </span>
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 bg-white transition-colors group-hover:border-slate-400" />
                )}
                <span className="text-sm text-ink">All discounts</span>
              </label>

              {/* Option 3: Selected discounts */}
              {selectedCount > 0 ? (
                <label
                  onClick={() => setChosenScope("selected")}
                  className="flex items-center gap-3 cursor-pointer group select-none"
                >
                  {exportScope === "selected" ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-white">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                    </span>
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 bg-white transition-colors group-hover:border-slate-400" />
                  )}
                  <span className="text-sm text-ink">
                    Selected: {selectedCount} discount{selectedCount === 1 ? "" : "s"}
                  </span>
                </label>
              ) : (
                <div className="flex items-center gap-3 cursor-not-allowed select-none">
                  <span className="h-5 w-5 shrink-0 rounded-full bg-slate-200" />
                  <span className="text-sm text-slate-400">Selected: 0 discounts</span>
                </div>
              )}

              {/* Option 4: Matching current search/filter */}
              {isSearchActive && searchMatchCount > 0 ? (
                <label
                  onClick={() => setChosenScope("search")}
                  className="flex items-center gap-3 cursor-pointer group select-none"
                >
                  {exportScope === "search" ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-white">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                    </span>
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 bg-white transition-colors group-hover:border-slate-400" />
                  )}
                  <span className="text-sm text-ink">
                    {searchMatchCount} discount{searchMatchCount === 1 ? "" : "s"} matching your
                    search
                  </span>
                </label>
              ) : (
                <div className="flex items-center gap-3 cursor-not-allowed select-none">
                  <span className="h-5 w-5 shrink-0 rounded-full bg-slate-200" />
                  <span className="text-sm text-slate-400">
                    {isSearchActive
                      ? "0 discounts matching your search"
                      : "1 discount matching your search"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: EXPORT FORMAT */}
          <div>
            <h3 className="text-sm font-semibold text-ink mb-3.5">Export as</h3>
            <div className="space-y-3">
              {/* Excel / Numbers CSV */}
              <label
                onClick={() => setExportFormat("excel")}
                className="flex items-center gap-3 cursor-pointer group select-none"
              >
                {exportFormat === "excel" ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-white">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                  </span>
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 bg-white transition-colors group-hover:border-slate-400" />
                )}
                <span className="text-sm text-ink">
                  CSV for Excel, Numbers, or other spreadsheet programs
                </span>
              </label>

              {/* Plain CSV */}
              <label
                onClick={() => setExportFormat("plain")}
                className="flex items-center gap-3 cursor-pointer group select-none"
              >
                {exportFormat === "plain" ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-white">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                  </span>
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 bg-white transition-colors group-hover:border-slate-400" />
                )}
                <span className="text-sm text-ink">Plain CSV file</span>
              </label>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 bg-white rounded-b-2xl">
          <button
            type="button"
            onClick={handleClose}
            disabled={isExporting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-ink shadow-xs hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteExport}
            disabled={isExporting || (exportScope === "all" && discounts.length === 0)}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-black active:bg-slate-950 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-900/40"
          >
            {isExporting ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V3m0 0L8 7m4-4l4 4"
                  />
                </svg>
                <span>Export discounts</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
