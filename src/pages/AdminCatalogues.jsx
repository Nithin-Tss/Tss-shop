
import { useState } from "react";
import { Link } from "react-router-dom";

const menuItems = [
  { icon: "⌂", label: "Home", href: "/admin/online-store/home" },
  { icon: "▣", label: "Orders", href: "/admin/online-store/orders" },
  { icon: "◇", label: "Products", href: "/admin/online-store/products" },
  { icon: "♙", label: "Catalogues", href: "/admin/online-store/catalogues", active: true },
  { icon: "▥", label: "Inventory", href: "/admin/online-store/inventory" },
  { icon: "⌁", label: "Content", href: "/admin/online-store/content" },
];

export default function CataloguesPage() {
  // TODO: load the store's catalogues from the backend
  const [catalogues] = useState([]);

  // TODO: open the catalogue creation flow once it exists
  const handleCreateCatalogue = () => {};

  return (
    <div className="min-h-screen bg-white text-[#161C2C]">

      {/* HEADER */}
      <header className="h-[72px] border-b border-gray-200 flex items-center justify-between px-7">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#161C2C] flex items-center justify-center">
            <span className="text-white text-2xl font-bold">S</span>
          </div>

          <span className="text-[22px] font-bold">
            Store
          </span>
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center w-[420px] h-11 rounded-full bg-[#F3F6FA] px-5 gap-3">
          <span className="text-xl">⌕</span>

          <input
            type="text"
            placeholder="Search anything..."
            className="w-full bg-transparent outline-none text-sm text-[#161C2C] placeholder:text-slate-500"
          />
        </div>

        {/* Right */}
        <div className="flex items-center gap-6">

          <button className="relative text-2xl">
            ♧
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#161C2C] text-white flex items-center justify-center font-medium">
              A
            </div>

            <span className="text-sm font-medium">
              Admin
            </span>

            <span>⌄</span>
          </div>

        </div>
      </header>


      {/* BODY */}
      <div className="flex min-h-[calc(100vh-72px)]">

        {/* SIDEBAR */}
        <aside className="hidden md:flex w-[256px] bg-[#161C2C] text-white flex-col">

          <nav className="px-4 py-6 space-y-1">

            {menuItems.map((item) => {
              // Items with a page are links
              const Row = item.href ? Link : "div";

              return (
                <Row
                  key={item.label}
                  href={item.href}
                  className={`h-11 px-3 rounded-lg flex items-center justify-between transition ${
                    item.active ? "bg-[#30466F] font-medium" : "hover:bg-white/10"
                  }`}
                >

                  <div className="flex items-center gap-4">
                    <span className="w-5 text-center text-lg">
                      {item.icon}
                    </span>

                    <span className="text-sm">
                      {item.label}
                    </span>
                  </div>

                  {item.badge && (
                    <span className="bg-[#53627E] px-2.5 py-1 rounded-full text-xs">
                      {item.badge}
                    </span>
                  )}

                </Row>
              );
            })}


            {/* ONLINE STORE */}
            <div className="pt-5">

              <div className="h-11 px-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-lg">▣</span>

                  <span className="text-sm">
                    Online Store
                  </span>
                </div>

                <span>⌃</span>
              </div>


              {/* THEMES */}
              <Link
                to="/admin/online-store"
                className="mt-1 h-11 rounded-lg px-4 flex items-center gap-4 hover:bg-white/10 transition"
              >
                <span className="text-lg">◉</span>

                <span className="text-sm">
                  Themes
                </span>
              </Link>


              {/* PAGES */}
              <div className="h-11 px-4 flex items-center gap-4">
                <span className="text-lg">▤</span>

                <span className="text-sm">
                  Pages
                </span>
              </div>


              {/* BLOG */}
              <div className="h-11 px-4 flex items-center gap-4">
                <span className="text-lg">✎</span>

                <span className="text-sm">
                  Blog Posts
                </span>
              </div>

            </div>


            {/* APPS */}
            <div className="pt-5">

              <div className="h-11 px-3 flex items-center justify-between">

                <div className="flex items-center gap-4">
                  <span className="text-lg">◉</span>

                  <span className="text-sm">
                    Apps
                  </span>
                </div>

                <span>⌄</span>

              </div>

            </div>

          </nav>


          {/* SETTINGS */}
          <div className="mt-auto px-7 pb-8 flex items-center gap-4">
            <span className="text-xl">⚙</span>

            <span className="text-sm">
              Settings
            </span>
          </div>

        </aside>


        {/* MAIN CONTENT */}
        <main className="flex flex-1 flex-col bg-[#F7F8FA] px-6 lg:px-8 py-6 overflow-hidden">

          {/* TITLE */}
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#161C2C]">
            <span className="text-xl">♙</span>
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
