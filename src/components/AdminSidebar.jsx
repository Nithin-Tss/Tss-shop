import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  apiDelete,
  apiGet,
  apiRequest,
  forgetAdminReturn,
  logout as endSession,
  restoreAdminScroll,
} from "@/lib/api";
import {
  ONBOARDING_PATH,
  can,
  getActiveStore,
  setActiveStore,
  setStores,
  storeCan,
  useSession,
} from "@/lib/auth";

const BASE = "/admin/online-store";

// Line icons (shapes from the Lucide set, ISC licence), all drawn at one size, stroke and colour.
// Exported so page titles, breadcrumbs and empty states use the exact same icon as the sidebar item.
export const navIcons = {
  home: (
    <>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  orders: (
    <>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  products: (
    <>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" />
    </>
  ),
  customers: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  catalogues: (
    <>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </>
  ),
  inventory: (
    <>
      <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
      <path d="M12 22V12" />
      <path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" />
      <path d="m7.5 4.27 9 5.15" />
    </>
  ),
  content: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8M16 13H8M16 17H8" />
    </>
  ),
  overview: (
    <>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </>
  ),
  reports: (
    <>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </>
  ),
  analytics: (
    <>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </>
  ),
  discounts: (
    <>
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m15 9-6 6M9 9h.01M15 15h.01" />
    </>
  ),
  shipping: (
    <>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </>
  ),
  store: (
    <>
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" />
    </>
  ),
  themes: (
    <>
      <circle cx="13.5" cy="6.5" r="1" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="1" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r="1" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </>
  ),
  pages: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </>
  ),
  blog: (
    <>
      <path d="M12 20h9" />
      <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
    </>
  ),
  apps: (
    <>
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3" />
    </>
  ),
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  menus: (
    <>
      <rect width="18" height="14" x="3" y="5" rx="2" />
      <line x1="7" y1="9" x2="17" y2="9" />
      <line x1="7" y1="13" x2="13" y2="13" />
    </>
  ),
  location: (
    <>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
};

export function NavIcon({ name, className = "h-[18px] w-[18px]" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {navIcons[name]}
    </svg>
  );
}

// The same icon next to a page title: 22px, in the title's own colour
export function PageIcon({ name }) {
  return <NavIcon name={name} className="h-[22px] w-[22px]" />;
}

// Grouped under small section labels; order and routes are unchanged.
// `match` lists the route prefixes that count as "this item" (e.g. /customers/new -> Customers)
// `permission`: hidden unless the user's role in the store allows it (see can() in lib/auth.js)
const menuGroups = [
  {
    label: "Main",
    items: [
      { icon: "home", label: "Home", href: `${BASE}/home` },
      {
        icon: "orders",
        label: "Orders",
        href: `${BASE}/orders`,
        permission: "orders.view",
        children: [
          { label: "Drafts", href: `${BASE}/orders/drafts`, permission: "draft_orders.view" },
          { label: "Abandoned checkouts", href: `${BASE}/orders/abandoned-checkouts` },
        ],
      },
      {
        icon: "products",
        label: "Products",
        href: `${BASE}/products`,
        match: [`${BASE}/products`, `${BASE}/collections`],
        permission: "products.view",
        children: [{ label: "Collections", href: `${BASE}/collections` }],
      },
      {
        icon: "customers",
        label: "Customers",
        href: `${BASE}/customers`,
        permission: "customers.view",
      },
    ],
  },
  {
    label: "Store",
    items: [
      {
        icon: "catalogues",
        label: "Catalogues",
        href: `${BASE}/catalogues`,
        permission: "products.view",
      },
      {
        icon: "inventory",
        label: "Inventory",
        href: `${BASE}/inventory`,
        permission: "inventory.view",
      },
      {
        icon: "content",
        label: "Content",
        href: `${BASE}/content`,
        match: [`${BASE}/content`, `${BASE}/menus`],
        children: [{ label: "Menus", href: `${BASE}/content/menus` }],
      },
    ],
  },
  {
    label: "Insights",
    items: [
      { icon: "overview", label: "Overview", href: `${BASE}/overview`, permission: "reports.view" },
      { icon: "reports", label: "Reports", href: `${BASE}/reports`, permission: "reports.view" },
      {
        icon: "analytics",
        label: "Analytics",
        href: `${BASE}/analytics`,
        permission: "reports.view",
      },
    ],
  },
  {
    label: "Marketing & delivery",
    items: [
      {
        icon: "discounts",
        label: "Discounts",
        href: `${BASE}/discounts`,
        permission: "discounts.view",
      },
      {
        icon: "shipping",
        label: "Shipping",
        href: `${BASE}/shipping`,
        permission: "shipping.view",
      },
    ],
  },
];

const onlineStoreItems = [
  { icon: "pages", label: "Pages", href: `${BASE}/pages`, permission: "themes.manage" },
  { icon: "blog", label: "Blog Posts", href: `${BASE}/blog-posts`, permission: "themes.manage" },
];

const isUnder = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);

