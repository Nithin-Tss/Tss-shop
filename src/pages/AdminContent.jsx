import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";

const lineIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export default function ContentPage() {
  return (
    <div className="min-h-screen bg-white text-[#161C2C]">

      <AdminHeader />


      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">

        {/* SIDEBAR */}
        <AdminSidebar />


        {/* MAIN CONTENT */}
        <main className="flex-1 bg-[#F7F8FA] px-6 lg:px-8 py-6 overflow-hidden">

          {/* TITLE + ACTIONS */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#161C2C]">
              <PageIcon name="content" />
              Metaobjects
            </h1>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg bg-[#E9EDF2] px-4 py-2 text-sm font-medium text-[#161C2C] hover:bg-[#DDE3EA] transition"
              >
                Manage
              </button>

              <button
                type="button"
                className="rounded-lg bg-[#161C2C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#252E45] transition"
              >
                Add definition
              </button>
            </div>
          </div>


          {/* DEFINITIONS CARD */}
          <section className="mt-5 overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white shadow-sm">

            {/* Toolbar */}
            <div className="flex items-center gap-3 border-b border-[#E3E7ED] px-4 py-3">
              <button
                type="button"
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#161C2C] hover:bg-[#F3F6FA] transition"
              >
                Custom
                <svg {...lineIcon} className="h-4 w-4 text-[#53627E]">
                  <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
                </svg>
              </button>

              <div className="flex flex-1 items-center gap-2">
                <svg {...lineIcon} className="h-4 w-4 shrink-0 text-[#53627E]">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-4-4" />
                </svg>

                <input
                  type="text"
                  placeholder="Searching in metaobject definitions..."
                  className="w-full bg-transparent text-sm text-[#161C2C] outline-none placeholder:text-slate-500"
                />
              </div>

              <div className="flex shrink-0 items-center gap-1 border-l border-[#E3E7ED] pl-3">
                <button
                  type="button"
                  aria-label="Columns"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#53627E] hover:bg-[#F3F6FA] hover:text-[#161C2C] transition"
                >
                  <svg {...lineIcon} className="h-[18px] w-[18px]">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M9 4v16M15 4v16" />
                  </svg>
                </button>

                <button
                  type="button"
                  aria-label="View"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#53627E] hover:bg-[#F3F6FA] hover:text-[#161C2C] transition"
                >
                  <svg {...lineIcon} className="h-[18px] w-[18px]">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>


            {/* Empty state */}
            <div className="px-6 py-12 text-center">
              <h2 className="text-xl font-semibold text-[#161C2C]">
                No definitions found
              </h2>

              <p className="mt-3 text-sm text-[#53627E]">
                Try changing the filters or search term
              </p>
            </div>

          </section>


          {/* LEARN MORE */}
          <p className="mt-8 text-center text-sm font-medium text-[#161C2C]">
            <a href="#" className="hover:underline">
              Learn more about metaobjects
            </a>
          </p>

        </main>

      </div>

    </div>
  );
}
