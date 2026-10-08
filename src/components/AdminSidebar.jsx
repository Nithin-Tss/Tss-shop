
import { Link } from "react-router-dom";

const menuItems = [
  { icon: "⌂", label: "Home", href: "/admin/online-store/home" },
  { icon: "▣", label: "Orders", badge: "12", href: "/admin/online-store/orders" },
  { icon: "◇", label: "Products", href: "/admin/online-store/products" },
  { icon: "♙", label: "Catalogues", href: "/admin/online-store/catalogues" },
  { icon: "▥", label: "Inventory", href: "/admin/online-store/inventory" },
  { icon: "⌁", label: "Content", href: "/admin/online-store/content" },
  { icon: "▦", label: "Overview", href: "/admin/online-store/overview" },
  { icon: "▤", label: "Reports", href: "/admin/online-store/reports" },
  { icon: "▥", label: "Analytics", href: "/admin/online-store/analytics" },
  { icon: "✎", label: "Discounts", href: "/admin/online-store/discounts" },  
  { icon: "◉", label: "Shipping", href: "/admin/online-store/shipping" }, 
];

export default function AdminSidebar() {
  return (
    <aside className="hidden md:flex w-[256px] bg-[#161C2C] text-white flex-col">
      <nav className="px-4 py-6 space-y-1">

        {menuItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
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
          <Link
            to="/admin/online-store/themes"
            className="mt-1 h-11 rounded-lg px-4 flex items-center gap-4 hover:bg-white/10 transition"
          >
            <span className="text-lg">◉</span>

            <span className="text-sm font-medium">
              Themes
            </span>
          </Link>

          {/* PAGES */}
          <Link
            to="/admin/online-store/pages"
            className="h-11 px-4 flex items-center gap-4 hover:bg-white/10 transition"
          >
            <span className="text-lg">▤</span>

            <span className="text-sm">
              Pages
            </span>
          </Link>

          {/* BLOG */}
          <Link
            to="/admin/online-store/blog-posts"
            className="h-11 px-4 flex items-center gap-4 hover:bg-white/10 transition"
          >
            <span className="text-lg">✎</span>

            <span className="text-sm">
              Blog Posts
            </span>
          </Link>

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
      
      {/* SETTINGS */}

<div className="mt-auto px-4 pb-6">
  <Link
    to="/admin/settings"
    className="h-11 px-3 rounded-lg flex items-center gap-4 hover:bg-white/10 transition cursor-pointer"
  >
    <span className="w-5 text-center text-xl">
      ⚙
    </span>

    <span className="text-sm">
      Settings
    </span>
  </Link>
</div>
    </aside>
  );
}