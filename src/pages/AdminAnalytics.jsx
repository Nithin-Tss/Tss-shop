
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";

const lineIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

const card =
  "rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_2px_rgba(20,27,45,0.04)] transition-shadow duration-200 hover:shadow-[0_4px_14px_-6px_rgba(20,27,45,0.12)]";

const cardHeading = "text-sm font-semibold text-[#141b2d]";

const outlineButton =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3.5 text-sm font-medium text-[#141b2d] transition-colors duration-200 hover:border-[#141b2d] hover:bg-[#f1f3f7]";

const chip =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 text-[13px] font-medium text-[#141b2d] transition-colors duration-200 hover:border-[#141b2d] hover:bg-[#f1f3f7]";

function Chevron() {
  return (
    <svg {...lineIcon} className="h-3.5 w-3.5 text-[#53627E]">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg {...lineIcon} className="h-6 w-6 text-[#A3ADBF]">
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#141b2d]">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-72px)]">
      <AdminSidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <header className="border-b border-[#e5e7eb] bg-white">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2.5 text-xl font-semibold text-[#141b2d]">
                <PageIcon name="analytics" />
                Analytics
              </h1>

              <p className="mt-0.5 text-[13px] text-[#53627E]">
                Last refreshed: —
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" aria-label="More actions" className={`${outlineButton} w-9 justify-center px-0`}>
                ⋯
              </button>

              <button type="button" className={outlineButton}>
                Try targets <Chevron />
              </button>

              <button
                type="button"
                className="inline-flex h-9 items-center rounded-lg bg-[#141b2d] px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#252E45]"
              >
                New exploration
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6">
          <div className="rounded-xl bg-[#f1f3f7] px-4 py-3 text-[13px] text-[#141b2d]">
            Analytics provides insights into your store performance.

            <button type="button" className="ml-1.5 font-semibold text-[#141b2d] hover:underline">
              Learn more
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={chip}>
              Today <Chevron />
            </button>

            <button type="button" className={chip}>
              Date <Chevron />
            </button>

            <button type="button" className={chip}>
              ₹ INR
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Gross sales" />
            <MetricCard title="Returning customer rate" />
            <MetricCard title="Orders fulfilled" />
            <MetricCard title="Orders" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section className={card}>
              <h2 className={cardHeading}>
                Total sales
              </h2>

              <div className="mt-4 flex h-[340px] items-center justify-center rounded-lg bg-[#f7f8fa]">
                <div className="flex flex-col items-center text-center">
                  <EmptyIcon />

                  <p className="mt-2 text-[13px] text-[#53627E]">
                    No sales data available
                  </p>
                </div>
              </div>
            </section>

            <section className={card}>
              <h2 className={cardHeading}>
                Total sales breakdown
              </h2>

              <div className="mt-3 divide-y divide-[#eef0f4]">
                <BreakdownRow label="Gross sales" />
                <BreakdownRow label="Discounts" />
                <BreakdownRow label="Sales reversals" />
                <BreakdownRow label="Net sales" />
                <BreakdownRow label="Shipping charges" />
                <BreakdownRow label="Return fees" />
                <BreakdownRow label="Taxes" />
                <BreakdownRow label="Total sales" />
              </div>
            </section>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <EmptyCard title="Total sales by sales channel" />
            <EmptyCard title="Total sales by product" />
            <EmptyCard title="Customer activity" />
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}

function MetricCard({ title }) {
  return (
    <div className={card}>
      <h2 className={cardHeading}>
        {title}
      </h2>

      <p className="mt-2 text-2xl font-bold text-[#141b2d]">
        —
      </p>

      <div className="mt-4 h-px bg-[#e5e7eb]" />
    </div>
  );
}

function BreakdownRow({ label }) {
  return (
    <div className="flex h-11 items-center justify-between px-1">
      <span className="text-sm text-[#141b2d]">
        {label}
      </span>

      <span className="text-sm font-semibold text-[#141b2d]">
        —
      </span>
    </div>
  );
}

function EmptyCard({ title }) {
  return (
    <div className={card}>
      <h2 className={cardHeading}>
        {title}
      </h2>

      <div className="mt-4 flex h-36 flex-col items-center justify-center rounded-lg bg-[#f7f8fa]">
        <EmptyIcon />

        <span className="mt-2 text-[13px] text-[#53627E]">
          No data available
        </span>
      </div>
    </div>
  );
}
