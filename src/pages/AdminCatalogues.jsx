import { useState } from "react";
import AdminSidebar, { AdminHeader, PageIcon } from "@/components/AdminSidebar";

export default function CataloguesPage() {
  // TODO: load the store's catalogues from the backend
  const [catalogues] = useState([]);

  // TODO: open the catalogue creation flow once it exists
  const handleCreateCatalogue = () => {};

  return (
    <div className="min-h-screen bg-white text-[#161C2C]">

      <AdminHeader />


      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">

        {/* SIDEBAR */}
        <AdminSidebar />


        {/* MAIN CONTENT */}
        <main className="flex flex-1 flex-col bg-[#F7F8FA] px-6 lg:px-8 py-6 overflow-hidden">

          {/* TITLE */}
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#161C2C]">
            <PageIcon name="catalogues" />
            Catalogues
          </h1>


          {/* EMPTY STATE (shown while there are no catalogues) */}
          {catalogues.length === 0 && (
            <section
              aria-labelledby="catalogues-empty-heading"
              className="mt-5 flex flex-1 flex-col items-center justify-center rounded-2xl border border-[#D8DFE8]/80 bg-white px-6 py-14 text-center shadow-[0_1px_3px_rgba(22,28,44,0.05)] sm:py-16"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7F8FA] text-[#161C2C] ring-1 ring-[#D8DFE8]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-8 w-8"
                >
                  <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5Z" />
                  <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 0 1.5-1.5Z" />
                  <path d="M11 19c0 .8.9 1 1 1s1-.2 1-1" />
                  <path d="M6.5 8h2M6.5 11h2M15.5 8h2M15.5 11h2" />
                </svg>
              </span>

              <h2 id="catalogues-empty-heading" className="mt-5 text-xl font-semibold text-[#161C2C]">
                No catalogues yet
              </h2>

              <p className="mt-1.5 max-w-[380px] text-sm text-[#53627E]">
                Create your first catalogue to organize and showcase your products.
              </p>

              <button
                type="button"
                onClick={handleCreateCatalogue}
                className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#161C2C] px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(22,28,44,0.25)] hover:bg-[#252E45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161C2C]/40 focus-visible:ring-offset-2 transition"
              >
                <span className="text-base leading-none">+</span>
                Create Catalogue
              </button>
            </section>
          )}

        </main>

      </div>

    </div>
  );
}
