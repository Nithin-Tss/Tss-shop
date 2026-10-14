import { useState, useEffect, useMemo, useRef } from "react";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { apiGet } from "@/lib/api";

function ShopifyBagIcon({ className = "h-4 w-4 shrink-0" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect width="20" height="20" x="2" y="2" rx="4" fill="#95BF47" />
      <path
        d="M12 6.5C10.6 6.5 9.5 7.6 9.5 9V10H14.5V9C14.5 7.6 13.4 6.5 12 6.5Z"
        stroke="white"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M7 10H17L16 17.5C16 18.1 15.5 18.5 15 18.5H9C8.5 18.5 8 18.1 8 17.5L7 10Z"
        fill="#95BF47"
        stroke="white"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M12.8 12.8C12.8 12.2 12.3 11.8 11.8 11.8C11.2 11.8 10.8 12.2 10.8 12.7C10.8 13.7 13.2 13.4 13.2 14.6C13.2 15.2 12.7 15.7 12 15.7C11.3 15.7 10.8 15.1 10.8 14.6"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCreator, setSelectedCreator] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Dropdown states
  const [isCreatedByOpen, setIsCreatedByOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Refs for click outside
  const createdByRef = useRef(null);
  const categoryRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (createdByRef.current && !createdByRef.current.contains(event.target)) {
        setIsCreatedByOpen(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch report data if an API endpoint exists
  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet("/api/v1/reports/");
        if (res.ok && Array.isArray(res.data)) {
          setReports(res.data);
        } else if (res.ok && Array.isArray(res.data?.results)) {
          setReports(res.data.results);
        } else {
          // No backend endpoint or no reports in database
          setReports([]);
        }
      } catch (err) {
        setReports([]);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  // Distinct categories and creators from data
  const availableCategories = useMemo(() => {
    const defaultCats = ["Acquisition", "Behavior", "Customers", "Finances", "Sales"];
    const fromData = Array.from(new Set(reports.map((r) => r.category).filter(Boolean)));
    return Array.from(new Set([...defaultCats, ...fromData]));
  }, [reports]);

  const availableCreators = useMemo(() => {
    const fromData = Array.from(new Set(reports.map((r) => r.created_by).filter(Boolean)));
    return Array.from(new Set(["Shopify", ...fromData]));
  }, [reports]);

  // Filter and sort reports
  const filteredReports = useMemo(() => {
    let result = reports;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.created_by?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter(
        (r) => (r.category || "").toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (selectedCreator !== "all") {
      result = result.filter(
        (r) => (r.created_by || "").toLowerCase() === selectedCreator.toLowerCase()
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [reports, searchQuery, selectedCategory, selectedCreator, sortField, sortOrder]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedCreator]);

  const totalPages = Math.ceil(filteredReports.length / pageSize) || 1;
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  const handleToggleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleNewExploration = () => {
    setNotice("New exploration feature will be enabled once report definitions are configured.");
    setTimeout(() => setNotice(null), 3500);
  };

  const headCell = "px-4 py-2.5 text-[12px] font-semibold text-[#6B7280] whitespace-nowrap";
  const pageButton =
    "inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#4B5563] transition-colors hover:bg-[#F9FAFB] disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#161C2C] font-sans">
      <AdminHeader />

      {/* FEEDBACK TOAST */}
      {notice && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-[#161C2C] px-4 py-3 text-[13px] font-medium text-white shadow-xl transition-all"
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

        {/* MAIN REPORTS CONTENT */}
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-8">
          {/* TOP PAGE HEADING ROW */}
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              {/* Document / report icon */}
              <svg className="h-5 w-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h1 className="text-[20px] font-bold tracking-tight text-[#161C2C]">
                Reports
              </h1>
            </div>

            <button
              type="button"
              onClick={handleNewExploration}
              className="inline-flex items-center justify-center rounded-lg bg-[#202223] px-3.5 py-1.5 text-[13px] font-medium text-white shadow-xs transition-colors hover:bg-[#303336] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#202223]/20"
            >
              New exploration
            </button>
          </div>

          {/* MAIN CARD CONTAINER */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-xs">
            {/* SEARCH & FILTERS HEADER */}
            <div className="border-b border-[#E5E7EB] p-3 sm:p-4">
              {/* Search input bar with sort button */}
              <div className="flex items-center gap-2 mb-3">
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
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reports"
                    aria-label="Search reports"
                    className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-8 text-[14px] text-[#161C2C] outline-none transition placeholder:text-[#9CA3AF] hover:border-[#D1D5DB] focus:border-[#161C2C] focus:ring-1 focus:ring-[#161C2C]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      className="absolute right-2.5 flex h-5 w-5 items-center justify-center rounded text-[12px] text-[#9CA3AF] hover:text-[#4B5563]"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sort order toggle icon button */}
                <button
                  type="button"
                  onClick={() => handleToggleSort("name")}
                  title={`Sort by name (${sortOrder === "asc" ? "ascending" : "descending"})`}
                  aria-label="Sort reports"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#161C2C] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#161C2C]"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>

              {/* Filter pills: Created by & Category */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Created by Filter */}
                <div className="relative inline-block" ref={createdByRef}>
                  <button
                    type="button"
                    onClick={() => setIsCreatedByOpen((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white px-3 py-1 text-[13px] font-medium text-[#202223] shadow-xs transition-colors hover:bg-[#F6F6F7] ${
                      selectedCreator !== "all" ? "border-[#161C2C] bg-[#F4F6F8]" : ""
                    }`}
                    aria-expanded={isCreatedByOpen}
                  >
                    <span>
                      {selectedCreator === "all" ? "Created by" : `Created by: ${selectedCreator}`}
                    </span>
                    <svg className="h-3.5 w-3.5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {isCreatedByOpen && (
                    <div className="absolute left-0 top-full z-40 mt-1 min-w-[160px] rounded-xl border border-[#E5E7EB] bg-white p-1 text-left shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCreator("all");
                          setIsCreatedByOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[13px] ${
                          selectedCreator === "all" ? "font-semibold text-[#161C2C] bg-[#F3F4F6]" : "text-[#374151] hover:bg-[#F9FAFB]"
                        }`}
                      >
                        <span>All creators</span>
                        {selectedCreator === "all" && <span>✓</span>}
                      </button>
                      {availableCreators.map((creator) => (
                        <button
                          key={creator}
                          type="button"
                          onClick={() => {
                            setSelectedCreator(creator);
                            setIsCreatedByOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[13px] ${
                            selectedCreator === creator ? "font-semibold text-[#161C2C] bg-[#F3F4F6]" : "text-[#374151] hover:bg-[#F9FAFB]"
                          }`}
                        >
                          <span>{creator}</span>
                          {selectedCreator === creator && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Filter */}
                <div className="relative inline-block" ref={categoryRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white px-3 py-1 text-[13px] font-medium text-[#202223] shadow-xs transition-colors hover:bg-[#F6F6F7] ${
                      selectedCategory !== "all" ? "border-[#161C2C] bg-[#F4F6F8]" : ""
                    }`}
                    aria-expanded={isCategoryOpen}
                  >
                    <span>
                      {selectedCategory === "all" ? "Category" : `Category: ${selectedCategory}`}
                    </span>
                    <svg className="h-3.5 w-3.5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {isCategoryOpen && (
                    <div className="absolute left-0 top-full z-40 mt-1 min-w-[170px] rounded-xl border border-[#E5E7EB] bg-white p-1 text-left shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory("all");
                          setIsCategoryOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[13px] ${
                          selectedCategory === "all" ? "font-semibold text-[#161C2C] bg-[#F3F4F6]" : "text-[#374151] hover:bg-[#F9FAFB]"
                        }`}
                      >
                        <span>All categories</span>
                        {selectedCategory === "all" && <span>✓</span>}
                      </button>
                      {availableCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat);
                            setIsCategoryOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[13px] ${
                            selectedCategory === cat ? "font-semibold text-[#161C2C] bg-[#F3F4F6]" : "text-[#374151] hover:bg-[#F9FAFB]"
                          }`}
                        >
                          <span>{cat}</span>
                          {selectedCategory === cat && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reset Filters button if active */}
                {(selectedCategory !== "all" || selectedCreator !== "all" || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("all");
                      setSelectedCreator("all");
                      setSearchQuery("");
                    }}
                    className="text-[12px] text-[#6B7280] hover:text-[#161C2C] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* TABLE: RESPONSIVE */}
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#FAFBFD]">
                    <th
                      className={`${headCell} cursor-pointer hover:text-[#161C2C]`}
                      onClick={() => handleToggleSort("name")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Name
                        {sortField === "name" && (
                          <span className="text-[10px]">{sortOrder === "asc" ? "↑" : "↓"}</span>
                        )}
                      </span>
                    </th>
                    <th className={headCell}>Category</th>
                    <th
                      className={`${headCell} cursor-pointer hover:text-[#161C2C]`}
                      onClick={() => handleToggleSort("last_viewed")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Last viewed
                        <svg className="h-3 w-3 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </span>
                    </th>
                    <th className={headCell}>Created by</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F0F1F3]">
                  {/* LOADING SKELETON */}
                  {loading && (
                    <>
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <tr key={i} className="h-12 animate-pulse">
                          <td className="px-4 py-3">
                            <div className="h-4 w-48 rounded bg-[#EEF0F2]" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-5 w-20 rounded-full bg-[#EEF0F2]" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-4 w-24 rounded bg-[#EEF0F2]" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded bg-[#EEF0F2]" />
                              <div className="h-4 w-16 rounded bg-[#EEF0F2]" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* EMPTY STATE */}
                  {!loading && paginatedReports.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-16 text-center">
                        <div className="mx-auto flex max-w-md flex-col items-center">
                          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[22px] text-[#9CA3AF]">
                            <svg className="h-7 w-7 text-[#9CA3AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h3 className="mb-1 text-[16px] font-semibold text-[#161C2C]">
                            {searchQuery || selectedCategory !== "all" || selectedCreator !== "all"
                              ? "No matching reports"
                              : "No reports found"}
                          </h3>
                          <p className="mb-6 text-[14px] leading-relaxed text-[#6B7280]">
                            {searchQuery || selectedCategory !== "all" || selectedCreator !== "all"
                              ? "No reports match your selected filters. Try clearing or modifying your search."
                              : "Reports will appear here when data is available."}
                          </p>
                          {(searchQuery || selectedCategory !== "all" || selectedCreator !== "all") && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery("");
                                setSelectedCategory("all");
                                setSelectedCreator("all");
                              }}
                              className="inline-flex items-center justify-center rounded-lg bg-[#161C2C] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#262E42]"
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* DYNAMIC REPORT ROWS */}
                  {!loading &&
                    paginatedReports.map((report, idx) => (
                      <tr
                        key={report.id || idx}
                        className="h-12 transition-colors hover:bg-[#F9FAFB] cursor-pointer"
                      >
                        {/* Name */}
                        <td className="px-4 py-3 font-medium text-[#161C2C] hover:underline">
                          <div className="flex items-center gap-1.5">
                            <span>{report.name}</span>
                            {report.description && (
                              <span
                                title={report.description}
                                className="text-[12px] text-[#9CA3AF] hover:text-[#4B5563]"
                              >
                                ⓘ
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-[#F1F2F4] px-2.5 py-0.5 text-[12px] font-medium text-[#4B5563]">
                            {report.category || "General"}
                          </span>
                        </td>

                        {/* Last viewed */}
                        <td className="px-4 py-3 text-[13px] text-[#6B7280]">
                          {report.last_viewed || "—"}
                        </td>

                        {/* Created by */}
                        <td className="px-4 py-3 text-[13px] text-[#202223]">
                          <div className="flex items-center gap-1.5">
                            <ShopifyBagIcon />
                            <span>{report.created_by || "Shopify"}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                  {filteredReports.length === 0
                    ? "0-0"
                    : `${(currentPage - 1) * pageSize + 1}-${Math.min(
                        currentPage * pageSize,
                        filteredReports.length
                      )}`}
                </span>
              </div>

              <span className="tabular-nums">
                Total {filteredReports.length} {filteredReports.length === 1 ? "report" : "reports"}
              </span>
            </div>
          </div>

          {/* BOTTOM FOOTER INFO LINK */}
          <div className="pb-6 pt-6 text-center">
            <a
              href="#learn-more"
              className="text-[12px] text-[#6B7280] underline underline-offset-2 transition-colors hover:text-[#161C2C]"
            >
              Learn more about the new reporting experience
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}