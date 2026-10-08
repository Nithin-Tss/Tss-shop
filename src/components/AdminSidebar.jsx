import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const menuItems = [
  { icon: "⌂", label: "Home", href: "/admin/online-store/home" },
  { icon: "▣", label: "Orders", badge: "12", href: "/admin/online-store/orders" },
  { icon: "◇", label: "Products", href: "/admin/online-store/products", hasSubmenu: true },
  { icon: "♙", label: "Catalogues", href: "/admin/online-store/catalogues" },
  { icon: "▥", label: "Inventory", href: "/admin/online-store/inventory" },
  { icon: "⌁", label: "Content", href: "/admin/online-store/content" },
  { icon: "▦", label: "Overview", href: "/admin/online-store/overview" },
  { icon: "▤", label: "Reports", href: "/admin/online-store/reports" },
  { icon: "▥", label: "Analytics", href: "/admin/online-store/analytics" },
  { icon: "▥", label: "Discounts", href: "/admin/online-store/discounts" },
  { icon: "▥", label: "Shipping", href: "/admin/online-store/shipping" },
];

export default function AdminSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isCollectionsActive = currentPath.startsWith("/admin/online-store/collections");
  const isProductsActive = currentPath === "/admin/online-store/products" || isCollectionsActive;

  const [productsOpen, setProductsOpen] = useState(isCollectionsActive);

  return (
    <aside className="hidden md:flex w-[256px] bg-[#161C2C] text-white flex-col shrink-0 min-h-[calc(100vh-72px)] select-none">
      <nav className="px-4 py-6 space-y-1 overflow-y-auto flex-1">
        {menuItems.map((item) => {
          const isActive = currentPath === item.href;

          if (item.hasSubmenu) {
            return (
              <div key={item.label} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setProductsOpen((prev) => !prev)}
                  className={`w-full h-11 px-3 rounded-lg flex items-center justify-between transition cursor-pointer ${
                    isActive || isProductsActive
                      ? "bg-[#30466F] font-medium text-white"
                      : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="w-5 text-center text-lg">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <span
                    className={`text-xs transition-transform duration-200 ${
                      productsOpen ? "rotate-0" : "-rotate-90"
                    }`}
                  >
                    ⌄
                  </span>
                </button>

                {/* COLLECTIONS SUB-ITEM */}
                {productsOpen && (
                  <div className="pl-9 pr-2">
                    <Link
                      to="/admin/online-store/collections"
                      className={`h-9 px-3 rounded-md flex items-center text-sm transition ${
                        isCollectionsActive
                          ? "bg-white/20 text-white font-semibold"
                          : "text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      Collections
                    </Link>
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.href}
              className={`h-11 px-3 rounded-lg flex items-center justify-between transition ${
                isActive ? "bg-[#30466F] font-medium" : "hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="w-5 text-center text-lg">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </div>

              {item.badge && (
                <span className="bg-[#53627E] px-2.5 py-1 rounded-full text-xs">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* ONLINE STORE */}
        <div className="pt-5">
          <div className="h-11 px-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-lg">▣</span>
              <span className="text-sm">Online Store</span>
            </div>
            <span>⌃</span>
          </div>

          {/* THEMES */}
          <Link
            to="/admin/online-store/themes"
            className="mt-1 h-11 rounded-lg px-4 flex items-center gap-4 hover:bg-white/10 transition"
          >
            <span className="text-lg">◉</span>
            <span className="text-sm font-medium">Themes</span>
          </Link>

          {/* PAGES */}
          <Link
            to="/admin/online-store/pages"
            className="h-11 px-4 flex items-center gap-4 hover:bg-white/10 transition"
          >
            <span className="text-lg">▤</span>
            <span className="text-sm">Pages</span>
          </Link>

          {/* BLOG */}
          <Link
            to="/admin/online-store/blog-posts"
            className="h-11 px-4 flex items-center gap-4 hover:bg-white/10 transition"
          >
            <span className="text-lg">✎</span>
            <span className="text-sm">Blog Posts</span>
          </Link>
        </div>

        {/* APPS */}
        <div className="pt-5">
          <div className="h-11 px-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-lg">◉</span>
              <span className="text-sm">Apps</span>
            </div>
            <span>⌄</span>
          </div>
        </div>
      </nav>

      {/* SETTINGS */}
            {/* SETTINGS */}
      <div className="mt-auto px-7 pb-8">
        <Link
          to="/admin/online-store/settings"
          className="flex items-center gap-4 h-11 px-3 rounded-lg hover:bg-white/10 transition"
        >
          <span className="text-xl">⚙</span>
          <span className="text-sm">Settings</span>
        </Link>
      </div>
    </aside>
  );
}