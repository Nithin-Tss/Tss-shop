import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const BASE = "/admin/online-store";

// `match` lists the route prefixes that count as "this item" (e.g. /customers/new -> Customers)
const menuItems = [
  { icon: "⌂", label: "Home", href: `${BASE}/home` },
  {
    icon: "▣",
    label: "Orders",
    badge: "12",
    href: `${BASE}/orders`,
    children: [{ label: "Drafts", href: `${BASE}/orders/drafts` }],
  },
  {
    icon: "◇",
    label: "Products",
    href: `${BASE}/products`,
    match: [`${BASE}/products`, `${BASE}/collections`],
    children: [{ label: "Collections", href: `${BASE}/collections` }],
  },
  { icon: "👤", label: "Customers", href: `${BASE}/customers` },
  { icon: "♙", label: "Catalogues", href: `${BASE}/catalogues` },
  { icon: "▥", label: "Inventory", href: `${BASE}/inventory` },
  { icon: "⌁", label: "Content", href: `${BASE}/content` },
  { icon: "▦", label: "Overview", href: `${BASE}/overview` },
  { icon: "▤", label: "Reports", href: `${BASE}/reports` },
  { icon: "▥", label: "Analytics", href: `${BASE}/analytics` },
  { icon: "▥", label: "Discounts", href: `${BASE}/discounts` },
  { icon: "▥", label: "Shipping", href: `${BASE}/shipping` },
];

// Pages and Blog Posts have no admin screens yet, so they aren't links
const onlineStoreItems = [
  { icon: "◉", label: "Themes", href: BASE, exact: true },
  { icon: "▤", label: "Pages" },
  { icon: "✎", label: "Blog Posts" },
];

const isUnder = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);

function matches(path, item) {
  if (!item.href) return false;
  if (item.exact) return path === item.href;
  return (item.match || [item.href]).some((prefix) => isUnder(path, prefix));
}

const rowClass = (active) =>
  `h-11 px-3 rounded-lg flex items-center justify-between transition ${
    active ? "bg-[#30466F] font-medium text-white" : "text-slate-200 hover:bg-white/10"
  }`;

const subRowClass = (active) =>
  `h-9 px-3 rounded-md flex items-center text-sm transition ${
    active ? "bg-white/20 text-white font-semibold" : "text-slate-300 hover:text-white hover:bg-white/10"
  }`;

function Chevron({ open, onClick }) {
  return (
    <button
      type="button"
      aria-label={open ? "Collapse" : "Expand"}
      aria-expanded={open}
      onClick={onClick}
      className="p-1 hover:bg-white/10 rounded cursor-pointer"
    >
      <span className={`text-xs block transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}>⌄</span>
    </button>
  );
}

function MenuItem({ item, path }) {
  const childActive = (item.children || []).some((child) => isUnder(path, child.href));
  const active = matches(path, item);
  const [open, setOpen] = useState(childActive);

  return (
    <div className="space-y-1">
      <div className={rowClass(active)}>
        <Link to={item.href} aria-current={active ? "page" : undefined} className="flex items-center gap-4 flex-1 h-full">
          <span className="w-5 text-center text-lg">{item.icon}</span>
          <span className="text-sm">{item.label}</span>
        </Link>

        <div className="flex items-center gap-1.5">
          {item.badge && <span className="bg-[#53627E] px-2 py-0.5 rounded-full text-xs">{item.badge}</span>}
          {item.children && <Chevron open={open} onClick={() => setOpen((v) => !v)} />}
        </div>
      </div>

      {item.children && open && (
        <div className="pl-9 pr-2 space-y-1">
          {item.children.map((child) => (
            <Link key={child.href} to={child.href} className={subRowClass(isUnder(path, child.href))}>
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSidebar() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, "") || "/";

  const onlineStoreActive = onlineStoreItems.some((item) => matches(path, item));
  const [onlineStoreOpen, setOnlineStoreOpen] = useState(true);
  const [appsOpen, setAppsOpen] = useState(false);
  const settingsActive = isUnder(path, `${BASE}/settings`);

  return (
    <aside className="hidden md:block w-[256px] shrink-0 bg-[#141b2d] text-white select-none">
      {/* Stays in view below the 72px header while long pages scroll */}
      <div className="sticky top-[72px] flex h-[calc(100vh-72px)] flex-col">
        <nav className="px-4 py-6 space-y-1 overflow-y-auto flex-1">
          {menuItems.map((item) => (
            <MenuItem key={item.label} item={item} path={path} />
          ))}

          {/* ONLINE STORE */}
          <div className="pt-5 space-y-1">
            <div className={rowClass(false)}>
              <span className={`flex items-center gap-4 ${onlineStoreActive ? "text-white font-medium" : ""}`}>
                <span className="w-5 text-center text-lg">▣</span>
                <span className="text-sm">Online Store</span>
              </span>
              <Chevron open={onlineStoreOpen} onClick={() => setOnlineStoreOpen((v) => !v)} />
            </div>

            {onlineStoreOpen &&
              onlineStoreItems.map((item) => {
                const content = (
                  <span className="flex items-center gap-4">
                    <span className="w-5 text-center text-lg">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </span>
                );

                return item.href ? (
                  <Link key={item.label} to={item.href} className={rowClass(matches(path, item))}>
                    {content}
                  </Link>
                ) : (
                  <div key={item.label} title="Coming soon" className={`${rowClass(false)} cursor-default hover:bg-transparent`}>
                    {content}
                  </div>
                );
              })}
          </div>

          {/* APPS */}
          <div className="pt-5">
            <div className={rowClass(false)}>
              <span className="flex items-center gap-4">
                <span className="w-5 text-center text-lg">◉</span>
                <span className="text-sm">Apps</span>
              </span>
              <Chevron open={appsOpen} onClick={() => setAppsOpen((v) => !v)} />
            </div>
            {appsOpen && <p className="pl-12 pr-3 py-2 text-xs text-slate-400">No apps installed yet.</p>}
          </div>
        </nav>

        {/* SETTINGS */}
        <div className="px-4 pb-6 pt-2">
          <Link
            to={`${BASE}/settings`}
            aria-current={settingsActive ? "page" : undefined}
            className={`${rowClass(settingsActive)} justify-start gap-4`}
          >
            <span className="w-5 text-center text-xl">⚙</span>
            <span className="text-sm">Settings</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}


// Top bar shown on every admin page, above the sidebar (72px tall; the sidebar is pinned below it)
export function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 sm:px-7 text-[#161C2C]">
      <Link to={`${BASE}/home`} className="flex shrink-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#141b2d]">
          <span className="text-2xl font-bold text-white">S</span>
        </div>
        <span className="text-[22px] font-bold">Store</span>
      </Link>

      <div className="hidden md:flex h-11 w-[420px] items-center gap-3 rounded-full bg-[#F3F6FA] px-5">
        <span className="text-xl text-slate-500">⌕</span>
        <input
          type="text"
          placeholder="Search anything..."
          className="w-full bg-transparent text-sm text-[#161C2C] outline-none placeholder:text-slate-500"
        />
      </div>

      <div className="flex shrink-0 items-center gap-6">
        <button type="button" aria-label="Notifications" className="relative text-2xl">
          ♧
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#141b2d] font-medium text-white">A</div>
          <span className="hidden sm:inline text-sm font-medium">Admin</span>
          <span>⌄</span>
        </div>
      </div>
    </header>
  );
}
