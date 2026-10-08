"use client";

import AdminSidebar from "../../../../components/AdminSidebar";

export default function OverviewPage() {
  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">

      <AdminSidebar />

      <main className="min-w-0 flex-1">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold text-[#161C2C]">
              Overview
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Store overview and performance summary
            </p>
          </div>

          <button className="rounded-lg bg-[#161C2C] px-4 py-2 text-sm font-semibold text-white">
            View reports
          </button>
        </header>

        {/* Content */}
        <div className="p-5">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

            <OverviewCard title="Total sales" />
            <OverviewCard title="Orders" />
            <OverviewCard title="Customers" />
            <OverviewCard title="Products" />

          </div>

          {/* Main Sections */}
          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">

            {/* Sales Overview */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <h2 className="font-semibold text-[#161C2C]">
                Sales overview
              </h2>

              <div className="mt-5 flex h-72 items-center justify-center rounded-xl bg-slate-50">

                <p className="text-sm text-slate-500">
                  No sales data available
                </p>

              </div>

            </section>

            {/* Recent Activity */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <h2 className="font-semibold text-[#161C2C]">
                Recent activity
              </h2>

              <div className="mt-5 flex h-72 items-center justify-center rounded-xl bg-slate-50">

                <p className="text-sm text-slate-500">
                  No activity available
                </p>

              </div>

            </section>

          </div>

        </div>

      </main>
    </div>
  );
}

function OverviewCard({ title }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <p className="text-sm font-medium text-slate-600">
        {title}
      </p>

      <p className="mt-3 text-2xl font-bold text-[#161C2C]">
        —
      </p>

      <div className="mt-5 h-[2px] bg-sky-400" />

    </section>
  );
}