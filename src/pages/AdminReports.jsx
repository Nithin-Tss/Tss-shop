
import AdminSidebar from "@/components/AdminSidebar";

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">

      <AdminSidebar />

      <main className="min-w-0 flex-1">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

          <div>
            <h1 className="text-xl font-semibold text-[#161C2C]">
              Reports
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View and manage your store reports
            </p>
          </div>

          <div className="flex gap-2">

            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#161C2C]">
              Export
            </button>

            <button className="rounded-lg bg-[#161C2C] px-4 py-2 text-sm font-semibold text-white">
              Create report
            </button>

          </div>

        </header>

        {/* Content */}
        <div className="p-5">

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* Search / Filter */}
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 p-4">

              <button className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-[#161C2C]">
                All reports ⌄
              </button>

              <div className="flex flex-1 items-center gap-2">

                <span className="text-lg text-slate-500">
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="Search reports..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />

              </div>

            </div>

            {/* Empty State */}
            <div className="flex min-h-[450px] items-center justify-center p-10">

              <div className="text-center">

                <div className="text-5xl text-slate-300">
                  ▤
                </div>

                <h2 className="mt-4 text-xl font-semibold text-[#161C2C]">
                  No reports found
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Reports will appear here when data is available.
                </p>

              </div>

            </div>

          </section>

        </div>

      </main>
    </div>
  );
}