function matches(path, item) {
  if (!item.href) return false;
  if (item.exact) return path === item.href;
  return (item.match || [item.href]).some((prefix) => isUnder(path, prefix));
}

// Dark rail, like the Shopify admin: a near-black surface, soft grey text, and an inset "pill" on the active row.
// Rows carry `group-data-[collapsed=true]/nav:` variants so the same markup works as a full sidebar or an icon rail.

// One row style for every item: 40px tall, icon + label on the same vertical line
const rowClass = (active) =>
  `group relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium transition-[background-color,color,box-shadow] duration-150 group-data-[collapsed=true]/nav:justify-center group-data-[collapsed=true]/nav:px-0 ${
    active
      ? "bg-[#1f1f1f] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.09),0_1px_2px_rgba(0,0,0,0.6)]"
      : "text-[#b0b0b0] hover:bg-white/[0.06] hover:text-white"
  }`;

// Text-only sub links (Drafts, Collections), lined up under the parent's label
const subRowClass = (active) =>
  `flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${
    active ? "bg-white/[0.08] text-white" : "text-[#8f8f8f] hover:bg-white/[0.06] hover:text-white"
  }`;

// Smooth open/close for nested items; closed content can't be tabbed into
function Collapse({ open, children }) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"} group-data-[collapsed=true]/nav:hidden`}
      inert={!open}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function ChevronIcon({ open }) {
  return (
    <NavIcon
      name="chevron"
      className={`h-4 w-4 text-[#8f8f8f] transition-transform duration-200 group-hover:text-white ${open ? "rotate-0" : "-rotate-90"}`}
    />
  );
}

// Hidden in the icon rail: the label is the row's only text
function Label({ children }) {
  return <span className={`truncate group-data-[collapsed=true]/nav:hidden`}>{children}</span>;
}

function SectionLabel({ children }) {
  return (
    <p
      className={`px-3 pb-1.5 text-[13px] font-medium text-[#7d7d7d] group-data-[collapsed=true]/nav:sr-only`}
    >
      {children}
    </p>
  );
}

function MenuItem({ item, path }) {
  const childActive = (item.children || []).some((child) => isUnder(path, child.href));
  const active = matches(path, item);
  const [open, setOpen] = useState(childActive);

  // Auto-expand when a child becomes active (adjust state during render, not in an effect).
  const [prevChildActive, setPrevChildActive] = useState(childActive);
  if (childActive !== prevChildActive) {
    setPrevChildActive(childActive);
    if (childActive) setOpen(true);
  }

  return (
    <div>
      <div className={rowClass(active)}>
        <Link
          to={item.href}
          title={item.label}
          aria-current={active ? "page" : undefined}
          className={`flex h-full flex-1 items-center gap-3 group-data-[collapsed=true]/nav:justify-center`}
        >
          <NavIcon name={item.icon} />
          <Label>{item.label}</Label>
        </Link>

        {item.badge && (
          <span
            className={`rounded-md bg-white/10 px-2 py-px text-xs font-semibold leading-5 text-white group-data-[collapsed=true]/nav:hidden`}
          >
            {item.badge}
          </span>
        )}
        {item.children && (
          <button
            type="button"
            aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={`-mr-1.5 flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 group-data-[collapsed=true]/nav:hidden`}
          >
            <ChevronIcon open={open} />
          </button>
        )}
      </div>

      {item.children && (
        <Collapse open={open}>
          <div className="ml-[21px] mt-0.5 space-y-0.5 border-l border-white/10 pl-[18px]">
            {item.children.map((child) => (
              <Link
                key={child.href}
                to={child.href}
                className={subRowClass(isUnder(path, child.href))}
              >
                {child.label}
              </Link>
            ))}
          </div>
        </Collapse>
      )}
    </div>
  );
}

