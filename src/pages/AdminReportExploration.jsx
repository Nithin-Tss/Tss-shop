import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  RotateCw,
  MoreHorizontal,
  MessageSquare,
  SlidersHorizontal,
  Calendar,
  ChevronDown,
  Bot,
  BarChart2,
  LayoutGrid,
} from "lucide-react";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import Icon from "@/components/Icons";

export default function AdminReportExploration() {
  const navigate = useNavigate();

  // Toolbar & controls state
  const [dateRange, setDateRange] = useState("All time");
  const [currency, setCurrency] = useState("AUD $");
  const [showControls, setShowControls] = useState(true);
  const [activeTab, setActiveTab] = useState("freeform"); // "freeform" | "cohorts"
  const [searchExploration, setSearchExploration] = useState("");
  const [isExplorationDropdownOpen, setIsExplorationDropdownOpen] = useState(false);

  // Dropdown states
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  // Configuration panel expandable sections: "metrics" | "dimensions" | "visualization" | "filters" | null
  const [expandedSection, setExpandedSection] = useState(null);

  // Active selections (structural state only)
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [selectedDimensions, setSelectedDimensions] = useState([]);
  const [visualizationType, setVisualizationType] = useState("Table");
  const [selectedFilters, setSelectedFilters] = useState([]);

  // Refs for outside click
  const dateMenuRef = useRef(null);
  const currencyMenuRef = useRef(null);
  const moreMenuRef = useRef(null);
  const explorationDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(event.target)) {
        setIsDateMenuOpen(false);
      }
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(event.target)) {
        setIsCurrencyMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
      if (
        explorationDropdownRef.current &&
        !explorationDropdownRef.current.contains(event.target)
      ) {
        setIsExplorationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const showToast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleReset = () => {
    setSelectedMetrics([]);
    setSelectedDimensions([]);
    setSelectedFilters([]);
    setSearchExploration("");
    setExpandedSection(null);
    showToast("Exploration reset.");
  };

  const toggleSection = (sectionName) => {
    setExpandedSection((prev) => (prev === sectionName ? null : sectionName));
  };

  const handleToggleMetric = (metric) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  const handleToggleDimension = (dim) => {
    setSelectedDimensions((prev) =>
      prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim]
    );
  };

  const availableMetrics = [
    "Gross sales",
    "Net sales",
    "Total orders",
    "Average order value (AOV)",
    "Sessions",
    "Conversion rate",
    "Returning customer rate",
  ];

  const availableDimensions = [
    "Date / Day",
    "Sales channel",
    "Product title",
    "Referrer source",
    "Customer type",
    "Device type",
  ];

  const availableVisualizations = ["Table", "Bar chart", "Line chart", "Donut chart"];

  return (
    <div className="min-h-screen bg-slate-100 text-ink font-sans">
      <AdminHeader />

      {/* FEEDBACK TOAST */}
      {notice && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-3 text-[13px] font-medium text-white shadow-xl transition-all animate-in fade-in slide-in-from-bottom-2"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* BODY LAYOUT */}
      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* MAIN EXPLORATION CONTENT */}
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-7">
          {/* TOP TOOLBAR */}
          <div className="mb-4">
            {/* Row 1: Breadcrumb + Title + Quick Actions + Right Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Left Title Area */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200 hover:text-orange-600 transition-colors"
                  title="Back"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>

                <span className="text-slate-400 text-sm">›</span>

                <h1 className="text-[19px] sm:text-[20px] font-semibold text-ink tracking-tight">
                  New exploration
                </h1>

                {/* Reset / Refresh Button */}
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset exploration"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-orange-600 shadow-2xs transition-colors"
                >
                  <RotateCw className="h-3.5 w-3.5" strokeWidth={2} />
                </button>

                {/* Three-dot menu */}
                <div className="relative inline-block" ref={moreMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                    title="More options"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-orange-600 shadow-2xs transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
                  </button>

                  {isMoreMenuOpen && (
                    <div className="absolute left-0 top-full z-40 mt-1 min-w-[170px] rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          showToast("Exploration saved.");
                        }}
                        className="flex w-full items-center rounded-lg px-3 py-1.5 text-[13px] text-ink hover:bg-slate-100"
                      >
                        Save as report
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          showToast("Exploration duplicated.");
                        }}
                        className="flex w-full items-center rounded-lg px-3 py-1.5 text-[13px] text-ink hover:bg-slate-100"
                      >
                        Duplicate
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          handleReset();
                        }}
                        className="flex w-full items-center rounded-lg px-3 py-1.5 text-[13px] text-orange-700 hover:bg-orange-50"
                      >
                        Discard exploration
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Toolbar Actions */}
              <div className="flex items-center gap-2">
                {/* Annotations button */}
                <button
                  type="button"
                  onClick={() => showToast("Annotations feature.")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-[rgba(24,24,27,0.12)] hover:text-orange-600 transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Annotations</span>
                </button>

                {/* Controls button (toggles right config panel) */}
                <button
                  type="button"
                  onClick={() => setShowControls((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors ${
                    showControls
                      ? "bg-slate-300 text-ink hover:bg-[rgba(24,24,27,0.22)]"
                      : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                  aria-pressed={showControls}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-ink" strokeWidth={2} />
                  <span>Controls</span>
                </button>
              </div>
            </div>

            {/* Row 2: Date Selector & Currency Selector */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {/* Date-range selector */}
              <div className="relative inline-block" ref={dateMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsDateMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-ink shadow-2xs hover:bg-[rgba(24,24,27,0.12)] transition-colors"
                >
                  <Calendar className="h-3.5 w-3.5 text-slate-500" strokeWidth={2} />
                  <span>{dateRange}</span>
                  <ChevronDown className="h-3 w-3 text-slate-500" strokeWidth={2} />
                </button>

                {isDateMenuOpen && (
                  <div className="absolute left-0 top-full z-40 mt-1 min-w-[160px] rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg">
                    {[
                      "All time",
                      "Today",
                      "Last 7 days",
                      "Last 30 days",
                      "Last 90 days",
                      "This year",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setDateRange(preset);
                          setIsDateMenuOpen(false);
                          showToast(`Date range set to ${preset}`);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[13px] ${
                          dateRange === preset
                            ? "bg-slate-100 font-semibold text-ink"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>{preset}</span>
                        {dateRange === preset && <Icon name="check" className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Currency selector */}
              <div className="relative inline-block" ref={currencyMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsCurrencyMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-ink shadow-2xs hover:bg-[rgba(24,24,27,0.12)] transition-colors"
                >
                  <span className="font-semibold text-slate-500 text-[11px]">$⇄</span>
                  <span>{currency}</span>
                </button>

                {isCurrencyMenuOpen && (
                  <div className="absolute left-0 top-full z-40 mt-1 min-w-[130px] rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg">
                    {["AUD $", "USD $", "EUR €", "GBP £", "INR ₹"].map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => {
                          setCurrency(curr);
                          setIsCurrencyMenuOpen(false);
                          showToast(`Currency changed to ${curr}`);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[13px] ${
                          currency === curr
                            ? "bg-slate-100 font-semibold text-ink"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>{curr}</span>
                        {currency === curr && <Icon name="check" className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MAIN TWO-COLUMN CONTENT AREA */}
          <div className="flex flex-col lg:flex-row items-start gap-4">
            {/* LEFT COLUMN: PROMPT FIELD + CENTRAL EMPTY WORKSPACE */}
            <div className="min-w-0 flex-1 w-full space-y-3">
              {/* Prompt / Search Field */}
              <div
                className="relative rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-2xs"
                ref={explorationDropdownRef}
              >
                <div className="flex items-center gap-3">
                  {/* Purple AI/Robot avatar icon matching reference screenshot */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
                    <Bot className="h-4 w-4" strokeWidth={2} />
                  </div>

                  <input
                    type="text"
                    value={searchExploration}
                    onChange={(e) => setSearchExploration(e.target.value)}
                    onFocus={() => setIsExplorationDropdownOpen(true)}
                    placeholder="What do you want to explore?"
                    className="w-full bg-transparent text-[14px] text-ink placeholder:text-slate-500 outline-none"
                  />

                  {/* Dropdown Chevron Button */}
                  <button
                    type="button"
                    onClick={() => setIsExplorationDropdownOpen((prev) => !prev)}
                    className="text-slate-500 hover:text-orange-600 p-1 transition-colors"
                    aria-label="Toggle exploration dropdown"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isExplorationDropdownOpen ? "rotate-180" : ""
                      }`}
                      strokeWidth={2}
                    />
                  </button>
                </div>

                {/* Suggestions Dropdown Popover */}
                {isExplorationDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    <p className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Suggested prompts
                    </p>
                    {[
                      "Explore sales trends over time",
                      "Top products by revenue",
                      "Customer cohort retention rate",
                      "Sessions by traffic source",
                    ].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setSearchExploration(sug);
                          setIsExplorationDropdownOpen(false);
                          showToast(`Selected: ${sug}`);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-ink hover:bg-slate-100 transition-colors"
                      >
                        <Icon name="sparkle" className="h-4 w-4" />
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Central Workspace Card: PURE EMPTY STRUCTURE MATCHING SCREENSHOT */}
              <div className="min-h-[580px] rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col items-center justify-center p-8 transition-all">
                {/* Empty State Illustration */}
                <div className="flex flex-col items-center justify-center text-center">
                  {/* Soft circle with report sheet graphic */}
                  <div className="relative mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-slate-100">
                    {/* Document Sheet Graphic with Bar Chart and Grid */}
                    <svg className="h-16 w-12 drop-shadow-2xs" viewBox="0 0 48 64" fill="none">
                      <rect
                        x="2"
                        y="2"
                        width="44"
                        height="60"
                        rx="4"
                        fill="white"
                        stroke="rgba(24,24,27,0.22)"
                        strokeWidth="1.8"
                      />
                      {/* 3 Vertical Bars */}
                      <rect x="11" y="16" width="5" height="12" rx="1" fill="rgba(24,24,27,0.5)" />
                      <rect x="21" y="10" width="6" height="18" rx="1" fill="rgba(24,24,27,0.78)" />
                      <rect x="32" y="14" width="5" height="14" rx="1" fill="rgba(24,24,27,0.5)" />
                      {/* Table Grid Horizontal Lines */}
                      <line
                        x1="8"
                        y1="36"
                        x2="40"
                        y2="36"
                        stroke="rgba(24,24,27,0.12)"
                        strokeWidth="1.5"
                      />
                      <line
                        x1="8"
                        y1="44"
                        x2="40"
                        y2="44"
                        stroke="rgba(24,24,27,0.12)"
                        strokeWidth="1.5"
                      />
                      <line
                        x1="8"
                        y1="52"
                        x2="40"
                        y2="52"
                        stroke="rgba(24,24,27,0.12)"
                        strokeWidth="1.5"
                      />
                      {/* Table Grid Vertical Lines */}
                      <line
                        x1="18"
                        y1="36"
                        x2="18"
                        y2="56"
                        stroke="rgba(24,24,27,0.12)"
                        strokeWidth="1.5"
                      />
                      <line
                        x1="28"
                        y1="36"
                        x2="28"
                        y2="56"
                        stroke="rgba(24,24,27,0.12)"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>

                  <p className="text-[14px] font-medium text-slate-500">
                    Add a metric to see results
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT CONFIGURATION PANEL */}
            {showControls && (
              <div className="w-full lg:w-[280px] shrink-0 animate-in fade-in duration-150">
                {/* TABS: Freeform & Cohorts */}
                <div className="flex">
                  {/* Freeform Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("freeform")}
                    className={`relative flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs rounded-t-xl transition-colors ${
                      activeTab === "freeform"
                        ? "bg-white font-semibold text-ink border-t border-l border-r border-slate-200"
                        : "bg-slate-100 font-medium text-slate-500 hover:bg-[rgba(24,24,27,0.12)]"
                    }`}
                  >
                    {/* Bar chart icon */}
                    <BarChart2 className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>Freeform</span>
                    {activeTab === "freeform" && (
                      <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
                    )}
                  </button>

                  {/* Cohorts Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("cohorts")}
                    className={`relative flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs rounded-t-xl transition-colors ${
                      activeTab === "cohorts"
                        ? "bg-white font-semibold text-ink border-t border-l border-r border-slate-200"
                        : "bg-slate-100 font-medium text-slate-500 hover:bg-[rgba(24,24,27,0.12)]"
                    }`}
                  >
                    {/* Grid/cohort icon */}
                    <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>Cohorts</span>
                    {activeTab === "cohorts" && (
                      <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
                    )}
                  </button>
                </div>

                {/* CONFIGURATION PANEL BODY */}
                <div className="rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-2xs">
                  {/* SECTION 1: METRICS */}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleSection("metrics")}
                      className="w-full group flex items-center justify-between rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-semibold text-ink hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <span>Metrics</span>
                      <span className="text-base font-normal text-slate-500 group-hover:text-orange-600">
                        {expandedSection === "metrics" ? "−" : "+"}
                      </span>
                    </button>

                    {expandedSection === "metrics" && (
                      <div className="mt-2 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs animate-in fade-in">
                        <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase">
                          Available metrics
                        </p>
                        {availableMetrics.map((metric) => {
                          const isSelected = selectedMetrics.includes(metric);
                          return (
                            <button
                              key={metric}
                              type="button"
                              onClick={() => handleToggleMetric(metric)}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                                isSelected
                                  ? "bg-ink text-white font-medium"
                                  : "text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <span>{metric}</span>
                              {isSelected && <Icon name="check" className="h-3.5 w-3.5" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: DIMENSIONS */}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleSection("dimensions")}
                      className="w-full group flex items-center justify-between rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-semibold text-ink hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <span>Dimensions</span>
                      <span className="text-base font-normal text-slate-500 group-hover:text-orange-600">
                        {expandedSection === "dimensions" ? "−" : "+"}
                      </span>
                    </button>

                    {expandedSection === "dimensions" && (
                      <div className="mt-2 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs animate-in fade-in">
                        <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase">
                          Available dimensions
                        </p>
                        {availableDimensions.map((dim) => {
                          const isSelected = selectedDimensions.includes(dim);
                          return (
                            <button
                              key={dim}
                              type="button"
                              onClick={() => handleToggleDimension(dim)}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                                isSelected
                                  ? "bg-ink text-white font-medium"
                                  : "text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <span>{dim}</span>
                              {isSelected && <Icon name="check" className="h-3.5 w-3.5" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: VISUALIZATION (No plus icon, matching screenshot) */}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleSection("visualization")}
                      className="w-full group flex items-center justify-between rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-semibold text-ink hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <span>Visualization</span>
                    </button>

                    {expandedSection === "visualization" && (
                      <div className="mt-2 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs animate-in fade-in">
                        <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase">
                          Select visualization
                        </p>
                        {availableVisualizations.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setVisualizationType(type);
                              toggleSection("visualization");
                              showToast(`Visualization set to ${type}`);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                              visualizationType === type
                                ? "bg-ink text-white font-medium"
                                : "text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <span>{type}</span>
                            {visualizationType === type && (
                              <Icon name="check" className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION 4: FILTERS */}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleSection("filters")}
                      className="w-full group flex items-center justify-between rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-semibold text-ink hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <span>Filters</span>
                      <span className="text-base font-normal text-slate-500 group-hover:text-orange-600">
                        {expandedSection === "filters" ? "−" : "+"}
                      </span>
                    </button>

                    {expandedSection === "filters" && (
                      <div className="mt-2 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs animate-in fade-in">
                        <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase">
                          Filter options
                        </p>
                        {[
                          "Sales channel is Online",
                          "Order status is Paid",
                          "Country is Australia",
                        ].map((filter) => {
                          const isSelected = selectedFilters.includes(filter);
                          return (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => {
                                setSelectedFilters((prev) =>
                                  prev.includes(filter)
                                    ? prev.filter((f) => f !== filter)
                                    : [...prev, filter]
                                );
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                                isSelected
                                  ? "bg-ink text-white font-medium"
                                  : "text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <span>{filter}</span>
                              {isSelected && <Icon name="check" className="h-3.5 w-3.5" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
