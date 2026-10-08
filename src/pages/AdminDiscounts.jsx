"use client";

import AdminSidebar from "../components/AdminSidebar";

export default function DiscountsPage() {
  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">

      <AdminSidebar />

      <main className="min-w-0 flex-1">

        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-[#F7F8FA] px-6 py-5">

          <div className="flex items-center gap-2">
            <span className="text-xl">
              ⚙
            </span>

            <h1 className="text-xl font-semibold text-[#161C2C]">
              Discounts
            </h1>
          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              className="rounded-lg bg-[#E5E5E5] px-4 py-2 text-sm font-medium text-[#161C2C]"
            >
              ⇧ Export
            </button>

            <button
              type="button"
              className="rounded-lg bg-[#161C2C] px-4 py-2 text-sm font-semibold text-white"
            >
              Create discount
            </button>

          </div>

        </header>


        {/* CONTENT */}
        <div className="p-5">

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

            {/* SEARCH / FILTER BAR */}
            <div className="flex h-14 items-center border-b border-slate-200">

              <button
                type="button"
                className="flex h-full items-center gap-2 px-5 text-sm font-medium text-[#161C2C]"
              >
                All
                <span>
                  ⌃
                </span>
              </button>

              <div className="flex flex-1 items-center gap-3 px-4">

                <span className="text-xl text-slate-500">
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="Search and filter"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                />

              </div>

              <button
                type="button"
                className="border-l border-slate-200 px-5 text-xl text-slate-500"
              >
                ▥
              </button>

            </div>


            {/* TABLE HEADER */}
            <div className="grid grid-cols-[34px_minmax(220px,2fr)_150px_150px_170px_190px_190px_70px] items-center border-b border-slate-200 bg-[#FAFAFA] px-4 py-3 text-sm font-medium text-slate-700">

              <div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                />
              </div>

              <div>
                Title
              </div>

              <div>
                Status
              </div>

              <div>
                Method
              </div>

              <div>
                Eligibility
              </div>

              <div>
                Type
              </div>

              <div>
                Combinations
              </div>

              <div>
                Used
              </div>

            </div>


            {/* EMPTY STRUCTURE */}
            <div className="min-h-[120px]" />

          </section>


          {/* LEARN MORE */}
          <div className="pt-8 text-center">

            <button
              type="button"
              className="text-sm font-medium text-[#161C2C] hover:underline"
            >
              Learn more about discounts
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}