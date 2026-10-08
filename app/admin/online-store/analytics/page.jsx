"use client";

import AdminSidebar from "../../../../components/AdminSidebar";

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <AdminSidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-[#161C2C]">
              Analytics
            </h1>

            <p className="text-sm text-slate-500">
              Last refreshed: —
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm">
              ⋯
            </button>

            <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm">
              Try targets ⌄
            </button>

            <button className="rounded-full bg-[#161C2C] px-5 py-2 text-sm font-semibold text-white">
              New exploration
            </button>
          </div>
        </header>

        <div className="p-5">
          <div className="rounded-2xl bg-cyan-50 px-5 py-4 text-sm text-cyan-800">
            Analytics provides insights into your store performance.

            <button className="ml-2 underline">
              Learn more
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="rounded-full bg-slate-100 px-4 py-2 text-sm">
              Today ⌄
            </button>

            <button className="rounded-full bg-slate-100 px-4 py-2 text-sm">
              Date ⌄
            </button>

            <button className="rounded-full bg-slate-100 px-4 py-2 text-sm">
              ₹ INR
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Gross sales" />
            <MetricCard title="Returning customer rate" />
            <MetricCard title="Orders fulfilled" />
            <MetricCard title="Orders" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-base font-semibold">
                Total sales
              </h2>

              <div className="mt-5 flex h-[380px] items-center justify-center rounded-xl bg-slate-50">
                <div className="text-center">
                  <div className="text-5xl text-slate-300">
                    ◇
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    No sales data available
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-base font-semibold underline decoration-dotted">
                Total sales breakdown
              </h2>

              <div className="mt-5 space-y-2">
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

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <EmptyCard title="Total sales by sales channel" />
            <EmptyCard title="Total sales by product" />
            <EmptyCard title="Customer activity" />
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ title }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold underline decoration-dotted">
        {title}
      </h2>

      <p className="mt-3 text-2xl font-bold">
        —
      </p>

      <div className="mt-5 h-[2px] bg-sky-400" />
    </div>
  );
}

function BreakdownRow({ label }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-3 even:bg-slate-50">
      <span className="text-sm text-blue-600">
        {label}
      </span>

      <span className="text-sm font-semibold">
        —
      </span>
    </div>
  );
}

function EmptyCard({ title }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold underline decoration-dotted">
        {title}
      </h2>

      <div className="flex h-40 items-center justify-center">
        <span className="text-sm text-slate-500">
          No data available
        </span>
      </div>
    </div>
  );
}