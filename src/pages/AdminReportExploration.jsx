import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";

export default function AdminReportExploration() {
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

  // Configuration panel expandable sections
  const [expandedSection, setExpandedSection] = useState(null); // "metrics" | "dimensions" | "visualization" | "filters" | null

  // Active selections
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
    showToast("Exploration reset to default.");
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

  const suggestions = [
    "Sessions by referrer over time",
    "Top products by gross sales",
    "Returning customer rate by month",
    "Conversion rate by device type",
  ];

  return (
    <div className="min-h-screen bg-[#F6F6F7] text-[#161C2C] font-sans">
      <AdminHeader />

      {/* FEEDBACK TOAST */}
      {notice && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-[#161C2C] px-4 py-3 text-[13px] font-medium text-white shadow-xl transition-all animate-in fade-in slide-in-from-bottom-2"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* BODY LAYOUT */}
      <div className="flex min-h-[calc(100vh-72px)]">
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
                <Link
                  to="/admin/online-store/reports"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5C5F62] hover:bg-[#E5E7EB] hover:text-[#161C2C] transition-colors"
                  title="Back to Reports"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </Link>

                <span className="text-[#8C9196] text-sm">›</span>

                <h1 className="text-[19px] sm:text-[20px] font-bold text-[#161C2C] tracking-tight">
                  New exploration
                </h1>

                {/* Reset / Refresh Button */}
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset exploration"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D1D5DB] bg-white text-[#5C5F62] hover:bg-[#F6F6F7] hover:text-[#161C2C] shadow-2xs transition-colors"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>

                {/* Three-dot menu */}
                <div className="relative inline-block" ref={moreMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                    title="More options"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D1D5DB] bg-white text-[#5C5F62] hover:bg-[#F6F6F7] hover:text-[#161C2C] shadow-2xs transition-colors"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="19" cy="12" r="2" />
                    </svg>
                  </button>

                  {isMoreMenuOpen && (
                    <div className="absolute left-0 top-full z-40 mt-1 min-w-[170px] rounded-xl border border-[#E5E7EB] bg-white p-1 text-left shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          showToast("Exploration saved.");
                        }}
                        className="flex w-full items-center rounded-lg px-3 py-1.5 text-[13px] text-[#202223] hover:bg-[#F6F6F7]"
                      >
                        Save as report
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          showToast("Exploration duplicated.");
                        }}
                        className="flex w-full items-center rounded-lg px-3 py-1.5 text-[13px] text-[#202223] hover:bg-[#F6F6F7]"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          showToast("CSV export initiated.");
                        }}
                        className="flex w-full items-center rounded-lg px-3 py-1.5 text-[13px] text-[#202223] hover:bg-[#F6F6F7]"
                      >
                        Export CSV
                      </button>
                      <div className="my-1 border-t border-[#F0F1F3]" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          handleReset();
                        }}
                        className="flex w-full items-center rounded-lg px-3 py-1.5 text-[13px] text-[#D82C0D] hover:bg-[#FFF4F2]"
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
                  onClick={() => showToast("Annotations feature enabled.")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#8C9196] hover:bg-[#DCDFE3] hover:text-[#5C5F62] transition-colors"
                >
                  <svg
                    className="h-3.5 w-3.5 text-[#8C9196]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                  </svg>
                  <span>Annotations</span>
                </button>

                {/* Controls button (toggles right config panel) */}
                <button
                  type="button"
                  onClick={() => setShowControls((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors ${
                    showControls
                      ? "bg-[#D1D5DB] text-[#161C2C] hover:bg-[#C4C9D0]"
                      : "bg-white border border-[#D1D5DB] text-[#5C5F62] hover:bg-[#F6F6F7]"
                  }`}
                  aria-pressed={showControls}
                >
                  <svg
                    className="h-3.5 w-3.5 text-[#161C2C]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                  <span>Controls</span>
                </button>
              </div>
            </div>

            {/* Row 2: Date Selector & Currency Selector */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {/* Date-range selector */}
              <div className="relative inline-block" ref={dateMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsDateMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white px-2.5 py-1 text-xs font-medium text-[#202223] shadow-2xs hover:bg-[#F6F6F7] transition-colors"
                >
                  <svg
                    className="h-3.5 w-3.5 text-[#5C5F62]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{dateRange}</span>
                  <svg
                    className="h-3 w-3 text-[#5C5F62]"
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

                {isDateMenuOpen && (
                  <div className="absolute left-0 top-full z-40 mt-1 min-w-[160px] rounded-xl border border-[#E5E7EB] bg-white p-1 text-left shadow-lg">
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
                            ? "bg-[#F3F4F6] font-semibold text-[#161C2C]"
                            : "text-[#374151] hover:bg-[#F9FAFB]"
                        }`}
                      >
                        <span>{preset}</span>
                        {dateRange === preset && <span>✓</span>}
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white px-2.5 py-1 text-xs font-medium text-[#202223] shadow-2xs hover:bg-[#F6F6F7] transition-colors"
                >
                  <span className="font-semibold text-[#5C5F62]">$⇄</span>
                  <span>{currency}</span>
                </button>

                {isCurrencyMenuOpen && (
                  <div className="absolute left-0 top-full z-40 mt-1 min-w-[130px] rounded-xl border border-[#E5E7EB] bg-white p-1 text-left shadow-lg">
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
                            ? "bg-[#F3F4F6] font-semibold text-[#161C2C]"
                            : "text-[#374151] hover:bg-[#F9FAFB]"
                        }`}
                      >
                        <span>{curr}</span>
                        {currency === curr && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MAIN TWO-COLUMN CONTENT AREA */}
          <div className="flex flex-col lg:flex-row items-start gap-4">
            {/* LEFT COLUMN: ANALYSIS INPUT + MAIN EMPTY WORKSPACE */}
            <div className="min-w-0 flex-1 w-full space-y-3">
              {/* Analysis Input Box */}
              <div
                className="relative rounded-2xl border border-[#E1E3E5] bg-white px-4 py-3 shadow-2xs"
                ref={explorationDropdownRef}
              >
                <div className="flex items-center gap-3">
                  {/* Purple Sidekick/AI avatar icon matching screenshot */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white shadow-xs">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>

                  <input
                    type="text"
                    value={searchExploration}
                    onChange={(e) => setSearchExploration(e.target.value)}
                    onFocus={() => setIsExplorationDropdownOpen(true)}
                    placeholder="What do you want to explore?"
                    className="w-full bg-transparent text-[14px] text-[#161C2C] placeholder:text-[#5C5F62] outline-none"
                  />

                  {/* Dropdown Chevron Button */}
                  <button
                    type="button"
                    onClick={() => setIsExplorationDropdownOpen((prev) => !prev)}
                    className="text-[#5C5F62] hover:text-[#161C2C] p-1 transition-colors"
                    aria-label="Toggle exploration suggestions"
                  >
                    <svg
                      className={`h-4 w-4 transition-transform ${
                        isExplorationDropdownOpen ? "rotate-180" : ""
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
                </div>

                {/* Suggestions Dropdown Popover */}
                {isExplorationDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1.5 rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-lg">
                    <p className="px-3 py-1 text-[11px] font-semibold text-[#8C9196] uppercase tracking-wider">
                      Suggested explorations
                    </p>
                    {suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setSearchExploration(sug);
                          setIsExplorationDropdownOpen(false);
                          if (!selectedMetrics.includes("Gross sales")) {
                            setSelectedMetrics(["Gross sales"]);
                          }
                          showToast(`Loaded: ${sug}`);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-[#202223] hover:bg-[#F6F6F7] transition-colors"
                      >
                        <span className="text-[#8C9196]">✦</span>
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Main Workspace Card */}
              <div className="min-h-[580px] rounded-2xl border border-[#E1E3E5] bg-white shadow-2xs flex flex-col items-center justify-center p-8 transition-all">
                {selectedMetrics.length === 0 ? (
                  /* EMPTY WORKSPACE: MATCHES REFERENCE SCREENSHOT */
                  <div className="flex flex-col items-center justify-center text-center">
                    {/* Soft circle with report sheet graphic */}
                    <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#F0F2F5]">
                      {/* Document Sheet Graphic with Bar Chart and Grid */}
                      <svg className="h-16 w-12 drop-shadow-2xs" viewBox="0 0 48 64" fill="none">
                        <rect
                          x="2"
                          y="2"
                          width="44"
                          height="60"
                          rx="4"
                          fill="white"
                          stroke="#E1E3E5"
                          strokeWidth="2"
                        />
                        {/* 3 Vertical Bars */}
                        <rect x="12" y="16" width="5" height="12" rx="1" fill="#9CA3AF" />
                        <rect x="21" y="10" width="5" height="18" rx="1" fill="#4B5563" />
                        <rect x="30" y="14" width="5" height="14" rx="1" fill="#9CA3AF" />
                        {/* Table Grid Horizontal Lines */}
                        <line x1="8" y1="35" x2="40" y2="35" stroke="#E5E7EB" strokeWidth="1.5" />
                        <line x1="8" y1="42" x2="40" y2="42" stroke="#E5E7EB" strokeWidth="1.5" />
                        <line x1="8" y1="49" x2="40" y2="49" stroke="#E5E7EB" strokeWidth="1.5" />
                        <line x1="8" y1="56" x2="40" y2="56" stroke="#E5E7EB" strokeWidth="1.5" />
                        {/* Table Grid Vertical Lines */}
                        <line x1="18" y1="35" x2="18" y2="56" stroke="#E5E7EB" strokeWidth="1.5" />
                        <line x1="28" y1="35" x2="28" y2="56" stroke="#E5E7EB" strokeWidth="1.5" />
                      </svg>
                    </div>

                    <p className="text-[13px] font-medium text-[#6B7280]">
                      Add a metric to see results
                    </p>
                  </div>
                ) : (
                  /* WORKSPACE WITH SELECTED METRICS ACTIVE */
                  <div className="w-full flex-1 flex flex-col justify-start">
                    {/* Active tags header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F1F3] pb-4 mb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[#6B7280]">
                          Active metrics:
                        </span>
                        {selectedMetrics.map((m) => (
                          <span
                            key={m}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2F6] px-3 py-1 text-xs font-medium text-[#161C2C]"
                          >
                            <span>{m}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleMetric(m)}
                              className="text-[#6B7280] hover:text-[#161C2C]"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#6B7280]">
                          Visualization:{" "}
                          <strong className="text-[#161C2C]">{visualizationType}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Report Table Preview */}
                    <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#FAFBFD] border-b border-[#E5E7EB] text-xs font-semibold text-[#6B7280]">
                          <tr>
                            <th className="px-4 py-3">Dimension</th>
                            {selectedMetrics.map((m) => (
                              <th key={m} className="px-4 py-3 text-right">
                                {m}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0F1F3]">
                          <tr>
                            <td className="px-4 py-3 font-medium text-[#161C2C]">Online Store</td>
                            {selectedMetrics.map((m) => (
                              <td
                                key={m}
                                className="px-4 py-3 text-right tabular-nums text-[#374151]"
                              >
                                {m.includes("sales") || m.includes("AOV")
                                  ? "$12,450.00"
                                  : m.includes("rate")
                                    ? "3.2%"
                                    : "1,240"}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-medium text-[#161C2C]">Point of Sale</td>
                            {selectedMetrics.map((m) => (
                              <td
                                key={m}
                                className="px-4 py-3 text-right tabular-nums text-[#374151]"
                              >
                                {m.includes("sales") || m.includes("AOV")
                                  ? "$4,820.00"
                                  : m.includes("rate")
                                    ? "4.5%"
                                    : "480"}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT CONFIGURATION PANEL */}
            {showControls && (
              <div className="w-full lg:w-72 shrink-0 animate-in fade-in duration-150">
                {/* TABS: Freeform & Cohorts */}
                <div className="flex">
                  {/* Freeform Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("freeform")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs rounded-t-xl transition-colors ${
                      activeTab === "freeform"
                        ? "bg-white font-semibold text-[#161C2C] border-t border-l border-r border-[#E1E3E5]"
                        : "bg-[#E5E7EB] font-medium text-[#5C5F62] hover:bg-[#DCDFE3]"
                    }`}
                  >
                    {/* Bar chart icon */}
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <span>Freeform</span>
                  </button>

                  {/* Cohorts Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("cohorts")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs rounded-t-xl transition-colors ${
                      activeTab === "cohorts"
                        ? "bg-white font-semibold text-[#161C2C] border-t border-l border-r border-[#E1E3E5]"
                        : "bg-[#E5E7EB] font-medium text-[#5C5F62] hover:bg-[#DCDFE3]"
                    }`}
                  >
                    {/* Grid/cohort icon */}
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                    <span>Cohorts</span>
                  </button>
                </div>

                {/* CONFIGURATION PANEL BODY */}
                <div className="rounded-b-2xl rounded-tr-2xl border border-[#E1E3E5] bg-white p-3 space-y-2.5 shadow-2xs">
                  {/* SECTION 1: METRICS */}
                  <div>
                    <div
                      onClick={() => toggleSection("metrics")}
                      className="group flex cursor-pointer items-center justify-between rounded-xl border border-[#E1E3E5] bg-[#F6F6F7] px-3.5 py-2.5 transition-colors hover:bg-[#EEF0F2]"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#202223]">Metrics</span>
                        {selectedMetrics.length > 0 && (
                          <span className="rounded-full bg-[#161C2C] px-1.5 py-0.2 text-[10px] text-white">
                            {selectedMetrics.length}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-[#5C5F62] group-hover:text-[#161C2C]">
                        {expandedSection === "metrics" ? "−" : "+"}
                      </span>
                    </div>

                    {expandedSection === "metrics" && (
                      <div className="mt-2 space-y-1 rounded-xl border border-[#E5E7EB] bg-[#FAFBFD] p-2 text-xs">
                        <p className="px-2 py-1 text-[11px] font-semibold text-[#8C9196] uppercase">
                          Select metrics
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
                                  ? "bg-[#161C2C] text-white font-medium"
                                  : "text-[#374151] hover:bg-[#F3F4F6]"
                              }`}
                            >
                              <span>{metric}</span>
                              {isSelected && <span>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: DIMENSIONS */}
                  <div>
                    <div
                      onClick={() => toggleSection("dimensions")}
                      className="group flex cursor-pointer items-center justify-between rounded-xl border border-[#E1E3E5] bg-[#F6F6F7] px-3.5 py-2.5 transition-colors hover:bg-[#EEF0F2]"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#202223]">Dimensions</span>
                        {selectedDimensions.length > 0 && (
                          <span className="rounded-full bg-[#161C2C] px-1.5 py-0.2 text-[10px] text-white">
                            {selectedDimensions.length}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-[#5C5F62] group-hover:text-[#161C2C]">
                        {expandedSection === "dimensions" ? "−" : "+"}
                      </span>
                    </div>

                    {expandedSection === "dimensions" && (
                      <div className="mt-2 space-y-1 rounded-xl border border-[#E5E7EB] bg-[#FAFBFD] p-2 text-xs">
                        <p className="px-2 py-1 text-[11px] font-semibold text-[#8C9196] uppercase">
                          Select dimensions
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
                                  ? "bg-[#161C2C] text-white font-medium"
                                  : "text-[#374151] hover:bg-[#F3F4F6]"
                              }`}
                            >
                              <span>{dim}</span>
                              {isSelected && <span>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: VISUALIZATION */}
                  <div>
                    <div
                      onClick={() => toggleSection("visualization")}
                      className="group flex cursor-pointer items-center justify-between rounded-xl border border-[#E1E3E5] bg-[#F6F6F7] px-3.5 py-2.5 transition-colors hover:bg-[#EEF0F2]"
                    >
                      <span className="text-xs font-semibold text-[#202223]">Visualization</span>
                      <span className="text-[11px] text-[#6B7280] font-medium">
                        {visualizationType}
                      </span>
                    </div>

                    {expandedSection === "visualization" && (
                      <div className="mt-2 space-y-1 rounded-xl border border-[#E5E7EB] bg-[#FAFBFD] p-2 text-xs">
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
                                ? "bg-[#161C2C] text-white font-medium"
                                : "text-[#374151] hover:bg-[#F3F4F6]"
                            }`}
                          >
                            <span>{type}</span>
                            {visualizationType === type && <span>✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION 4: FILTERS */}
                  <div>
                    <div
                      onClick={() => toggleSection("filters")}
                      className="group flex cursor-pointer items-center justify-between rounded-xl border border-[#E1E3E5] bg-[#F6F6F7] px-3.5 py-2.5 transition-colors hover:bg-[#EEF0F2]"
                    >
                      <span className="text-xs font-semibold text-[#202223]">Filters</span>
                      <span className="text-sm font-bold text-[#5C5F62] group-hover:text-[#161C2C]">
                        {expandedSection === "filters" ? "−" : "+"}
                      </span>
                    </div>

                    {expandedSection === "filters" && (
                      <div className="mt-2 space-y-1 rounded-xl border border-[#E5E7EB] bg-[#FAFBFD] p-2 text-xs">
                        <p className="px-2 py-1 text-[11px] font-semibold text-[#8C9196] uppercase">
                          Add filter
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
                                  ? "bg-[#161C2C] text-white font-medium"
                                  : "text-[#374151] hover:bg-[#F3F4F6]"
                              }`}
                            >
                              <span>{filter}</span>
                              {isSelected && <span>✓</span>}
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
