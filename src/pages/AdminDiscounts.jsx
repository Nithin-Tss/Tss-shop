"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  Search,
  X,
  SlidersHorizontal,
  PlusCircle,
  Eye,
  EyeOff,
  GripVertical,
  Users,
  Rocket,
  Tag,
  Ticket,
  TrendingUp,
  ShoppingBag,
  Truck,
  RotateCw,
  ChevronsUpDown,
  ArrowUpDown,
  Check,
} from "lucide-react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";
import SelectDiscountTypeModal from "@/components/SelectDiscountTypeModal";
import ExportDiscountsModal from "@/components/ExportDiscountsModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import { apiDelete, apiGet, apiPatch } from "@/lib/api";
import { useCan } from "@/lib/auth";

const STATUS_FILTER_LABELS = {
  all: "All",
  active: "Active",
  scheduled: "Scheduled",
  expired: "Expired",
};

const DEFAULT_COLUMNS = [
  { id: "status", label: "Status", width: "105px" },
  { id: "method", label: "Method", width: "85px" },
  { id: "eligibility", label: "Eligibility", width: "115px" },
  { id: "rollouts", label: "Rollouts", width: "70px" },
  { id: "type", label: "Type", width: "140px" },
  { id: "combinations", label: "Combinations", width: "100px" },
  { id: "used", label: "Used", width: "50px" },
  { id: "created", label: "Created", width: "100px" },
  { id: "start_date", label: "Start date", width: "100px" },
  { id: "end_date", label: "End date", width: "100px" },
  { id: "updated", label: "Updated", width: "100px" },
];

const INITIAL_VISIBLE_COLUMNS = {
  status: true,
  method: true,
  eligibility: true,
  rollouts: true,
  type: true,
  combinations: true,
  used: true,
  created: false,
  start_date: false,
  end_date: false,
  updated: false,
};

const SORT_KEYS = [
  { id: "title", label: "Title" },
  { id: "used", label: "Used" },
  { id: "created", label: "Created" },
  { id: "start_date", label: "Start date" },
  { id: "end_date", label: "End date" },
  { id: "updated", label: "Updated" },
];

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function getSortDirectionOptions(key) {
  if (key === "title") {
    return [
      { id: "asc", label: "A–Z" },
      { id: "desc", label: "Z–A" },
    ];
  }
  if (key === "used") {
    return [
      { id: "asc", label: "Lowest first" },
      { id: "desc", label: "Highest first" },
    ];
  }
  return [
    { id: "asc", label: "Oldest first" },
    { id: "desc", label: "Newest first" },
  ];
}

function getDiscountStatus(discount) {
  const now = new Date();
  const startsAt = discount.starts_at ? new Date(discount.starts_at) : null;
  const endsAt = discount.ends_at ? new Date(discount.ends_at) : null;

  if (discount.is_active === false) {
    return "expired";
  }
  if (endsAt && endsAt < now) {
    return "expired";
  }
  if (startsAt && startsAt > now) {
    return "scheduled";
  }
  return "active";
}

function StatusCell({ status }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelowViewport = window.innerHeight - rect.bottom;
      const scrollParent = containerRef.current.closest(".overflow-x-auto");
      let spaceBelowParent = 999;
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        spaceBelowParent = parentRect.bottom - rect.bottom;
      }
      setOpenUpward(spaceBelowViewport < 160 || spaceBelowParent < 110);
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div className={`relative inline-block text-left ${isOpen ? "z-40" : ""}`} ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-1.5 cursor-pointer group select-none text-left whitespace-nowrap"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="View sales channels"
      >
        {status === "active" && (
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-ink shadow-2xs group-hover:bg-slate-200 transition-colors">
            Active
          </span>
        )}
        {status === "scheduled" && (
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 shadow-2xs group-hover:bg-slate-200 transition-colors">
            Scheduled
          </span>
        )}
        {status === "expired" && (
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 shadow-2xs group-hover:bg-slate-200 transition-colors">
            Expired
          </span>
        )}
        <ChevronDown
          className={`h-3 w-3 text-slate-700 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 w-60 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xl shadow-slate-900/10 z-50 animate-in fade-in zoom-in-95 pointer-events-auto ${
            openUpward ? "bottom-full mb-2" : "top-full mt-2"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[13px] font-medium text-slate-600 mb-2.5">Sales channels</div>
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                status === "expired" ? "bg-slate-400" : "bg-ink"
              }`}
            />
            <span className="text-sm font-normal text-ink">Online Store</span>
          </div>
        </div>
      )}
    </div>
  );
}

