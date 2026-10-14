import { useState, useEffect } from "react";

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

export default function ExportDraftOrdersModal({
  isOpen,
  onClose,
  drafts = [],
  paginatedDrafts = [],
  filteredDrafts = [],
  selectedIds = new Set(),
  searchQuery = "",
}) {
  const [exportScope, setExportScope] = useState("current_page");
  const [exportFormat, setExportFormat] = useState("excel");

  // Date range state for "Draft orders by date"
  const todayStr = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(todayStr);

  const selectedCount = selectedIds.size;
  const isSearchActive = Boolean(searchQuery && searchQuery.trim().length > 0);
  const searchMatchCount = filteredDrafts.length;

  // Auto-switch away from disabled options if state changes
  useEffect(() => {
    if (exportScope === "selected" && selectedCount === 0) {
      setExportScope("current_page");
    }
    if (exportScope === "search" && !isSearchActive) {
      setExportScope("current_page");
    }
  }, [selectedCount, isSearchActive, exportScope]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExecuteExport = () => {
    let itemsToExport = [];
    if (exportScope === "current_page") {
      itemsToExport = paginatedDrafts.length > 0 ? paginatedDrafts : filteredDrafts;
    } else if (exportScope === "all") {
      itemsToExport = drafts;
    } else if (exportScope === "selected") {
      itemsToExport = drafts.filter((d) => selectedIds.has(d.id));
    } else if (exportScope === "search") {
      itemsToExport = filteredDrafts;
    } else if (exportScope === "by_date") {
      const start = startDate ? new Date(startDate + "T00:00:00") : null;
      const end = endDate ? new Date(endDate + "T23:59:59.999") : null;
      itemsToExport = drafts.filter((d) => {
        if (!d.created_at) return false;
        const dDate = new Date(d.created_at);
        if (isNaN(dDate.getTime())) return false;
        if (start && dDate < start) return false;
        if (end && dDate > end) return false;
        return true;
      });
    }

    const headers = [
      "Draft Order",
      "PO Number",
      "Date",
      "Customer",
      "Status",
      "Total",
      "Currency",
      "Items Count",
      "Items Summary",
    ];

    const rows = itemsToExport.map((d) => {
      const itemCount = (d.details || []).reduce(
        (acc, item) => acc + (item.quantity || 1),
        0
      );
      const itemsSummary = (d.details || [])
        .map(
          (item) =>
            `${item.quantity || 1}x ${item.title || "Item"} ($${parseFloat(
              item.unit_price || 0
            ).toFixed(2)})`
        )
        .join("; ");

      return [
        escapeCsv(d.draft_number || (d.id ? `#D${d.id.slice(0, 4)}` : "—")),
        escapeCsv(d.po_number || ""),
        escapeCsv(d.created_at || ""),
        escapeCsv(d.customer_name || "—"),
        escapeCsv(d.status || "open"),
        escapeCsv(parseFloat(d.total || 0).toFixed(2)),
        escapeCsv(d.currency_code || "AUD"),
        itemCount,
        escapeCsv(itemsSummary),
      ].join(",");
    });

    let csvContent = [headers.join(","), ...rows].join("\r\n");

    // Add UTF-8 BOM for Excel / Numbers so spreadsheet programs read UTF-8 properly
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
    link.download = `draft_orders_${exportScope}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] rounded-2xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-[#E1E3E5] px-6 py-4">
          <h2
            id="export-modal-title"
            className="text-[17px] font-semibold text-[#202223]"
          >
            Export draft orders
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-[#5C5F62] hover:bg-[#F1F2F3] hover:text-[#202223] transition-colors focus:outline-none"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
          {/* SECTION 1: EXPORT */}
          <div>
            <h3 className="text-sm font-semibold text-[#202223] mb-3.5">Export</h3>
            <div className="space-y-3">
              {/* Option 1: Current page */}
              <label
                onClick={() => setExportScope("current_page")}
                className="flex items-center gap-3 cursor-pointer group select-none"
              >
                {exportScope === "current_page" ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#202223] bg-white">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#202223]" />
                  </span>
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-[#C9CCCF] bg-white transition-colors group-hover:border-[#8C9196]" />
                )}
                <span className="text-sm text-[#202223]">Current page</span>
              </label>

              {/* Option 2: All draft orders */}
              <label
                onClick={() => setExportScope("all")}
                className="flex items-center gap-3 cursor-pointer group select-none"
              >
                {exportScope === "all" ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#202223] bg-white">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#202223]" />
                  </span>
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-[#C9CCCF] bg-white transition-colors group-hover:border-[#8C9196]" />
                )}
                <span className="text-sm text-[#202223]">All draft orders</span>
              </label>

              {/* Option 3: Selected draft orders */}
              {selectedCount > 0 ? (
                <label
                  onClick={() => setExportScope("selected")}
                  className="flex items-center gap-3 cursor-pointer group select-none"
                >
                  {exportScope === "selected" ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#202223] bg-white">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#202223]" />
                    </span>
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-[#C9CCCF] bg-white transition-colors group-hover:border-[#8C9196]" />
                  )}
                  <span className="text-sm text-[#202223]">
                    Selected: {selectedCount} draft order{selectedCount > 1 ? "s" : ""}
                  </span>
                </label>
              ) : (
                <div className="flex items-center gap-3 cursor-not-allowed select-none">
                  <span className="h-5 w-5 shrink-0 rounded-full bg-[#E5E7EB]" />
                  <span className="text-sm text-[#8C9196]">
                    Selected: 0 draft orders
                  </span>
                </div>
              )}

              {/* Option 4: Matching current search */}
              {isSearchActive ? (
                <label
                  onClick={() => setExportScope("search")}
                  className="flex items-center gap-3 cursor-pointer group select-none"
                >
                  {exportScope === "search" ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#202223] bg-white">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#202223]" />
                    </span>
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-[#C9CCCF] bg-white transition-colors group-hover:border-[#8C9196]" />
                  )}
                  <span className="text-sm text-[#202223]">
                    {searchMatchCount} draft order
                    {searchMatchCount === 1 ? "" : "s"} matching your search
                  </span>
                </label>
              ) : (
                <div className="flex items-center gap-3 cursor-not-allowed select-none">
                  <span className="h-5 w-5 shrink-0 rounded-full bg-[#E5E7EB]" />
                  <span className="text-sm text-[#8C9196]">
                    1 draft order matching your search
                  </span>
                </div>
              )}

              {/* Option 5: Draft orders by date */}
              <div>
                <label
                  onClick={() => setExportScope("by_date")}
                  className="flex items-center gap-3 cursor-pointer group select-none"
                >
                  {exportScope === "by_date" ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#202223] bg-white">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#202223]" />
                    </span>
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-[#C9CCCF] bg-white transition-colors group-hover:border-[#8C9196]" />
                  )}
                  <span className="text-sm text-[#202223]">
                    Draft orders by date
                  </span>
                </label>

                {/* Date range pickers */}
                {exportScope === "by_date" && (
                  <div className="ml-8 mt-3 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in duration-100">
                    <div className="w-full sm:w-1/2">
                      <label className="block text-xs font-medium text-[#5C5F62] mb-1">
                        From
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 text-sm text-[#202223] shadow-xs focus:border-[#202223] focus:outline-none focus:ring-1 focus:ring-[#202223]"
                      />
                    </div>
                    <div className="w-full sm:w-1/2">
                      <label className="block text-xs font-medium text-[#5C5F62] mb-1">
                        To
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 text-sm text-[#202223] shadow-xs focus:border-[#202223] focus:outline-none focus:ring-1 focus:ring-[#202223]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: EXPORT AS */}
          <div>
            <h3 className="text-sm font-semibold text-[#202223] mb-3.5">
              Export as
            </h3>
            <div className="space-y-3">
              {/* Excel / Numbers CSV */}
              <label
                onClick={() => setExportFormat("excel")}
                className="flex items-center gap-3 cursor-pointer group select-none"
              >
                {exportFormat === "excel" ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#202223] bg-white">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#202223]" />
                  </span>
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-[#C9CCCF] bg-white transition-colors group-hover:border-[#8C9196]" />
                )}
                <span className="text-sm text-[#202223]">
                  CSV for Excel, Numbers, or other spreadsheet programs
                </span>
              </label>

              {/* Plain CSV */}
              <label
                onClick={() => setExportFormat("plain")}
                className="flex items-center gap-3 cursor-pointer group select-none"
              >
                {exportFormat === "plain" ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#202223] bg-white">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#202223]" />
                  </span>
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-[#C9CCCF] bg-white transition-colors group-hover:border-[#8C9196]" />
                )}
                <span className="text-sm text-[#202223]">Plain CSV file</span>
              </label>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-end gap-3 border-t border-[#E1E3E5] px-6 py-4 bg-white rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#202223] shadow-xs hover:bg-[#F6F6F7] transition-colors focus:outline-none focus:ring-2 focus:ring-[#202223]/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteExport}
            className="flex items-center gap-2 rounded-lg bg-[#202223] px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[#303336] active:bg-[#161C2C] transition-colors focus:outline-none focus:ring-2 focus:ring-[#202223]/40"
          >
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
            <span>Export draft orders</span>
          </button>
        </div>
      </div>
    </div>
  );
}
