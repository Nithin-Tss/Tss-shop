
import { Link } from "react-router-dom";

const menuItems = [
  { icon: "⌂", label: "Home", href: "/admin/online-store/home" },
  { icon: "▣", label: "Orders",  href: "/admin/online-store/orders" },
  { icon: "◇", label: "Products", href: "/admin/online-store/products" },
  { icon: "♙", label: "Catalogues", href: "/admin/online-store/catalogues" },
  { icon: "▥", label: "Inventory", href: "/admin/online-store/inventory" },
  { icon: "⌁", label: "Content", href: "/admin/online-store/content", active: true },
];

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
        <main className="flex-1 bg-[#F7F8FA] px-6 lg:px-8 py-6 overflow-hidden">

          {/* TITLE + ACTIONS */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#161C2C]">
              <span className="text-xl">⌁</span>
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