function renderColumnCell(colId, discount, status, isCode) {
  switch (colId) {
    case "status":
      return <StatusCell status={status} discount={discount} />;
    case "method":
      return <div className="text-slate-600 truncate">{isCode ? "Code" : "Automatic"}</div>;
    case "eligibility":
      return (
        <div className="flex items-center gap-1.5 text-slate-600">
          <Users className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="truncate">All customers</span>
        </div>
      );
    case "rollouts":
      return (
        <div className="text-slate-500 flex items-center">
          <Rocket className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        </div>
      );
    case "type":
      return (
        <div className="flex items-center gap-1.5 text-slate-600">
          <Tag className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span className="truncate capitalize">
            {discount.discount_type?.replace(/_/g, " ") || "Amount off products"}
          </span>
        </div>
      );
    case "combinations":
      return (
        <div className="flex items-center gap-1.5 text-slate-400">
          <Tag
            className="h-3.5 w-3.5 hover:text-slate-600 transition shrink-0"
            strokeWidth={1.75}
            aria-label="Price Tag"
          />
          <ShoppingBag
            className="h-3.5 w-3.5 hover:text-slate-600 transition shrink-0"
            strokeWidth={1.75}
            aria-label="Shopping Bag"
          />
          <Truck
            className="h-3.5 w-3.5 hover:text-slate-600 transition shrink-0"
            strokeWidth={1.75}
            aria-label="Delivery Truck"
          />
        </div>
      );
    case "used":
      return <div className="text-slate-600 truncate">{discount.times_used ?? 0}</div>;
    case "created":
      return (
        <div className="text-slate-600 text-xs truncate">{formatDate(discount.created_at)}</div>
      );
    case "start_date":
      return (
        <div className="text-slate-600 text-xs truncate">{formatDate(discount.starts_at)}</div>
      );
    case "end_date":
      return <div className="text-slate-600 text-xs truncate">{formatDate(discount.ends_at)}</div>;
    case "updated":
      return (
        <div className="text-slate-600 text-xs truncate">{formatDate(discount.updated_at)}</div>
      );
    default:
      return null;
  }
}