// Every admin page renders its own sidebar, so it remounts on each route change;
// its scroll position is kept here and put back before the browser paints.
const SIDEBAR_SCROLL_KEY = "admin-sidebar-scroll";
const SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

function readSidebarScroll() {
  try {
    return Number(window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveSidebarScroll(top) {
  try {
    window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(Math.round(top)));
  } catch {}
}

function readCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function saveCollapsed(value) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? "1" : "0");
  } catch {}
}

function useSidebarScroll(navRef, path) {
  // Restore instantly on mount: the nav has `scroll-smooth`, so plain scrollTop would animate from the top
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (nav) nav.scrollTo({ top: readSidebarScroll(), behavior: "instant" });
  }, [navRef]);

  // Then make sure the active item is visible, scrolling only as far as needed (never back to the top)
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector('[aria-current="page"]');
    if (!active) return;

    const navBox = nav.getBoundingClientRect();
    const itemBox = active.getBoundingClientRect();
    const margin = 8;

    if (itemBox.top < navBox.top + margin) {
      nav.scrollTo({ top: nav.scrollTop + itemBox.top - navBox.top - margin, behavior: "smooth" });
    } else if (itemBox.bottom > navBox.bottom - margin) {
      nav.scrollTo({
        top: nav.scrollTop + itemBox.bottom - navBox.bottom + margin,
        behavior: "smooth",
      });
    }
  }, [navRef, path]);
}

const ADMIN_NAV_EVENT = "admin:toggle-nav";

const railIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

// The brand mark: a white tile on the dark rail
function BrandMark({ to }) {
  return (
    <Link to={to} aria-label="Home" className="flex shrink-0 items-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white text-lg font-extrabold text-[#0a0a0a]">
        S
      </span>
    </Link>
  );
}

function NavSearch({ inputRef, query, setQuery, onSubmit, collapsed, onExpand }) {
  if (collapsed) {
    return (
      <button
        type="button"
        aria-label="Search"
        title="Search"
        onClick={onExpand}
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#1a1a1a] text-[#b0b0b0] transition hover:text-white"
      >
        <svg {...railIcon} className="h-[18px] w-[18px]">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    );
  }

  return (
    <label className="group flex h-10 items-center gap-2.5 rounded-xl border border-white/10 bg-[#1a1a1a] px-3 text-[#8f8f8f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] transition focus-within:border-white/30 focus-within:text-white">
      <svg {...railIcon} className="h-[18px] w-[18px] shrink-0">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder="Search"
        aria-label="Search the admin"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
          if (e.key === "Escape") {
            setQuery("");
            e.currentTarget.blur();
          }
        }}
        className="w-full min-w-0 bg-transparent text-[15px] text-white outline-none placeholder:text-[#8f8f8f]"
      />
      <kbd className="shrink-0 font-sans text-[13px] text-[#6f6f6f]">⌘K</kbd>
    </label>
  );
}

