import { useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";

// SVG Illustration for Empty State
function GiftCardsIllustration({ className = "h-36 w-44" }) {
  return (
    <svg
      viewBox="0 0 200 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="gc-shadow" x="25" y="30" width="150" height="95" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#14130F" floodOpacity="0.1" />
        </filter>
        <linearGradient
          id="card-grad"
          x1="35"
          y1="40"
          x2="165"
          y2="115"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1E1D19" />
          <stop offset="1" stopColor="#3A3832" />
        </linearGradient>
        <linearGradient id="ribbon-grad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#E0B86B" />
          <stop offset="1" stopColor="#C49A48" />
        </linearGradient>
      </defs>

      {/* Ambient background circle */}
      <circle cx="100" cy="75" r="60" fill="#F3F1EC" />

      {/* Main Gift Card */}
      <g filter="url(#gc-shadow)">
        <rect
          x="35"
          y="42"
          width="130"
          height="76"
          rx="8"
          fill="url(#card-grad)"
          stroke="#4A4740"
          strokeWidth="1"
        />
        {/* Ribbon Horizontal */}
        <rect x="35" y="68" width="130" height="12" fill="url(#ribbon-grad)" opacity="0.9" />
        {/* Ribbon Vertical */}
        <rect x="86" y="42" width="12" height="76" fill="url(#ribbon-grad)" opacity="0.9" />
        {/* Ribbon Bow */}
        <path d="M86 68 C80 58, 66 60, 72 74 C78 78, 86 74, 86 74 Z" fill="#F0CD87" />
        <path d="M98 68 C104 58, 118 60, 112 74 C106 78, 98 74, 98 74 Z" fill="#F0CD87" />
        <circle cx="92" cy="74" r="3.5" fill="#C49A48" />

        {/* Card Chip & Details */}
        <rect x="47" y="52" width="12" height="9" rx="1.5" fill="#E0B86B" opacity="0.8" />
        {/* Masked numbers */}
        <circle cx="50" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="56" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="62" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="68" cy="98" r="1.5" fill="#A8A49C" />

        <circle cx="78" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="84" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="90" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="96" cy="98" r="1.5" fill="#A8A49C" />

        <circle cx="106" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="112" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="118" cy="98" r="1.5" fill="#A8A49C" />
        <circle cx="124" cy="98" r="1.5" fill="#A8A49C" />

        <text x="135" y="101" fill="#FFFFFF" fontSize="8" fontFamily="monospace" fontWeight="600">
          8492
        </text>
      </g>
    </svg>
  );
}

export default function AdminGiftCards() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-charcoal-navy">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">
        <AdminSidebar />

        <main className="min-w-0 flex-1 bg-[#F3F1EC] px-4 sm:px-8 py-6 max-w-full overflow-x-hidden">
          {/* Page Title & Action Buttons Header */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 text-[20px] sm:text-[22px] font-bold text-charcoal-navy">
              <PageIcon name="gift_cards" />
              Gift cards
            </h1>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/admin/online-store/products/new")}
                className="rounded-lg border border-[#D4D0C5] bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-charcoal-navy hover:bg-[#FAF9F6] transition shadow-2xs cursor-pointer"
              >
                Add gift card product
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/online-store/products")}
                className="rounded-lg border border-[#D4D0C5] bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-charcoal-navy hover:bg-[#FAF9F6] transition shadow-2xs cursor-pointer"
              >
                View gift card products
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-[#D4D0C5] bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-charcoal-navy hover:bg-[#FAF9F6] transition shadow-2xs cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg bg-charcoal-navy px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-2xs hover:bg-[#1A1916] transition cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create gift card
              </button>
            </div>
          </div>

          {/* Table Container Card */}
          <div className="rounded-2xl border border-[#E7E4DC] bg-white shadow-xs overflow-hidden">
            {/* Search and Filters Toolbar (Visual UI) */}
            <div className="p-3.5 sm:p-4 border-b border-[#E7E4DC] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746A]"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search and filter"
                  defaultValue=""
                  className="h-9 w-full rounded-lg border border-[#D4D0C5] bg-white pl-9 pr-3 text-xs sm:text-sm text-charcoal-navy outline-none placeholder:text-[#A8A49C] focus:border-charcoal-navy focus:ring-1 focus:ring-charcoal-navy"
                />
              </div>

              {/* Filter and Sort Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="status-filter"
                    className="text-xs text-[#78746A] font-medium hidden sm:inline"
                  >
                    Status:
                  </label>
                  <select
                    id="status-filter"
                    defaultValue="all"
                    className="h-9 rounded-lg border border-[#D4D0C5] bg-white px-3 text-xs sm:text-sm text-charcoal-navy outline-none focus:border-charcoal-navy focus:ring-1 focus:ring-charcoal-navy cursor-pointer"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="deactivated">Deactivated</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                {/* Sort By */}
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="sort-by"
                    className="text-xs text-[#78746A] font-medium hidden sm:inline"
                  >
                    Sort:
                  </label>
                  <select
                    id="sort-by"
                    defaultValue="created_desc"
                    className="h-9 rounded-lg border border-[#D4D0C5] bg-white px-3 text-xs sm:text-sm text-charcoal-navy outline-none focus:border-charcoal-navy focus:ring-1 focus:ring-charcoal-navy cursor-pointer"
                  >
                    <option value="created_desc">Date (newest first)</option>
                    <option value="created_asc">Date (oldest first)</option>
                    <option value="balance_desc">Balance (high to low)</option>
                    <option value="balance_asc">Balance (low to high)</option>
                  </select>
                </div>

                {/* Table Views / Columns Icon Button */}
                <button
                  type="button"
                  title="Table columns & view"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D4D0C5] bg-white text-[#5A5750] hover:bg-[#FAF9F6] transition shrink-0 cursor-pointer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    <line x1="15" y1="3" x2="15" y2="21" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Status Badges Showcase Bar */}
            <div className="px-4 py-2 bg-[#FAF9F6] border-b border-[#E7E4DC] flex flex-wrap items-center justify-between text-xs text-[#78746A] gap-2">
              <span className="font-medium">Status classifications:</span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E3F5EC] border border-[#B7EBD0] px-2.5 py-0.5 text-xs font-medium text-[#008060]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#008060]" />
                  Active
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F1EC] border border-[#E7E4DC] px-2.5 py-0.5 text-xs font-medium text-[#5A5750]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#78746A]" />
                  Deactivated
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDECEC] border border-[#F8D7DA] px-2.5 py-0.5 text-xs font-medium text-[#B42318]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B42318]" />
                  Expired
                </span>
              </div>
            </div>

            {/* Gift Cards Table Structure with Empty State */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#E7E4DC] bg-[#FAF9F6] text-[#78746A]">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        disabled
                        aria-label="Select all gift cards"
                        className="h-4 w-4 rounded border-[#D4D0C5] text-charcoal-navy focus:ring-charcoal-navy opacity-60 cursor-not-allowed"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Code ending</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Recipient</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Current / Initial Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={7} className="p-12 sm:p-16 text-center">
                      <div className="mx-auto flex max-w-md flex-col items-center justify-center">
                        <GiftCardsIllustration className="h-32 w-44 sm:h-36 sm:w-48 mb-4" />
                        <h2 className="text-base sm:text-lg font-semibold text-charcoal-navy mb-1.5">
                          No gift cards issued yet
                        </h2>
                        <p className="text-xs sm:text-sm text-[#78746A] max-w-sm leading-relaxed mb-5">
                          Issue a gift card directly to a customer or start selling digital gift
                          card products in your store.
                        </p>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-lg bg-charcoal-navy px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#1A1916] transition shadow-xs cursor-pointer"
                        >
                          Create gift card
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Design */}
            <div className="flex flex-wrap items-center justify-between border-t border-[#E7E4DC] px-4 py-3 text-xs sm:text-sm text-[#78746A] gap-3">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  defaultValue="10"
                  className="h-8 rounded-lg border border-[#D4D0C5] bg-white px-2 text-xs text-charcoal-navy outline-none focus:border-charcoal-navy cursor-pointer"
                >
                  {[10, 25, 50, 100].map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span>0–0 of 0</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled
                    aria-label="Previous page"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4D0C5] bg-white text-charcoal-navy opacity-40 cursor-not-allowed"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    disabled
                    aria-label="Next page"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4D0C5] bg-white text-charcoal-navy opacity-40 cursor-not-allowed"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