export default function DiscountsPage() {
  const canManage = useCan("discounts.manage");
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [discounts, setDiscounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSelectionMenuOpen, setIsSelectionMenuOpen] = useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [tagModalMode, setTagModalMode] = useState(null); // 'add' | 'remove' | null
  const [tagInput, setTagInput] = useState("");
  const [toastMessage, setToastMessage] = useState(null);
  const [columnList, setColumnList] = useState(DEFAULT_COLUMNS);
  const [visibleColumns, setVisibleColumns] = useState(INITIAL_VISIBLE_COLUMNS);
  const [sortKey, setSortKey] = useState("created");
  const [sortDirection, setSortDirection] = useState("desc");
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const [savedView, setSavedView] = useState({
    visibleColumns: INITIAL_VISIBLE_COLUMNS,
    columnList: DEFAULT_COLUMNS,
    sortKey: "created",
    sortDirection: "desc",
  });
  const pageSize = 50;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filterMenuRef = useRef(null);
  const selectionMenuRef = useRef(null);
  const moreActionsRef = useRef(null);
  const columnMenuRef = useRef(null);
  const sortMenuRef = useRef(null);
  const saveMenuRef = useRef(null);

  // Check if current view differs from saved view
  const isViewModified = useMemo(() => {
    const keys = Object.keys(visibleColumns);
    const hasColDiff = keys.some((k) => visibleColumns[k] !== savedView.visibleColumns[k]);
    if (hasColDiff) return true;

    const hasOrderDiff = columnList.some((col, i) => col.id !== savedView.columnList[i]?.id);
    if (hasOrderDiff) return true;

    if (sortKey !== savedView.sortKey || sortDirection !== savedView.sortDirection) {
      return true;
    }

    return false;
  }, [visibleColumns, columnList, sortKey, sortDirection, savedView]);

  const handleResetView = () => {
    setVisibleColumns(savedView.visibleColumns);
    setColumnList(savedView.columnList);
    setSortKey(savedView.sortKey);
    setSortDirection(savedView.sortDirection);
    showToast("View reset to default");
  };

  const handleUpdateView = () => {
    setSavedView({
      visibleColumns: { ...visibleColumns },
      columnList: [...columnList],
      sortKey,
      sortDirection,
    });
    setIsSaveMenuOpen(false);
    showToast("View updated");
  };

  const handleSaveAsNewView = () => {
    setSavedView({
      visibleColumns: { ...visibleColumns },
      columnList: [...columnList],
      sortKey,
      sortDirection,
    });
    setIsSaveMenuOpen(false);
    showToast("View saved as new view");
  };

  // Keyboard shortcuts: Ctrl+S to update view, Ctrl+Shift+S to save as new view
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (e.shiftKey) {
          handleSaveAsNewView();
        } else {
          handleUpdateView();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleColumns, columnList, sortKey, sortDirection]);

  useEffect(() => {
    let active = true;
    const fetchDiscounts = async () => {
      setLoading(true);
      const res = await apiGet("/api/v1/discounts/");
      if (active && res.ok && Array.isArray(res.data?.results || res.data)) {
        setDiscounts(res.data?.results || res.data);
      }
      if (active) setLoading(false);
    };
    fetchDiscounts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
      if (selectionMenuRef.current && !selectionMenuRef.current.contains(e.target)) {
        setIsSelectionMenuOpen(false);
      }
      if (moreActionsRef.current && !moreActionsRef.current.contains(e.target)) {
        setIsMoreActionsOpen(false);
      }
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target)) {
        setIsColumnMenuOpen(false);
        setIsSortMenuOpen(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
        setIsSortMenuOpen(false);
      }
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target)) {
        setIsSaveMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredDiscounts = discounts.filter((d) => {
    const status = getDiscountStatus(d);
    if (statusFilter !== "all" && status !== statusFilter) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const codes = Array.isArray(d.codes) ? d.codes.join(" ") : "";
    return (
      (d.name && d.name.toLowerCase().includes(q)) ||
      codes.toLowerCase().includes(q) ||
      (d.discount_type && d.discount_type.toLowerCase().includes(q))
    );
  });

  const sortedDiscounts = [...filteredDiscounts].sort((a, b) => {
    let valA, valB;
    switch (sortKey) {
      case "title": {
        const codeA = (Array.isArray(a.codes) && a.codes[0]) || a.name || "";
        const codeB = (Array.isArray(b.codes) && b.codes[0]) || b.name || "";
        return sortDirection === "asc" ? codeA.localeCompare(codeB) : codeB.localeCompare(codeA);
      }
      case "used": {
        valA = a.times_used ?? 0;
        valB = b.times_used ?? 0;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      case "start_date": {
        valA = a.starts_at ? new Date(a.starts_at).getTime() : 0;
        valB = b.starts_at ? new Date(b.starts_at).getTime() : 0;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      case "end_date": {
        valA = a.ends_at ? new Date(a.ends_at).getTime() : 0;
        valB = b.ends_at ? new Date(b.ends_at).getTime() : 0;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      case "updated": {
        valA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        valB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      case "created":
      default: {
        valA = a.created_at ? new Date(a.created_at).getTime() : 0;
        valB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
    }
  });

  const effectiveShowOnlySelected = showOnlySelected && selectedIds.size > 0;
  const displayedDiscounts = effectiveShowOnlySelected
    ? sortedDiscounts.filter((d) => selectedIds.has(d.id))
    : sortedDiscounts;

  const toggleColumn = (colId) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [colId]: !prev[colId],
    }));
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(fromIndex) || fromIndex === index) return;
    setColumnList((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
  };

  const activeColumns = columnList.filter((col) => visibleColumns[col.id]);
  const gridStyle = {
    gridTemplateColumns: [
      "36px",
      "minmax(180px, 2fr)",
      ...activeColumns.map((col) => {
        const w = parseInt(col.width || "100", 10);
        return `minmax(${Math.min(w, 80)}px, 1fr)`;
      }),
    ].join(" "),
    width: "100%",
  };

  const totalPages = Math.max(1, Math.ceil(displayedDiscounts.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedDiscounts = displayedDiscounts.slice(pageStart, pageStart + pageSize);

  const isAllPageSelected =
    paginatedDiscounts.length > 0 && paginatedDiscounts.every((d) => selectedIds.has(d.id));
  const isSomePageSelected =
    paginatedDiscounts.some((d) => selectedIds.has(d.id)) && !isAllPageSelected;

  const handleToggleAll = () => {
    const next = new Set(selectedIds);
    if (isAllPageSelected) {
      paginatedDiscounts.forEach((d) => next.delete(d.id));
    } else {
      paginatedDiscounts.forEach((d) => next.add(d.id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelect = (id, e) => {
    e?.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleFilterSelect = (filterId) => {
    setStatusFilter(filterId);
    setIsFilterOpen(false);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleBulkActivate = async () => {
    if (selectedIds.size === 0 || isBulkLoading) return;
    setIsBulkLoading(true);
    try {
      const idsToUpdate = Array.from(selectedIds);
      const results = await Promise.all(
        idsToUpdate.map(async (id) => {
          const res = await apiPatch(`/api/v1/discounts/${id}/`, { is_active: true });
          return { id, ok: res.ok };
        })
      );
      const successfulIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
      if (successfulIds.size > 0) {
        setDiscounts((prev) =>
          prev.map((d) => (successfulIds.has(d.id) ? { ...d, is_active: true } : d))
        );
      }
    } catch (err) {
      console.error("Failed to activate discounts:", err);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.size === 0 || isBulkLoading) return;
    setIsBulkLoading(true);
    try {
      const idsToUpdate = Array.from(selectedIds);
      const results = await Promise.all(
        idsToUpdate.map(async (id) => {
          const res = await apiPatch(`/api/v1/discounts/${id}/`, { is_active: false });
          return { id, ok: res.ok };
        })
      );
      const successfulIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
      if (successfulIds.size > 0) {
        setDiscounts((prev) =>
          prev.map((d) => (successfulIds.has(d.id) ? { ...d, is_active: false } : d))
        );
      }
    } catch (err) {
      console.error("Failed to deactivate discounts:", err);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.size === 0 || isBulkLoading) return;
    setIsBulkLoading(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      const results = await Promise.all(
        idsToDelete.map(async (id) => {
          const res = await apiDelete(`/api/v1/discounts/${id}/`);
          return { id, ok: res.ok };
        })
      );
      const successfulIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
      if (successfulIds.size > 0) {
        setDiscounts((prev) => prev.filter((d) => !successfulIds.has(d.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          successfulIds.forEach((id) => next.delete(id));
          return next;
        });
      }
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error("Failed to delete discounts:", err);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleTagModalSubmit = (e) => {
    e.preventDefault();
    const count = selectedIds.size;
    const s = count > 1 ? "discounts" : "discount";
    if (tagModalMode === "add") {
      showToast(`Tags added to ${count} ${s}.`);
    } else {
      showToast(`Tags removed from ${count} ${s}.`);
    }
    setTagModalMode(null);
    setTagInput("");
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />

        <main className="min-w-0 flex-1">
          {/* HEADER */}
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-4 py-5 sm:px-6">
            <div className="flex items-center gap-2.5 text-ink">
              <PageIcon name="discounts" />

              <h1 className="text-xl font-semibold text-ink">Discounts</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-ink hover:bg-[rgba(24,24,27,0.12)] transition cursor-pointer"
              >
                <Download className="h-4 w-4 text-ink" />
                <span>Export</span>
              </button>
              {canManage && (
                <button
                  type="button"
                  id="create-discount-button"
                  onClick={() => setIsTypeModalOpen(true)}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-black transition cursor-pointer"
                >
                  Create discount
                </button>
              )}
            </div>
          </header>

          {/* CONTENT */}
          <div className="p-5">
            <section className="rounded-2xl border border-slate-200 bg-white min-h-[420px]">
              {/* SEARCH / FILTER BAR */}
              <div className="flex h-14 items-center border-b border-slate-200 rounded-t-2xl">
                <div className="relative h-full" ref={filterMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="flex h-full items-center gap-2 px-5 text-sm font-medium text-ink hover:bg-slate-50 transition cursor-pointer"
                    aria-expanded={isFilterOpen}
                    aria-haspopup="true"
                  >
                    <span>{STATUS_FILTER_LABELS[statusFilter] || "All"}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isFilterOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isFilterOpen && (
                    <div className="absolute left-0 top-full mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-40">
                      {[
                        { id: "all", label: "All" },
                        { id: "active", label: "Active" },
                        { id: "scheduled", label: "Scheduled" },
                        { id: "expired", label: "Expired" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleFilterSelect(opt.id)}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left transition cursor-pointer ${
                            statusFilter === opt.id
                              ? "bg-slate-50 font-medium text-ink"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="w-4 flex items-center justify-center text-ink font-bold">
                            {statusFilter === opt.id ? <Check className="h-4 w-4" /> : null}
                          </span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-1 items-center gap-2.5 px-4">
                  <Search
                    className="h-4 w-4 text-slate-400 shrink-0 select-none"
                    aria-hidden="true"
                  />

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search and filter"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500 text-slate-900"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition cursor-pointer shrink-0"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div
                  className="relative h-full flex items-center pr-3 pl-2 border-l border-slate-200 gap-1.5"
                  ref={columnMenuRef}
                >
                  {/* COLUMN CUSTOMIZATION BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsColumnMenuOpen(!isColumnMenuOpen);
                      setIsSortMenuOpen(false);
                      setIsSaveMenuOpen(false);
                    }}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
                      isColumnMenuOpen
                        ? "bg-slate-100 text-ink border border-slate-300"
                        : "text-slate-700 hover:bg-slate-100 hover:text-ink"
                    }`}
                    aria-label="Customize columns and sort"
                    aria-expanded={isColumnMenuOpen}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>

                  {/* RESET & SAVE BUTTONS (Appear when view has been modified) */}
                  {isViewModified && (
                    <>
                      {/* Reset view button */}
                      <button
                        type="button"
                        onClick={handleResetView}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 hover:text-ink transition cursor-pointer"
                        title="Reset view"
                        aria-label="Reset view"
                      >
                        <RotateCw className="h-4 w-4 text-slate-700" strokeWidth={2} />
                      </button>

                      {/* Save view button & popover */}
                      <div className="relative" ref={saveMenuRef}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSaveMenuOpen(!isSaveMenuOpen);
                            setIsColumnMenuOpen(false);
                            setIsSortMenuOpen(false);
                          }}
                          className={`flex h-8 items-center gap-1.5 px-3 rounded-full text-sm font-medium transition cursor-pointer select-none ${
                            isSaveMenuOpen
                              ? "bg-white text-slate-900 border-2 border-blue-600 shadow-xs"
                              : "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400"
                          }`}
                          aria-label="Save view"
                          aria-expanded={isSaveMenuOpen}
                        >
                          <span>Save</span>
                          <ChevronsUpDown className="h-3 w-3 text-slate-700 shrink-0" />
                        </button>

                        {/* SAVE VIEW DROPDOWN (Matching Screenshot 3) */}
                        {isSaveMenuOpen && (
                          <div
                            className="absolute right-0 top-full mt-2 w-[310px] sm:w-[320px] rounded-2xl border border-slate-200/90 bg-white py-2 px-1.5 shadow-2xl shadow-slate-900/10 z-50 animate-in fade-in duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={handleUpdateView}
                              className="flex w-full items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer group text-slate-800"
                            >
                              <div className="flex items-center gap-3">
                                <RotateCw
                                  className="h-4 w-4 text-slate-700 shrink-0"
                                  strokeWidth={2}
                                />
                                <span className="text-sm font-normal text-slate-900 whitespace-nowrap">
                                  Update view
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="rounded-md bg-slate-100 border border-slate-200/90 px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-2xs">
                                  CTRL
                                </span>
                                <span className="rounded-md bg-slate-100 border border-slate-200/90 px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-2xs">
                                  S
                                </span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={handleSaveAsNewView}
                              className="flex w-full items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer group text-slate-800"
                            >
                              <div className="flex items-center gap-3">
                                <PlusCircle className="h-4 w-4 text-slate-700 shrink-0" />
                                <span className="text-sm font-normal text-slate-900 whitespace-nowrap">
                                  Save as new view
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="rounded-md bg-slate-100 border border-slate-200/90 px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-2xs">
                                  CTRL
                                </span>
                                <span className="rounded-md bg-slate-100 border border-slate-200/90 px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-2xs">
                                  ↑
                                </span>
                                <span className="rounded-md bg-slate-100 border border-slate-200/90 px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-2xs">
                                  S
                                </span>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* COLUMN CUSTOMIZATION & SORT POPOVER */}
                  {isColumnMenuOpen && (
                    <div
                      className="absolute right-3 top-full mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* HEADER ROW: Sort by & [ SortKey ↕ ] */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 relative">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                          <ArrowUpDown className="h-4 w-4 text-slate-700" strokeWidth={2} />
                          <span>Sort by</span>
                        </div>

                        {/* SORT KEY TRIGGER BUTTON */}
                        <div className="relative" ref={sortMenuRef}>
                          <button
                            type="button"
                            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                              isSortMenuOpen
                                ? "border-blue-600 text-slate-900 ring-2 ring-blue-500/20 bg-white"
                                : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <span>
                              {SORT_KEYS.find((k) => k.id === sortKey)?.label || "Created"}
                            </span>
                            <ChevronsUpDown className="h-3 w-3 text-slate-500" />
                          </button>

                          {/* NESTED SORT FLYOUT */}
                          {isSortMenuOpen && (
                            <div
                              className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl z-60"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Sort Key Options */}
                              {SORT_KEYS.map((k) => {
                                const isSelected = sortKey === k.id;
                                return (
                                  <button
                                    key={k.id}
                                    type="button"
                                    onClick={() => setSortKey(k.id)}
                                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left transition cursor-pointer hover:bg-slate-50 ${
                                      isSelected
                                        ? "font-semibold text-slate-900"
                                        : "font-normal text-slate-700"
                                    }`}
                                  >
                                    <span className="w-3.5 flex items-center justify-center text-xs font-bold text-ink">
                                      {isSelected ? <Check className="h-3 w-3" /> : null}
                                    </span>
                                    <span>{k.label}</span>
                                  </button>
                                );
                              })}

                              <div className="my-1.5 border-t border-slate-100" />

                              {/* Sort Direction Options */}
                              {getSortDirectionOptions(sortKey).map((dir) => {
                                const isSelected = sortDirection === dir.id;
                                return (
                                  <button
                                    key={dir.id}
                                    type="button"
                                    onClick={() => setSortDirection(dir.id)}
                                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left transition cursor-pointer hover:bg-slate-50 ${
                                      isSelected
                                        ? "font-semibold text-slate-900"
                                        : "font-normal text-slate-700"
                                    }`}
                                  >
                                    <span className="w-3.5 flex items-center justify-center text-xs font-bold text-ink">
                                      {isSelected ? <Check className="h-3 w-3" /> : null}
                                    </span>
                                    <span>{dir.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* COLUMNS SECTION */}
                      <div className="pt-2">
                        <div className="px-1 pb-1.5 text-xs font-semibold text-slate-700">
                          Columns
                        </div>
                        <div className="space-y-0.5">
                          {columnList.map((col, index) => {
                            const isVisible = visibleColumns[col.id];
                            return (
                              <div
                                key={col.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, index)}
                                onClick={() => toggleColumn(col.id)}
                                className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition select-none cursor-pointer hover:bg-slate-50 ${
                                  isVisible ? "text-slate-800" : "text-slate-400"
                                }`}
                              >
                                {/* Left: Drag dots + Label */}
                                <div className="flex items-center gap-2">
                                  <GripVertical className="h-3.5 w-3 text-slate-400 cursor-grab shrink-0" />
                                  <span
                                    className={`font-medium ${
                                      isVisible ? "text-slate-800" : "text-slate-400"
                                    }`}
                                  >
                                    {col.label}
                                  </span>
                                </div>

                                {/* Right: Eye Icon */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleColumn(col.id);
                                  }}
                                  className="p-0.5 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                                  aria-label={`Toggle ${col.label} column`}
                                >
                                  {isVisible ? (
                                    <Eye className="h-4 w-4 text-slate-700" />
                                  ) : (
                                    <EyeOff className="h-4 w-4 text-slate-400" />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full">
                {/* BULK ACTION TOOLBAR */}
                {selectedIds.size > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-brand-cream-100 px-4 py-2.5 text-sm relative z-20">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <div>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-ink focus:ring-ink cursor-pointer"
                          checked={isAllPageSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomePageSelected;
                          }}
                          onChange={handleToggleAll}
                          aria-label="Select all discounts on this page"
                        />
                      </div>

                      {/* Selected Count Dropdown */}
                      <div className="relative" ref={selectionMenuRef}>
                        <button
                          type="button"
                          onClick={() => setIsSelectionMenuOpen(!isSelectionMenuOpen)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 cursor-pointer"
                        >
                          <span>
                            {effectiveShowOnlySelected ? "Showing " : ""}
                            {selectedIds.size} selected
                          </span>
                          <ChevronDown className="h-3 w-3 text-slate-500" />
                        </button>

                        {isSelectionMenuOpen && (
                          <div className="absolute left-0 top-full mt-1 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-30">
                            {selectedIds.size < filteredDiscounts.length && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIds(new Set(filteredDiscounts.map((d) => d.id)));
                                  setIsSelectionMenuOpen(false);
                                }}
                                className="flex w-full items-center px-3 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                Select all {filteredDiscounts.length} discounts
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedIds(new Set());
                                setIsSelectionMenuOpen(false);
                              }}
                              className="flex w-full items-center px-3 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              Deselect all
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Activate Discounts Button */}
                      <button
                        type="button"
                        disabled={isBulkLoading}
                        onClick={handleBulkActivate}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                      >
                        Activate discounts
                      </button>

                      {/* Deactivate Discounts Button */}
                      <button
                        type="button"
                        disabled={isBulkLoading}
                        onClick={handleBulkDeactivate}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                      >
                        Deactivate discounts
                      </button>

                      {/* More Actions Menu */}
                      <div className="relative" ref={moreActionsRef}>
                        <button
                          type="button"
                          onClick={() => setIsMoreActionsOpen(!isMoreActionsOpen)}
                          className="flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 cursor-pointer"
                          aria-label="More actions"
                        >
                          •••
                        </button>

                        {isMoreActionsOpen && (
                          <div className="absolute left-0 top-full mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl z-50">
                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                setTagInput("");
                                setTagModalMode("add");
                              }}
                              className="flex w-full items-center px-4 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              Add tags
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                setTagInput("");
                                setTagModalMode("remove");
                              }}
                              className="flex w-full items-center px-4 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              Remove tags
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                showToast(
                                  `Sales channel access allowed for ${selectedIds.size} discount${selectedIds.size > 1 ? "s" : ""}.`
                                );
                              }}
                              className="flex w-full items-center px-4 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              Allow sales channel access
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                showToast(
                                  `Sales channel access denied for ${selectedIds.size} discount${selectedIds.size > 1 ? "s" : ""}.`
                                );
                              }}
                              className="flex w-full items-center px-4 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              Deny sales channel access
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            <button
                              type="button"
                              onClick={() => {
                                setIsMoreActionsOpen(false);
                                setIsDeleteModalOpen(true);
                              }}
                              className="flex w-full items-center px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 transition cursor-pointer"
                            >
                              Delete discounts
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Show All Selected Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={effectiveShowOnlySelected}
                      onClick={() => setShowOnlySelected(!effectiveShowOnlySelected)}
                      className="flex items-center gap-2 cursor-pointer select-none group"
                    >
                      <span
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          effectiveShowOnlySelected
                            ? "bg-ink"
                            : "bg-slate-300 group-hover:bg-slate-400"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            effectiveShowOnlySelected ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </span>
                      <span className="text-xs font-medium text-slate-700 group-hover:text-ink transition-colors">
                        Show all selected
                      </span>
                    </button>
                  </div>
                )}

                {/* SCROLLABLE TABLE AREA */}
                <div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {selectedIds.size === 0 && (
                    <div
                      className="grid items-center border-b border-slate-200 bg-brand-cream-100 px-4 py-3 text-sm font-medium text-slate-700"
                      style={gridStyle}
                    >
                      <div>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-ink focus:ring-ink cursor-pointer"
                          checked={isAllPageSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomePageSelected;
                          }}
                          onChange={handleToggleAll}
                          aria-label="Select all discounts on this page"
                        />
                      </div>

                      <div>Title</div>
                      {activeColumns.map((col) => (
                        <div key={col.id} className="truncate">
                          {col.label}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TABLE BODY */}
                  {paginatedDiscounts.length > 0 ? (
                    <div className="divide-y divide-slate-100 w-full">
                      {paginatedDiscounts.map((discount) => {
                        const codeDisplay =
                          Array.isArray(discount.codes) && discount.codes.length > 0
                            ? discount.codes.join(", ")
                            : discount.name || "Untitled discount";
                        const isCode = Array.isArray(discount.codes) && discount.codes.length > 0;
                        const status = getDiscountStatus(discount);
                        const isSelected = selectedIds.has(discount.id);

                        let subtitle = "";
                        if (discount.discount_type === "percentage" && discount.value) {
                          subtitle = `${discount.value}% off entire order`;
                        } else if (discount.discount_type === "fixed_amount" && discount.value) {
                          subtitle = `₹${discount.value} off entire order`;
                        } else if (discount.name && discount.name !== codeDisplay) {
                          subtitle = discount.name;
                        }

                        return (
                          <div
                            key={discount.id}
                            className={`grid items-center px-4 py-3 text-sm transition ${
                              isSelected
                                ? "bg-amber-50/60 hover:bg-amber-50"
                                : "text-slate-800 hover:bg-slate-50"
                            }`}
                            style={gridStyle}
                          >
                            <div>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-ink focus:ring-ink cursor-pointer"
                                checked={isSelected}
                                onChange={(e) => handleToggleSelect(discount.id, e)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Select discount ${codeDisplay}`}
                              />
                            </div>
                            <div className="min-w-0 pr-2">
                              <div className="font-medium text-ink truncate">{codeDisplay}</div>
                              {subtitle && (
                                <div className="text-xs text-slate-500 truncate">{subtitle}</div>
                              )}
                            </div>
                            {activeColumns.map((col) => (
                              <div key={col.id} className="min-w-0">
                                {renderColumnCell(col.id, discount, status, isCode)}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* EMPTY STRUCTURE */
                    <div className="min-h-[120px] flex items-center justify-center text-sm text-slate-400">
                      {loading ? "Loading discounts..." : "No discounts found"}
                    </div>
                  )}
                </div>
              </div>

              {/* PAGINATION CONTROLS */}
              {displayedDiscounts.length > pageSize && (
                <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 bg-white text-xs text-slate-600">
                  <span>
                    {pageStart + 1}–{Math.min(pageStart + pageSize, displayedDiscounts.length)} of{" "}
                    {displayedDiscounts.length} discounts
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-ink hover:bg-slate-50 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-ink hover:bg-slate-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* LEARN MORE HOVER POPUP */}
            <div className="pt-8 pb-10 text-center">
              <div
                className="relative inline-block text-left"
                onMouseEnter={() => setIsLearnMoreOpen(true)}
                onMouseLeave={() => setIsLearnMoreOpen(false)}
              >
                <button
                  type="button"
                  className="text-sm font-medium text-ink hover:underline cursor-pointer"
                  onClick={() => setIsLearnMoreOpen((prev) => !prev)}
                  aria-expanded={isLearnMoreOpen}
                  aria-haspopup="true"
                >
                  Learn more about discounts
                </button>

                {isLearnMoreOpen && (
                  <div
                    role="tooltip"
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 w-[360px] sm:w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xl shadow-slate-900/10 z-50 transition-all duration-150 animate-in fade-in zoom-in-95 pointer-events-auto"
                  >
                    <div className="space-y-3">
                      {/* 1. Create discounts */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
                          <Tag className="h-4 w-4" />
                        </div>
                        <div className="text-xs leading-relaxed text-slate-600">
                          <span className="font-semibold text-slate-900">Create discounts:</span>{" "}
                          Offer percentage or fixed-amount discounts to attract customers.
                        </div>
                      </div>

                      {/* 2. Discount codes */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 mt-0.5">
                          <Ticket className="h-4 w-4" />
                        </div>
                        <div className="text-xs leading-relaxed text-slate-600">
                          <span className="font-semibold text-slate-900">Discount codes:</span> Let
                          customers enter a code at checkout to receive an offer.
                        </div>
                      </div>

                      {/* 3. Manage discounts */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 mt-0.5">
                          <SlidersHorizontal className="h-4 w-4" />
                        </div>
                        <div className="text-xs leading-relaxed text-slate-600">
                          <span className="font-semibold text-slate-900">Manage discounts:</span>{" "}
                          View, edit, activate, or deactivate your discounts.
                        </div>
                      </div>

                      {/* 4. Track performance */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 mt-0.5">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="text-xs leading-relaxed text-slate-600">
                          <span className="font-semibold text-slate-900">Track performance:</span>{" "}
                          Monitor discount usage to understand which offers work best.
                        </div>
                      </div>
                    </div>

                    {/* Caret pointing down to the link */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-b border-r border-slate-200/90 bg-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* CREATE DISCOUNT TYPE SELECTION MODAL */}
      <SelectDiscountTypeModal isOpen={isTypeModalOpen} onClose={() => setIsTypeModalOpen(false)} />

      {/* EXPORT DISCOUNTS MODAL */}
      <ExportDiscountsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        discounts={discounts}
        paginatedDiscounts={paginatedDiscounts}
        filteredDiscounts={filteredDiscounts}
        selectedIds={selectedIds}
        searchQuery={searchQuery}
      />

      {/* CONFIRM BULK DELETE MODAL */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title={`Delete ${selectedIds.size} discount${selectedIds.size > 1 ? "s" : ""}?`}
        message={`Are you sure you want to delete ${selectedIds.size} discount${
          selectedIds.size > 1 ? "s" : ""
        }? This action cannot be undone.`}
        confirmText="Delete discounts"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isBulkLoading}
      />

      {/* ADD / REMOVE TAGS MODAL */}
      {tagModalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setTagModalMode(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-ink">
                {tagModalMode === "add" ? "Add tags" : "Remove tags"}
              </h3>
              <button
                type="button"
                onClick={() => setTagModalMode(null)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              {tagModalMode === "add"
                ? `Add tags to ${selectedIds.size} selected discount${selectedIds.size > 1 ? "s" : ""}.`
                : `Remove tags from ${selectedIds.size} selected discount${selectedIds.size > 1 ? "s" : ""}.`}
            </p>

            <form onSubmit={handleTagModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tags</label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="e.g. summer, vip, sale (comma separated)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTagModalMode(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black transition cursor-pointer"
                >
                  {tagModalMode === "add" ? "Save" : "Remove"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-xl flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