export default function AdminSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const path = pathname.replace(/\/+$/, "") || "/";

  const storeHomeActive = path === BASE;
  const onlineStoreActive = storeHomeActive || onlineStoreItems.some((item) => matches(path, item));
  const [onlineStoreOpen, setOnlineStoreOpen] = useState(true);
  const [appsOpen, setAppsOpen] = useState(false);
  const settingsActive = isUnder(path, `${BASE}/settings`);
  const navRef = useRef(null);
  const searchRef = useRef(null);
  const session = useSession();
  const allowed = (item) => !item.permission || can(session, item.permission);

  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [query, setQuery] = useState("");

  const setRail = (value) => {
    setCollapsed(value);
    saveCollapsed(value);
  };

  useSidebarScroll(navRef, path);

  // Remember the path the drawer was opened on: navigating elsewhere closes it
  const [openOn, setOpenOn] = useState(null);
  const mobileOpen = openOn === path;
  const setMobileOpen = (v) => setOpenOn(v ? path : null);

  // The header's menu button (below md) opens the sidebar as a drawer
  useEffect(() => {
    const toggle = () => setOpenOn((cur) => (cur === path ? null : path));
    window.addEventListener(ADMIN_NAV_EVENT, toggle);
    return () => window.removeEventListener(ADMIN_NAV_EVENT, toggle);
  }, [path]);

  // Escape closes the drawer
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpenOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Cmd/Ctrl+K jumps to the search box (opening the rail first if it is collapsed)
  useEffect(() => {
    const onKey = (e) => {
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) return;
      if (!window.matchMedia("(min-width: 768px)").matches) return;
      e.preventDefault();
      if (collapsed) {
        setCollapsed(false);
        saveCollapsed(false);
        requestAnimationFrame(() => searchRef.current?.focus());
      } else {
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed]);

  // Every page the user may open, flattened for the search box
  const searchable = [
    ...menuGroups.flatMap((group) =>
      group.items
        .filter(allowed)
        .flatMap((item) => [
          { label: item.label, icon: item.icon, href: item.href },
          ...(item.children || [])
            .filter(allowed)
            .map((child) => ({ label: child.label, icon: item.icon, href: child.href })),
        ])
    ),
    { label: "Online Store", icon: "store", href: BASE },
    ...onlineStoreItems
      .filter((item) => item.href && allowed(item))
      .map((item) => ({ label: item.label, icon: item.icon, href: item.href })),
    { label: "Settings", icon: "settings", href: `${BASE}/settings` },
  ];
  const needle = query.trim().toLowerCase();
  const results = needle ? searchable.filter((r) => r.label.toLowerCase().includes(needle)) : null;

  const go = (href) => {
    setQuery("");
    navigate(href);
  };

  const renderPanel = (drawer) => (
    <div data-collapsed={!drawer && collapsed} className="group/nav flex h-full flex-col">
      {/* BRAND + COLLAPSE */}
      <div
        className={`flex items-center justify-between px-4 pb-3 pt-4 group-data-[collapsed=true]/nav:flex-col group-data-[collapsed=true]/nav:gap-3 group-data-[collapsed=true]/nav:px-0`}
      >
        <BrandMark to={`${BASE}/home`} />
        <button
          type="button"
          aria-label={drawer ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={drawer ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => (drawer ? setMobileOpen(false) : setRail(!collapsed))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#b0b0b0] transition hover:bg-white/10 hover:text-white"
        >
          {drawer ? (
            <svg {...railIcon} className="h-[18px] w-[18px]">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg {...railIcon} className="h-[18px] w-[18px]">
              <rect width="18" height="18" x="3" y="3" rx="3" />
              <path d="M9 3v18" />
            </svg>
          )}
        </button>
      </div>

      <div className="px-3 pb-3">
        <NavSearch
          inputRef={drawer ? undefined : searchRef}
          query={query}
          setQuery={setQuery}
          onSubmit={() => results?.[0] && go(results[0].href)}
          collapsed={!drawer && collapsed}
          onExpand={() => {
            setRail(false);
            requestAnimationFrame(() => searchRef.current?.focus());
          }}
        />
      </div>

      <nav
        ref={drawer ? undefined : navRef}
        onScroll={drawer ? undefined : (e) => saveSidebarScroll(e.currentTarget.scrollTop)}
        aria-label="Admin"
        className="flex-1 overflow-y-auto scroll-smooth px-3 pb-4 [scrollbar-color:rgba(255,255,255,0.14)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15"
      >
        {results ? (
          <div className="space-y-0.5">
            <SectionLabel>Results</SectionLabel>
            {results.length === 0 && (
              <p className="px-3 py-2 text-sm text-[#7d7d7d]">Nothing matches "{query.trim()}".</p>
            )}
            {results.map((r) => (
              <Link
                key={`${r.href}-${r.label}`}
                to={r.href}
                onClick={() => setQuery("")}
                className={rowClass(false)}
              >
                <NavIcon name={r.icon} />
                <Label>{r.label}</Label>
              </Link>
            ))}
          </div>
        ) : (
          <>
            {menuGroups.map((group, index) => {
              const items = group.items.filter(allowed).map((item) => {
                const children = item.children?.filter(allowed);
                // No visible children: no expand chevron either
                return item.children
                  ? { ...item, children: children.length ? children : undefined }
                  : item;
              });
              if (!items.length) return null;

              return (
                <div
                  key={group.label}
                  className={`${index === 0 ? "" : "pt-5"} group-data-[collapsed=true]/nav:pt-3 group-data-[collapsed=true]/nav:first:pt-0`}
                >
                  {/* The first group is the app's core, so it needs no heading */}
                  {index > 0 && <SectionLabel>{group.label}</SectionLabel>}
                  <div className="space-y-0.5">
                    {items.map((item) => (
                      <MenuItem key={item.label} item={item} path={path} />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* SALES CHANNELS */}
            <div className={`pt-5 group-data-[collapsed=true]/nav:pt-3`}>
              <SectionLabel>Sales channels</SectionLabel>

              <div className="space-y-0.5">
                <div className="relative">
                  <Link
                    to={BASE}
                    title="Online Store"
                    aria-current={storeHomeActive ? "page" : undefined}
                    className={`${rowClass(storeHomeActive)} pr-11 group-data-[collapsed=true]/nav:pr-0 ${onlineStoreActive ? "text-white" : ""}`}
                  >
                    <NavIcon name="store" />
                    <span className={`flex-1 truncate group-data-[collapsed=true]/nav:hidden`}>
                      Online Store
                    </span>
                  </Link>
                  <button
                    type="button"
                    aria-label="Toggle Online Store menu"
                    aria-expanded={onlineStoreOpen}
                    onClick={() => setOnlineStoreOpen((v) => !v)}
                    className={`group absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg hover:bg-white/10 group-data-[collapsed=true]/nav:hidden`}
                  >
                    <ChevronIcon open={onlineStoreOpen} />
                  </button>
                </div>

                <Collapse open={onlineStoreOpen}>
                  <div className="space-y-0.5 pl-4">
                    {onlineStoreItems.filter(allowed).map((item) => (
                      <Link
                        key={item.label}
                        to={item.href}
                        aria-current={matches(path, item) ? "page" : undefined}
                        className={rowClass(matches(path, item))}
                      >
                        <NavIcon name={item.icon} />
                        <Label>{item.label}</Label>
                      </Link>
                    ))}
                  </div>
                </Collapse>

                <button
                  type="button"
                  title="Apps"
                  aria-expanded={appsOpen}
                  onClick={() => setAppsOpen((v) => !v)}
                  className={rowClass(false)}
                >
                  <NavIcon name="apps" />
                  <span className={`flex-1 truncate group-data-[collapsed=true]/nav:hidden`}>
                    Apps
                  </span>
                  <span className={"group-data-[collapsed=true]/nav:hidden"}>
                    <ChevronIcon open={appsOpen} />
                  </span>
                </button>

                <Collapse open={appsOpen}>
                  <p className="py-2 pl-[42px] pr-3 text-xs text-[#7d7d7d]">
                    No apps installed yet.
                  </p>
                </Collapse>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* SETTINGS + ACCOUNT */}
      <div className="space-y-2 px-3 pb-3 pt-2">
        <Link
          to={`${BASE}/settings`}
          title="Settings"
          aria-current={settingsActive ? "page" : undefined}
          className={rowClass(settingsActive)}
        >
          <NavIcon name="settings" />
          <Label>Settings</Label>
        </Link>

        <div
          className={`flex items-center gap-1 border-t border-white/[0.08] pt-3 group-data-[collapsed=true]/nav:flex-col group-data-[collapsed=true]/nav:gap-2`}
        >
          <div className={`min-w-0 flex-1 group-data-[collapsed=true]/nav:flex-none`}>
            <StoreSwitcher variant="rail" collapsed={!drawer && collapsed} />
          </div>
          <NotificationsButton />
          <ProfileMenu variant="rail" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`relative z-30 hidden shrink-0 bg-[#0a0a0a] text-white select-none transition-[width] duration-200 ease-out md:block ${
          collapsed ? "w-[76px]" : "w-[264px]"
        }`}
      >
        {/* Full height of the screen and pinned while long pages scroll */}
        <div className="sticky top-0 h-screen">
          {renderPanel(false)}
          {/* Rounds the content's top-left corner, so the page looks like a sheet laid on the rail */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-4 top-0 h-4 w-4 [background:radial-gradient(circle_at_100%_100%,transparent_16px,#0a0a0a_16.5px)]"
          />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <aside className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] bg-[#0a0a0a] text-white shadow-2xl select-none">
            {renderPanel(true)}
          </aside>
        </div>
      )}
    </>
  );
}

const headerIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

// Closes a dropdown on an outside click or Escape
function useDismiss(ref, open, close) {
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => !ref.current?.contains(e.target) && close();
    const handleKey = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [ref, open, close]);
}

function StoreAvatar({ name, size = "h-7 w-7 text-xs" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg bg-[#a23bd1] font-bold uppercase text-white ${size}`}
    >
      {(name || "S").trim().charAt(0)}
    </span>
  );
}

const storeStatus = (store) => (store.status === "live" ? "Live" : "Draft");

// "All stores": every store with its status, plus rename and delete for owners
function StoresDialog({ stores, activeId, onClose }) {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const startRename = (store) => {
    setEditingId(store.storeId);
    setDraftName(store.storeName);
    setError("");
  };

  const saveRename = async (store) => {
    const name = draftName.trim();
    if (!name) return setError("Store name can't be empty.");
    if (name === store.storeName) return setEditingId(null);

    setBusyId(store.storeId);
    setError("");
    try {
      const updated = await apiRequest(`/api/v1/stores/${store.storeId}/`, {
        method: "PATCH",
        body: { storeName: name },
      });
      setStores(
        stores.map((s) =>
          s.storeId === store.storeId ? { ...s, storeName: updated.storeName } : s
        )
      );
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (store) => {
    const ok = window.confirm(
      `Delete "${store.storeName}"?\n\nThe store will be closed and removed from your account. This can't be undone.`
    );
    if (!ok) return;

    setBusyId(store.storeId);
    setError("");
    const res = await apiDelete(`/api/v1/stores/${store.storeId}/`);
    setBusyId(null);

    if (!res.ok) return setError(res.error);

    const remaining = stores.filter((s) => s.storeId !== store.storeId);
    setStores(remaining);
    if (!remaining.length) navigate(`${ONBOARDING_PATH}?new=1`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1020]/50 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-stores-title"
        className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#E4DEFB] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E4DEFB] px-5 py-4">
          <div>
            <h2 id="all-stores-title" className="text-base font-semibold text-[#0B1020]">
              All stores
            </h2>
            <p className="text-sm text-[#4C4F7A]">
              {stores.length} {stores.length === 1 ? "store" : "stores"} on your account
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4C4F7A] hover:bg-[#F3F0FF] transition"
          >
            <svg {...headerIcon} className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <ul className="max-h-[60vh] divide-y divide-[#EEF0F4] overflow-y-auto">
          {stores.map((store) => {
            const isOwner = storeCan(store, "store.manage");
            const busy = busyId === store.storeId;
            const live = storeStatus(store) === "Live";
            const editing = editingId === store.storeId;

            return (
              <li key={store.storeId} className="flex items-center gap-3 px-5 py-3.5">
                <StoreAvatar name={store.storeName} size="h-9 w-9 text-sm" />

                <div className="min-w-0 flex-1">
                  {editing ? (
                    <input
                      autoFocus
                      value={draftName}
                      maxLength={200}
                      aria-label="Store name"
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(store);
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          setEditingId(null);
                        }
                      }}
                      className="h-9 w-full rounded-lg border border-[#0B1020] px-3 text-sm outline-none focus:ring-4 focus:ring-[#0B1020]/[0.08]"
                    />
                  ) : (
                    <>
                      <p className="truncate text-sm font-semibold text-[#0B1020]">
                        {store.storeName}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium ${
                            live ? "bg-emerald-50 text-emerald-700" : "bg-[#EDE9FE] text-[#4C4F7A]"
                          }`}
                        >
                          {storeStatus(store)}
                        </span>
                        {store.storeId === activeId && (
                          <span className="text-[#4C4F7A]">Current store</span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {isOwner && (
                  <div className="flex shrink-0 items-center gap-1">
                    {editing ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => saveRename(store)}
                          className="rounded-lg bg-[#0B1020] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1C2347] transition disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#4C4F7A] hover:bg-[#F3F0FF] transition"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => startRename(store)}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#0B1020] hover:bg-[#F3F0FF] transition disabled:opacity-60"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => remove(store)}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {error && (
          <p role="alert" className="mx-5 mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// Current store name next to the logo; lists every store, switches between them, and creates new ones
function StoreSwitcher({ variant = "bar", collapsed = false }) {
  const rail = variant === "rail";
  const navigate = useNavigate();
  const session = useSession();
  const stores = session?.stores || [];
  const active = getActiveStore(session);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const menuRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);

  useDismiss(menuRef, open, close);

  // Refresh the list when the menu opens, in case stores changed elsewhere
  useEffect(() => {
    if (!open) return;
    apiGet("/api/v1/stores/").then((res) => {
      if (res.ok && Array.isArray(res.data)) setStores(res.data);
    });
  }, [open]);

  const choose = (storeId) => {
    setOpen(false);
    if (storeId !== session?.storeId) setActiveStore(storeId);
  };

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-[#0B1020] hover:bg-[#F3F0FF] transition";

  return (
    <div ref={menuRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={rail ? active?.storeName || "No store yet" : undefined}
        className={
          rail
            ? `flex h-11 w-full min-w-0 items-center gap-2.5 rounded-xl px-1.5 text-white transition hover:bg-white/[0.06] ${collapsed ? "justify-center" : ""}`
            : "flex h-10 min-w-0 items-center gap-2 rounded-lg border border-[#E4DEFB] bg-white px-2 hover:border-[#C9D1DD] hover:bg-[#F5F3FF] transition"
        }
      >
        <StoreAvatar name={active?.storeName} size={rail ? "h-8 w-8 text-xs" : "h-7 w-7 text-xs"} />
        {!collapsed && (
          <span
            className={
              rail
                ? "min-w-0 flex-1 truncate text-left text-[15px] font-semibold"
                : "hidden max-w-[160px] truncate text-sm font-semibold text-[#0B1020] sm:inline"
            }
          >
            {active?.storeName || "No store yet"}
          </span>
        )}
        {!rail && (
          <svg
            {...headerIcon}
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute left-0 z-50 w-64 rounded-xl border border-[#E4DEFB] bg-white p-1.5 text-[#0B1020] shadow-lg shadow-[#0B1020]/10 ${
            rail ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"
          }`}
        >
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-[#8B8FB8]">
            Your stores
          </p>

          <div className="max-h-64 overflow-y-auto">
            {stores.map((store) => (
              <button
                key={store.storeId}
                type="button"
                role="menuitemradio"
                aria-checked={store.storeId === session?.storeId}
                onClick={() => choose(store.storeId)}
                className={itemClass}
              >
                <StoreAvatar name={store.storeName} />
                <span className="min-w-0 flex-1 truncate font-medium">{store.storeName}</span>
                {store.storeId === session?.storeId && (
                  <svg
                    {...headerIcon}
                    strokeWidth="2.2"
                    className="h-4 w-4 shrink-0 text-[#0B1020]"
                  >
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <div className="my-1 h-px bg-[#E4DEFB]" />

          {stores.length > 0 && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setShowAll(true);
              }}
              className={itemClass}
            >
              <span className="flex h-7 w-7 items-center justify-center text-slate-500">
                <svg {...headerIcon} className="h-4 w-4">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </span>
              All stores
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate(`${ONBOARDING_PATH}?new=1`);
            }}
            className={`${itemClass} font-semibold`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-[#C9D1DD] text-[#0B1020]">
              <svg {...headerIcon} strokeWidth="2" className="h-4 w-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            Create new store
          </button>
        </div>
      )}

      {showAll && (
        <StoresDialog
          stores={stores}
          activeId={session?.storeId}
          onClose={() => setShowAll(false)}
        />
      )}
    </div>
  );
}

// Avatar + name; opens a small menu with Profile, Settings and Logout
function ProfileMenu({ variant = "bar" }) {
  const rail = variant === "rail";
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useDismiss(menuRef, open, close);

  const logout = () => {
    setOpen(false);
    endSession();
    navigate("/auth/signin", { replace: true });
  };

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#0B1020] hover:bg-[#F3F0FF] transition";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        aria-label={rail ? "Account" : undefined}
        title={rail ? "Account" : undefined}
        className={
          rail
            ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-white/[0.08]"
            : "flex h-11 items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-[#F3F0FF] transition sm:pr-3"
        }
      >
        <span
          className={`flex items-center justify-center rounded-full text-sm font-semibold ${
            rail ? "h-7 w-7 bg-white text-xs text-[#0a0a0a]" : "h-9 w-9 bg-[#0B1020] text-white"
          }`}
        >
          A
        </span>
        {!rail && (
          <>
            <span className="hidden sm:inline text-sm font-medium text-[#0B1020]">Admin</span>
            <svg
              {...headerIcon}
              className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-50 w-48 rounded-xl border border-[#E4DEFB] bg-white p-1.5 text-[#0B1020] shadow-lg shadow-[#0B1020]/10 ${
            rail ? "bottom-[calc(100%+8px)] left-0" : "right-0 top-[calc(100%+8px)]"
          }`}
        >
          <Link
            role="menuitem"
            to={`/profile?from=${encodeURIComponent(pathname)}`}
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <svg {...headerIcon} className="h-4 w-4 text-slate-500">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
            Profile
          </Link>
          <Link
            role="menuitem"
            to={`${BASE}/settings`}
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <svg {...headerIcon} className="h-4 w-4 text-slate-500">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
            Settings
          </Link>
          <div className="my-1 h-px bg-[#E4DEFB]" />
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className={`${itemClass} text-red-600 hover:bg-red-50`}
          >
            <svg {...headerIcon} className="h-4 w-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationsButton({ tone = "rail" }) {
  return (
    <button
      type="button"
      aria-label="Notifications"
      title="Notifications"
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
        tone === "rail"
          ? "text-[#b0b0b0] hover:bg-white/[0.08] hover:text-white"
          : "text-white hover:bg-white/10"
      }`}
    >
      <svg {...headerIcon} className="h-5 w-5">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#0a0a0a]" />
    </button>
  );
}

// Top bar on phones and tablets only (the sidebar carries brand, search and account from md up)
export function AdminHeader() {
  // Back from "View store": return to where the user was on this page
  useEffect(() => {
    restoreAdminScroll();
    const kept = (e) => e.persisted && forgetAdminReturn();
    window.addEventListener("pageshow", kept);
    return () => window.removeEventListener("pageshow", kept);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-[#0a0a0a] px-3 text-white md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => window.dispatchEvent(new Event(ADMIN_NAV_EVENT))}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition hover:bg-white/10"
      >
        <svg {...headerIcon} className="h-5 w-5">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <BrandMark to={`${BASE}/home`} />
      <div className="flex-1" />
      <NotificationsButton tone="header" />
    </header>
  );
}
