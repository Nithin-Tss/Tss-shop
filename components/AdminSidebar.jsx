"use client";

import Link from "next/link";

const menuItems = [
  { icon: "⌂", label: "Home", href: "/admin/online-store/home" },
  { icon: "▣", label: "Orders", badge: "12", href: "/admin/online-store/orders" },
  { icon: "◇", label: "Products", href: "/admin/online-store/products" },
  { icon: "♙", label: "Catalogues", href: "/admin/online-store/catalogues" },
  { icon: "▥", label: "Inventory", href: "/admin/online-store/inventory" },
  { icon: "⌁", label: "Content", href: "/admin/online-store/content" },
];

export default function AdminSidebar() {
  return (
    <aside className="hidden md:flex w-[256px] bg-[#161C2C] text-white flex-col">
      <nav className="px-4 py-6 space-y-1">

        {menuItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="h-11 px-3 rounded-lg flex items-center justify-between hover:bg-white/10 transition"
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
          </Link>
        ))}

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
          <div className="mt-1 h-11 rounded-lg bg-[#30466F] px-4 flex items-center gap-4">
            <span className="text-lg">◉</span>

            <span className="text-sm font-medium">
              Themes
            </span>
          </div>

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
  );
}