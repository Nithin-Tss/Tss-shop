import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { apiGet, apiDelete } from "@/lib/api";
import { useCan } from "@/lib/auth";

export default function AdminCollections() {
  const canManage = useCan("products.manage");
  const canDelete = useCan("products.delete");
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Bulk action toolbar state
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSelectDropdownOpen, setIsSelectDropdownOpen] = useState(false);
  const [showOnlySelectedChoice, setShowOnlySelected] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Sales channels popover dropdown state
  const [openChannelDropdownId, setOpenChannelDropdownId] = useState(null);

  // Refs for click outside
  const channelDropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const selectDropdownRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);

  const navigate = useNavigate();

  // Dismiss feedback helper
  const showFeedback = (message, type = "success") => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback({ message, type });
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 3500);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (channelDropdownRef.current && !channelDropdownRef.current.contains(event.target)) {
        setOpenChannelDropdownId(null);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
      if (selectDropdownRef.current && !selectDropdownRef.current.contains(event.target)) {
        setIsSelectDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await apiGet("/api/v1/catalog/collections/");
    if (res.ok) {
      setCollections(Array.isArray(res.data) ? res.data : []);
    } else {
      setError(res.error || "Failed to load collections.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // loading/error already start as true/null, so the synchronous sets are no-ops here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCollections();
  }, [fetchCollections]);

  // Filter collections by search query
  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) return collections;
    const query = searchQuery.toLowerCase().trim();
    return collections.filter((c) => c.name?.toLowerCase().includes(query));
  }, [collections, searchQuery]);

  // "Show all selected" turns itself off when nothing is selected
  const showOnlySelected = showOnlySelectedChoice && selectedIds.length > 0;

  // Handle "Show all selected" toggle
  const displayedCollections = useMemo(() => {
    if (showOnlySelected) {
      return filteredCollections.filter((c) => selectedIds.includes(c.id));
    }
    return filteredCollections;
  }, [filteredCollections, showOnlySelected, selectedIds]);

  // Paginated list
  const totalPages = Math.ceil(displayedCollections.length / pageSize) || 1;
  const paginatedCollections = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayedCollections.slice(start, start + pageSize);
  }, [displayedCollections, currentPage, pageSize]);

  // Selection logic for master checkbox
  const isAllSelected =
    paginatedCollections.length > 0 &&
    paginatedCollections.every((c) => selectedIds.includes(c.id));

  const isIndeterminate =
    paginatedCollections.some((c) => selectedIds.includes(c.id)) && !isAllSelected;

  const handleMasterCheckboxClick = () => {
    if (selectedIds.length > 0) {
      // If any are selected, deselect all
      setSelectedIds([]);
      setShowOnlySelected(false);
    } else {
      // If none selected, select current page items
      const pageIds = paginatedCollections.map((c) => c.id);
      setSelectedIds(pageIds);
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk action triggers
  const handleBulkAction = (actionName) => {
    if (!selectedIds.length) return;
    if (actionName === "Bulk edit") {
      showFeedback(
        `Opening bulk editor for ${selectedIds.length} collection${selectedIds.length > 1 ? "s" : ""}...`
      );
    } else if (actionName === "Include in sales channels") {
      showFeedback(
        `Included ${selectedIds.length} collection${selectedIds.length > 1 ? "s" : ""} in sales channels.`
      );
    } else if (actionName === "Exclude from sales channels") {
      showFeedback(
        `Excluded ${selectedIds.length} collection${selectedIds.length > 1 ? "s" : ""} from sales channels.`
      );
    }
  };

  // Delete selected handler
  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    const count = selectedIds.length;
    if (
      !window.confirm(`Are you sure you want to delete ${count} collection${count > 1 ? "s" : ""}?`)
    ) {
      return;
    }

    setIsDeleting(true);
    let successCount = 0;
    try {
      for (const id of selectedIds) {
        const res = await apiDelete(`/api/v1/catalog/collections/${id}/`);
        if (res.ok) successCount++;
      }
      setSelectedIds([]);
      setShowOnlySelected(false);
      showFeedback(
        `Successfully deleted ${successCount} collection${successCount > 1 ? "s" : ""}.`
      );
      await fetchCollections();
    } catch {
      showFeedback("Failed to delete selected collections.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Clicking a row opens the collection (not when clicking checkbox, link or channels)
  const openCollection = (event, id) => {
    if (event.target.closest("a, button, input, label, [data-no-row-click]")) return;
    navigate(`/admin/online-store/collections/${id}`);
  };

  const renderChannelIcon = (channel) => {
    const type = (channel?.type || "").toLowerCase();
    const name = (channel?.name || "").toLowerCase();

    if (type === "online" || name.includes("online")) {
      return (
        <svg
          className="w-4 h-4 text-slate-700 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      );
    }
    if (type === "shop" || name.includes("shop")) {
      return (
        <svg
          className="w-4 h-4 text-slate-700 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      );
    }
    if (type === "pos" || name.includes("point of sale") || name.includes("pos")) {
      return (
        <svg
          className="w-4 h-4 text-slate-700 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      );
    }
    return (
      <svg
        className="w-4 h-4 text-slate-700 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    );
  };

  // Shared styles
  const cell = "px-4 align-middle";
  const headCell = "px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] whitespace-nowrap";
  const darkButton =
    "inline-flex items-center justify-center rounded-lg bg-[#161C2C] px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#262E42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/30 focus-visible:ring-offset-2";
  const pageButton =
    "inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#4B5563] transition-colors hover:bg-[#F9FAFB] disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="min-h-screen bg-white font-sans text-[#161C2C]">
      <AdminHeader />

      {/* Feedback Toast */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-[#161C2C] px-4 py-3 text-[13px] font-medium text-white shadow-xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
        >
          {feedback.type === "error" ? (
            <svg
              className="h-4 w-4 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-2 text-slate-400 hover:text-white"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. BODY LAYOUT (Includes AdminSidebar + Main Collections Content) */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1 overflow-x-hidden bg-[#F7F8FA] px-4 py-6 sm:px-6">
          {/* Top Heading Row */}
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-[18px] text-[#6B7280]" aria-hidden="true">
                ⊞
              </span>
              <h1 className="text-[20px] font-semibold tracking-tight text-[#161C2C]">
                Collections
              </h1>
            </div>

            {canManage && (
              <Link to="/admin/online-store/collections/new" className={darkButton}>
                Add collection
              </Link>
            )}
          </div>

          {/* MAIN CARD CONTAINER */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-xs">
            {/* Filter / Search Bar */}
            <div className="flex flex-col items-stretch justify-between gap-2 border-b border-[#E5E7EB] p-4 sm:flex-row sm:items-center">
              {/* Left: Tab with up/down arrows */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg bg-[#F3F4F6] px-3 py-1.5 text-[13px] font-medium text-[#161C2C] transition-colors hover:bg-[#E5E7EB]"
                >
                  <span>All</span>
                  <svg
                    className="h-3.5 w-3.5 text-[#6B7280]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </button>
              </div>

              {/* Right: Search and filter input + view button */}
              <div className="ml-auto flex w-full flex-1 items-center gap-2 sm:max-w-md">
                <div className="relative flex flex-1 items-center">
                  <svg
                    className="pointer-events-none absolute left-3 h-4 w-4 text-[#9CA3AF]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5"
                    />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search and filter"
                    aria-label="Search collections"
                    className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-8 text-[14px] text-[#161C2C] outline-none transition placeholder:text-[#9CA3AF] hover:border-[#D1D5DB] focus:border-[#161C2C] focus:ring-2 focus:ring-[#161C2C]/15"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      className="absolute right-2 flex h-5 w-5 items-center justify-center rounded text-[12px] text-[#9CA3AF] hover:text-[#4B5563]"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  title="View columns and filters"
                  aria-label="View columns and filters"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#161C2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/15"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M9 4.5v15m6-15v15m-10.5 0h15a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5h-15A1.5 1.5 0 003 6v12a1.5 1.5 0 001.5 1.5z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* TABLE: scrolls sideways on small screens */}
            <div className="min-h-[360px] overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-[14px]">
                <thead>
                  {selectedIds.length > 0 ? (
                    /* BULK ACTIONS TOOLBAR ROW */
                    <tr className="border-b border-[#E5E7EB] bg-white">
                      {/* Checkbox column */}
                      <th className="w-12 px-4 py-2.5 text-center align-middle">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={handleMasterCheckboxClick}
                            className="group flex h-4 w-4 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/30"
                            aria-label="Deselect all collections"
                          >
                            {isIndeterminate ? (
                              <span className="flex h-4 w-4 items-center justify-center rounded bg-[#161C2C] text-white shadow-xs">
                                <span className="h-0.5 w-2 rounded-full bg-white" />
                              </span>
                            ) : isAllSelected ? (
                              <span className="flex h-4 w-4 items-center justify-center rounded bg-[#161C2C] text-white shadow-xs">
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </span>
                            ) : (
                              <span className="h-4 w-4 rounded border border-[#C9CCCF] bg-white transition-colors group-hover:border-[#8C9196]" />
                            )}
                          </button>
                        </div>
                      </th>

                      {/* Bulk actions spanning the remaining columns */}
                      <th colSpan={4} className="px-2 py-2 font-normal">
                        <div className="flex items-center justify-between gap-3">
                          {/* Left: action buttons */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Count with dropdown */}
                            <div className="relative inline-block" ref={selectDropdownRef}>
                              <button
                                type="button"
                                onClick={() => setIsSelectDropdownOpen((prev) => !prev)}
                                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-[#202223] transition-colors hover:bg-[#F3F4F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/20"
                                aria-expanded={isSelectDropdownOpen}
                              >
                                <span>{selectedIds.length} selected</span>
                                <svg
                                  className={`h-3.5 w-3.5 text-[#5C5F62] transition-transform duration-150 ${
                                    isSelectDropdownOpen ? "rotate-180" : ""
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="m6 9 6 6 6-6"
                                  />
                                </svg>
                              </button>

                              {isSelectDropdownOpen && (
                                <div className="absolute left-0 top-full z-50 mt-1 min-w-[210px] rounded-xl border border-[#E5E7EB] bg-white p-1 text-left shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const pageIds = paginatedCollections.map((c) => c.id);
                                      setSelectedIds((prev) =>
                                        Array.from(new Set([...prev, ...pageIds]))
                                      );
                                      setIsSelectDropdownOpen(false);
                                    }}
                                    className="flex w-full items-center rounded-lg px-3 py-2 text-[13px] text-[#202223] transition-colors hover:bg-[#F6F6F7]"
                                  >
                                    Select page ({paginatedCollections.length})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedIds(filteredCollections.map((c) => c.id));
                                      setIsSelectDropdownOpen(false);
                                    }}
                                    className="flex w-full items-center rounded-lg px-3 py-2 text-[13px] text-[#202223] transition-colors hover:bg-[#F6F6F7]"
                                  >
                                    Select all ({filteredCollections.length})
                                  </button>
                                  <div className="my-1 border-t border-[#F0F1F3]" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedIds([]);
                                      setShowOnlySelected(false);
                                      setIsSelectDropdownOpen(false);
                                    }}
                                    className="flex w-full items-center rounded-lg px-3 py-2 text-[13px] font-medium text-[#D82C0D] transition-colors hover:bg-[#FFF4F2]"
                                  >
                                    Deselect all
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Bulk edit button */}
                            <button
                              type="button"
                              onClick={() => handleBulkAction("Bulk edit")}
                              className="inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#202223] shadow-xs transition-colors hover:bg-[#F6F6F7] active:bg-[#ECEEF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/20"
                            >
                              Bulk edit
                            </button>

                            {/* Include in sales channels button */}
                            <button
                              type="button"
                              onClick={() => handleBulkAction("Include in sales channels")}
                              className="inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#202223] shadow-xs transition-colors hover:bg-[#F6F6F7] active:bg-[#ECEEF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/20"
                            >
                              Include in sales channels
                            </button>

                            {/* Exclude from sales channels button */}
                            <button
                              type="button"
                              onClick={() => handleBulkAction("Exclude from sales channels")}
                              className="inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#202223] shadow-xs transition-colors hover:bg-[#F6F6F7] active:bg-[#ECEEF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/20"
                            >
                              Exclude from sales channels
                            </button>

                            {/* Three-dot menu button & popover */}
                            <div className="relative inline-block" ref={moreMenuRef}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsMoreMenuOpen((prev) => !prev);
                                }}
                                className={`inline-flex h-[32px] w-[34px] items-center justify-center rounded-lg border border-[#D1D5DB] bg-white text-[#202223] shadow-xs transition-colors hover:bg-[#F6F6F7] active:bg-[#ECEEF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/20 ${
                                  isMoreMenuOpen ? "bg-[#F3F4F6] border-[#9CA3AF]" : ""
                                }`}
                                aria-label="More bulk actions"
                                aria-expanded={isMoreMenuOpen}
                              >
                                <svg
                                  className="h-4 w-4 text-[#5C5F62]"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <circle cx="5" cy="12" r="2" />
                                  <circle cx="12" cy="12" r="2" />
                                  <circle cx="19" cy="12" r="2" />
                                </svg>
                              </button>

                              {/* Popover Dropdown */}
                              {isMoreMenuOpen && (
                                <div
                                  className="absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 min-w-[170px] rounded-xl border border-[#E5E7EB] bg-white p-1 text-left shadow-[0_4px_20px_rgba(0,0,0,0.12)] animate-in fade-in zoom-in-95 duration-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    disabled={isDeleting || !canDelete}
                                    onClick={() => {
                                      setIsMoreMenuOpen(false);
                                      handleDeleteSelected();
                                    }}
                                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[#D82C0D] transition-colors hover:bg-[#FFF4F2] disabled:opacity-50"
                                  >
                                    <span>{isDeleting ? "Deleting..." : "Delete collections"}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Show all selected toggle switch */}
                          <div className="flex items-center gap-2 pr-2">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={showOnlySelected}
                              onClick={() => setShowOnlySelected((prev) => !prev)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/20 ${
                                showOnlySelected ? "bg-[#161C2C]" : "bg-[#D1D5DB]"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  showOnlySelected ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                            <span
                              onClick={() => setShowOnlySelected((prev) => !prev)}
                              className="cursor-pointer select-none text-[13px] font-medium text-[#374151]"
                            >
                              Show all selected
                            </span>
                          </div>
                        </div>
                      </th>
                    </tr>
                  ) : (
                    /* REGULAR COLUMN HEADERS */
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                      <th className="w-12 px-4 py-2.5 text-center align-middle">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={handleMasterCheckboxClick}
                            disabled={loading || paginatedCollections.length === 0}
                            className="group flex h-4 w-4 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/30 disabled:opacity-40"
                            aria-label="Select all collections"
                          >
                            <span className="h-4 w-4 rounded border border-[#C9CCCF] bg-white transition-colors group-hover:border-[#8C9196]" />
                          </button>
                        </div>
                      </th>
                      <th className={headCell}>Title</th>
                      <th className={headCell}>Products</th>
                      <th className={headCell}>Conditions</th>
                      <th className={`${headCell} text-right`}>Sales channels</th>
                    </tr>
                  )}
                </thead>

                <tbody className="divide-y divide-[#F0F1F3]">
                  {/* LOADING SKELETON */}
                  {loading && (
                    <>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="h-14 animate-pulse">
                          <td className={`${cell} text-center`}>
                            <div className="mx-auto h-4 w-4 rounded bg-[#EEF0F2]" />
                          </td>
                          <td className={cell}>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-[#EEF0F2]" />
                              <div className="h-3.5 w-40 rounded bg-[#EEF0F2]" />
                            </div>
                          </td>
                          <td className={cell}>
                            <div className="h-3.5 w-10 rounded bg-[#EEF0F2]" />
                          </td>
                          <td className={cell}>
                            <div className="h-3.5 w-48 rounded bg-[#EEF0F2]" />
                          </td>
                          <td className={`${cell} text-right`}>
                            <div className="ml-auto h-3.5 w-8 rounded bg-[#EEF0F2]" />
                          </td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* EMPTY STATE */}
                  {!loading && displayedCollections.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center">
                        <div className="mx-auto flex max-w-md flex-col items-center">
                          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[22px] text-[#9CA3AF]">
                            ⊞
                          </div>
                          <h3 className="mb-1 text-[16px] font-semibold text-[#161C2C]">
                            {error
                              ? "Couldn't load collections"
                              : showOnlySelected
                                ? "No selected collections"
                                : searchQuery
                                  ? "No matching collections"
                                  : "Manage your collections"}
                          </h3>
                          <p className="mb-6 text-[14px] leading-relaxed text-[#6B7280]">
                            {error
                              ? error
                              : showOnlySelected
                                ? "You currently have no collections selected."
                                : searchQuery
                                  ? `No collections matched "${searchQuery}". Try changing your search query.`
                                  : "Group your products into categories to make it easier for customers to find what they're looking for."}
                          </p>
                          {showOnlySelected ? (
                            <button
                              type="button"
                              onClick={() => setShowOnlySelected(false)}
                              className={darkButton}
                            >
                              Show all collections
                            </button>
                          ) : searchQuery ? (
                            <button
                              type="button"
                              onClick={() => setSearchQuery("")}
                              className={darkButton}
                            >
                              Clear search
                            </button>
                          ) : canManage ? (
                            <Link to="/admin/online-store/collections/new" className={darkButton}>
                              Create collection
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* DYNAMIC DATA ROWS */}
                  {!loading &&
                    paginatedCollections.map((col) => {
                      const isSelected = selectedIds.includes(col.id);
                      return (
                        <tr
                          key={col.id}
                          onClick={(e) => openCollection(e, col.id)}
                          className={`h-14 cursor-pointer transition-colors hover:bg-[#F9FAFB] ${
                            isSelected ? "bg-[#F9FAFB]" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className={`${cell} w-12 text-center`}>
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleRow(col.id);
                                }}
                                className="group flex h-4 w-4 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/30"
                                aria-label={`Select ${col.name}`}
                              >
                                {isSelected ? (
                                  <span className="flex h-4 w-4 items-center justify-center rounded bg-[#161C2C] text-white shadow-xs">
                                    <svg
                                      className="h-3 w-3"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  </span>
                                ) : (
                                  <span className="h-4 w-4 rounded border border-[#C9CCCF] bg-white transition-colors group-hover:border-[#8C9196]" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Title with collection image */}
                          <td className={cell}>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#9CA3AF]">
                                {col.image_url ? (
                                  <img
                                    src={col.image_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="1.6"
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                )}
                              </div>
                              <Link
                                to={`/admin/online-store/collections/${col.id}`}
                                className="truncate font-medium text-[#161C2C] hover:underline"
                              >
                                {col.name}
                              </Link>
                              {col.status === "draft" && (
                                <span className="shrink-0 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[12px] text-[#4B5563]">
                                  Draft
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Products count */}
                          <td className={`${cell} tabular-nums text-[#374151]`}>
                            {typeof col.products_count === "number"
                              ? col.products_count.toLocaleString()
                              : 0}
                          </td>

                          {/* Conditions */}
                          <td className={`${cell} max-w-xs truncate text-[#6B7280]`}>
                            {col.type === "automated" && col.rules?.length
                              ? col.rules
                                  .map(
                                    (r) =>
                                      `${r.field.replace(/_/g, " ")} ${r.operator.replace(/_/g, " ")} ${r.value}`
                                  )
                                  .join(col.match === "any" ? " or " : " and ")
                              : "—"}
                          </td>

                          {/* Sales channels */}
                          <td className={`${cell} relative text-right`} data-no-row-click>
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenChannelDropdownId((prev) =>
                                    prev === col.id ? null : col.id
                                  );
                                }}
                                aria-expanded={openChannelDropdownId === col.id}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 tabular-nums text-[#374151] transition-colors hover:bg-[#F3F4F6] hover:text-[#161C2C]"
                                title="View sales channels"
                              >
                                <span>
                                  {col.sales_channels_count ??
                                    (col.sales_channels ? col.sales_channels.length : 0)}
                                </span>
                                <svg
                                  className={`h-3.5 w-3.5 text-[#9CA3AF] transition-transform duration-150 ${
                                    openChannelDropdownId === col.id ? "rotate-180" : ""
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="m6 9 6 6 6-6"
                                  />
                                </svg>
                              </button>

                              {/* Dropdown Popover */}
                              {openChannelDropdownId === col.id && (
                                <div
                                  ref={channelDropdownRef}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`absolute right-0 z-40 min-w-[210px] rounded-lg border border-[#E5E7EB] bg-white p-1 text-left shadow-lg ${
                                    paginatedCollections.indexOf(col) >=
                                      paginatedCollections.length - 2 &&
                                    paginatedCollections.length > 2
                                      ? "bottom-full mb-2"
                                      : "top-full mt-2"
                                  }`}
                                >
                                  {col.sales_channels && col.sales_channels.length > 0 ? (
                                    col.sales_channels.map((channel, idx) => (
                                      <div
                                        key={channel.id || idx}
                                        className="flex items-center gap-2 rounded-md px-3 py-2 text-[14px] text-[#161C2C] hover:bg-[#F9FAFB]"
                                      >
                                        {renderChannelIcon(channel)}
                                        <span className="whitespace-nowrap">{channel.name}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="px-3 py-2 text-[12px] text-[#6B7280]">
                                      No sales channels assigned
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* TABLE PAGINATION FOOTER */}
            <div className="flex items-center justify-between gap-4 rounded-b-xl border-t border-[#E5E7EB] px-4 py-3 text-[12px] text-[#6B7280]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  aria-label="Previous page"
                  className={pageButton}
                >
                  ‹
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  aria-label="Next page"
                  className={pageButton}
                >
                  ›
                </button>
                <span className="min-w-[48px] text-center tabular-nums text-[13px] text-[#374151]">
                  {displayedCollections.length === 0
                    ? "0-0"
                    : `${(currentPage - 1) * pageSize + 1}-${Math.min(
                        currentPage * pageSize,
                        displayedCollections.length
                      )}`}
                </span>
              </div>

              <span className="tabular-nums">Total {displayedCollections.length} collections</span>
            </div>
          </div>

          {/* Bottom Footer Info Link */}
          <div className="pb-6 pt-6 text-center">
            <a
              href="#learn-more"
              className="text-[12px] text-[#6B7280] underline underline-offset-2 transition-colors hover:text-[#161C2C]"
            >
              Learn more about collections
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
