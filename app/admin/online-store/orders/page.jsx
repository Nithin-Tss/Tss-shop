"use client";

import Link from "next/link";

const menuItems = [
  { icon: "⌂", label: "Home", href: "/admin/online-store/home" },
  { icon: "▣", label: "Orders", badge: "12", href: "/admin/online-store/orders", active: true },
  { icon: "◇", label: "Products" },
  { icon: "♙", label: "Catalogues" },
  { icon: "▥", label: "Inventory" },
  { icon: "⌁", label: "Content" },
];

export default function OrdersPage() {
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
                <div key={item.label}>
                  <Row
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

                  {/* Drafts sub-item under Orders */}
                  {item.active && (
                    <div className="h-9 pl-12 flex items-center text-sm text-white/70 hover:text-white transition">
                      Drafts
                    </div>
                  )}
                </div>
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
                href="/admin/online-store"
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

          {/* TITLE */}
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-[#161C2C]">
              <span className="text-xl">▣</span>
              Orders
            </h1>

            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-[#E9EDF2] px-4 py-2 text-sm font-medium text-[#161C2C] hover:bg-[#DDE3EA] transition"
            >
              More actions
              <span>⌄</span>
            </button>
          </div>


          {/* EMPTY STATE CARD */}
          <section className="mt-5 rounded-2xl border border-[#E3E7ED] bg-white px-6 py-16 shadow-sm">
            <div className="flex flex-col items-center text-center">

              {/* Illustration */}
              <div className="relative h-[170px] w-[170px] overflow-hidden rounded-full bg-[#EEF1F6]">
                <div className="absolute bottom-0 left-0 right-0 h-[46px] bg-[#161C2C]" />

                <div className="absolute left-1/2 top-6 h-[125px] w-[110px] -translate-x-1/2 rounded-md border border-[#E3E7ED] bg-white p-3 shadow-sm">
                  <div className="h-1.5 w-8 rounded-full bg-[#30466F]" />

                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-[#E9EEF5]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-1.5 rounded-full bg-[#E6EBF2]" />
                      <div className="h-1.5 w-2/3 rounded-full bg-[#E6EBF2]" />
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-[#E9EEF5]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-1.5 rounded-full bg-[#E6EBF2]" />
                      <div className="h-1.5 w-2/3 rounded-full bg-[#E6EBF2]" />
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="mt-8 text-lg font-semibold text-[#161C2C]">
                Your orders will show here
              </h2>

              <p className="mt-2 max-w-[440px] text-sm leading-6 text-[#53627E]">
                To get orders and accept payments from customers, you need to
                select a plan.
              </p>

              <button
                type="button"
                className="mt-5 rounded-lg bg-[#161C2C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#252E45] transition"
              >
                Select plan
              </button>

            </div>
          </section>


          {/* LEARN MORE */}
          <p className="mt-8 text-center text-sm font-medium text-[#161C2C]">
            <a href="#" className="hover:underline">
              Learn more about orders
            </a>
          </p>

        </main>

      </div>

    </div>
  );
}
