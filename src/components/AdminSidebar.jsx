import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiDelete, apiGet, apiRequest } from "@/lib/api";
import { ONBOARDING_PATH, getActiveStore, setActiveStore, setStores, signOut, useSession } from "@/lib/auth";

const BASE = "/admin/online-store";

// Line icons (shapes from the Lucide set, ISC licence), all drawn at one size, stroke and colour
const navIcons = {
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
  chevron: <path d="m6 9 6 6 6-6" />,
};

function NavIcon({ name, className = "h-[18px] w-[18px]" }) {
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

// Grouped under small section labels; order and routes are unchanged.
// `match` lists the route prefixes that count as "this item" (e.g. /customers/new -> Customers)
const menuGroups = [
  {
    label: "Main",
    items: [
      { icon: "home", label: "Home", href: `${BASE}/home` },
      {
        icon: "orders",
        label: "Orders",
        href: `${BASE}/orders`,
        children: [{ label: "Drafts", href: `${BASE}/orders/drafts` }],
      },
      {
        icon: "products",
        label: "Products",
        href: `${BASE}/products`,
        match: [`${BASE}/products`, `${BASE}/collections`],
        children: [{ label: "Collections", href: `${BASE}/collections` }],
      },
      { icon: "customers", label: "Customers", href: `${BASE}/customers` },
    ],
  },
  {
    label: "Store",
    items: [
      { icon: "catalogues", label: "Catalogues", href: `${BASE}/catalogues` },
      { icon: "inventory", label: "Inventory", href: `${BASE}/inventory` },
      { icon: "content", label: "Content", href: `${BASE}/content` },
    ],
  },
  {
    label: "Insights",
    items: [
      { icon: "overview", label: "Overview", href: `${BASE}/overview` },
      { icon: "reports", label: "Reports", href: `${BASE}/reports` },
      { icon: "analytics", label: "Analytics", href: `${BASE}/analytics` },
    ],
  },
  {
    label: "Marketing & delivery",
    items: [
      { icon: "discounts", label: "Discounts", href: `${BASE}/discounts` },
      { icon: "shipping", label: "Shipping", href: `${BASE}/shipping` },
    ],
  },
];

// Pages and Blog Posts have no admin screens yet, so they aren't links
const onlineStoreItems = [
  { icon: "themes", label: "Themes", href: BASE, exact: true },
  { icon: "pages", label: "Pages" },
  { icon: "blog", label: "Blog Posts" },
];

const isUnder = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);

function matches(path, item) {
  if (!item.href) return false;
  if (item.exact) return path === item.href;
  return (item.match || [item.href]).some((prefix) => isUnder(path, prefix));
}

// One row style for every item: 42px tall, icon + label on the same vertical line
const rowClass = (active) =>
  `group relative flex h-[42px] w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors duration-150 ${
    active
      ? "bg-[#26324D] text-white before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-r-full before:bg-[#8FB0FF]"
      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
  }`;

// Text-only sub links (Drafts, Collections), lined up under the parent's label
const subRowClass = (active) =>
  `flex h-9 items-center rounded-md px-3 text-[13px] font-medium transition-colors duration-150 ${
    active ? "bg-white/[0.08] text-white" : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
  }`;

// Smooth open/close for nested items; closed content can't be tabbed into
function Collapse({ open, children }) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
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
      className={`h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:text-white ${open ? "rotate-0" : "-rotate-90"}`}
    />
  );
}

function SectionLabel({ children }) {
  return (
    <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{children}</p>
  );
}

function MenuItem({ item, path }) {
  const childActive = (item.children || []).some((child) => isUnder(path, child.href));
  const active = matches(path, item);
  const [open, setOpen] = useState(childActive);

  return (
    <div>
      <div className={rowClass(active)}>
        <Link to={item.href} aria-current={active ? "page" : undefined} className="flex h-full flex-1 items-center gap-3">
          <NavIcon name={item.icon} />
          <span className="truncate">{item.label}</span>
        </Link>

        {item.badge && (
          <span className="rounded-full bg-white/10 px-2 py-px text-[11px] font-semibold leading-4 text-slate-200">
            {item.badge}
          </span>
        )}
        {item.children && (
          <button
            type="button"
            aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="-mr-1.5 flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/10"
          >
            <ChevronIcon open={open} />
          </button>
        )}
      </div>

      {item.children && (
        <Collapse open={open}>
          <div className="ml-[21px] mt-0.5 space-y-0.5 border-l border-white/10 pl-[18px]">
            {item.children.map((child) => (
              <Link key={child.href} to={child.href} className={subRowClass(isUnder(path, child.href))}>
                {child.label}
              </Link>
            ))}
          </div>
        </Collapse>
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
        <nav
          aria-label="Admin"
          className="flex-1 overflow-y-auto scroll-smooth px-3 py-4 [scrollbar-color:rgba(255,255,255,0.14)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15"
        >
          {menuGroups.map((group) => (
            <div key={group.label} className="border-b border-white/[0.07] pb-3 pt-3 first:pt-0">
              <SectionLabel>{group.label}</SectionLabel>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <MenuItem key={item.label} item={item} path={path} />
                ))}
              </div>
            </div>
          ))}

          {/* SALES CHANNELS */}
          <div className="pt-3">
            <SectionLabel>Sales channels</SectionLabel>

            <div className="space-y-0.5">
              <button
                type="button"
                aria-expanded={onlineStoreOpen}
                onClick={() => setOnlineStoreOpen((v) => !v)}
                className={`${rowClass(false)} ${onlineStoreActive ? "text-white" : ""}`}
              >
                <NavIcon name="store" />
                <span className="flex-1 truncate">Online Store</span>
                <ChevronIcon open={onlineStoreOpen} />
              </button>

              <Collapse open={onlineStoreOpen}>
                <div className="space-y-0.5 pl-4">
                  {onlineStoreItems.map((item) =>
                    item.href ? (
                      <Link
                        key={item.label}
                        to={item.href}
                        aria-current={matches(path, item) ? "page" : undefined}
                        className={rowClass(matches(path, item))}
                      >
                        <NavIcon name={item.icon} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ) : (
                      <div
                        key={item.label}
                        title="Coming soon"
                        className={`${rowClass(false)} cursor-default hover:bg-transparent hover:text-slate-300`}
                      >
                        <NavIcon name={item.icon} />
                        <span className="truncate">{item.label}</span>
                      </div>
                    )
                  )}
                </div>
              </Collapse>

              <button
                type="button"
                aria-expanded={appsOpen}
                onClick={() => setAppsOpen((v) => !v)}
                className={rowClass(false)}
              >
                <NavIcon name="apps" />
                <span className="flex-1 truncate">Apps</span>
                <ChevronIcon open={appsOpen} />
              </button>

              <Collapse open={appsOpen}>
                <p className="py-2 pl-[42px] pr-3 text-xs text-slate-500">No apps installed yet.</p>
              </Collapse>
            </div>
          </div>
        </nav>

        {/* SETTINGS */}
        <div className="border-t border-white/[0.08] px-3 py-3">
          <Link
            to={`${BASE}/settings`}
            aria-current={settingsActive ? "page" : undefined}
            className={rowClass(settingsActive)}
          >
            <NavIcon name="settings" />
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </aside>
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
    <span className={`flex shrink-0 items-center justify-center rounded-lg bg-[#30466F] font-bold uppercase text-white ${size}`}>
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
      const updated = await apiRequest(`/api/v1/stores/${store.storeId}/`, { method: "PATCH", body: { storeName: name } });
      setStores(stores.map((s) => (s.storeId === store.storeId ? { ...s, storeName: updated.storeName } : s)));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#161C2C]/50 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-stores-title"
        className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E3E7ED] px-5 py-4">
          <div>
            <h2 id="all-stores-title" className="text-base font-semibold text-[#161C2C]">All stores</h2>
            <p className="text-sm text-[#53627E]">
              {stores.length} {stores.length === 1 ? "store" : "stores"} on your account
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#53627E] hover:bg-[#F3F6FA] transition"
          >
            <svg {...headerIcon} className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <ul className="max-h-[60vh] divide-y divide-[#EEF0F4] overflow-y-auto">
          {stores.map((store) => {
            const isOwner = store.role === "owner";
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
                      className="h-9 w-full rounded-lg border border-[#141b2d] px-3 text-sm outline-none focus:ring-4 focus:ring-[#141b2d]/[0.08]"
                    />
                  ) : (
                    <>
                      <p className="truncate text-sm font-semibold text-[#161C2C]">{store.storeName}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium ${
                            live ? "bg-emerald-50 text-emerald-700" : "bg-[#EEF1F6] text-[#53627E]"
                          }`}
                        >
                          {storeStatus(store)}
                        </span>
                        {store.storeId === activeId && <span className="text-[#53627E]">Current store</span>}
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
                          className="rounded-lg bg-[#141b2d] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#252E45] transition disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#53627E] hover:bg-[#F3F6FA] transition"
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
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#161C2C] hover:bg-[#F3F6FA] transition disabled:opacity-60"
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
function StoreSwitcher() {
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
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-[#161C2C] hover:bg-[#F3F6FA] transition";

  return (
    <div ref={menuRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-[#E3E7ED] bg-white px-2 hover:border-[#C9D1DD] hover:bg-[#F7F8FA] transition"
      >
        <StoreAvatar name={active?.storeName} />
        <span className="hidden max-w-[160px] truncate text-sm font-semibold text-[#161C2C] sm:inline">
          {active?.storeName || "No store yet"}
        </span>
        <svg {...headerIcon} className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-64 rounded-xl border border-[#E3E7ED] bg-white p-1.5 shadow-lg shadow-[#141b2d]/10"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-[#8A94A8]">Your stores</p>

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
                  <svg {...headerIcon} strokeWidth="2.2" className="h-4 w-4 shrink-0 text-[#141b2d]">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <div className="my-1 h-px bg-[#E3E7ED]" />

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
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-[#C9D1DD] text-[#141b2d]">
              <svg {...headerIcon} strokeWidth="2" className="h-4 w-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            Create new store
          </button>
        </div>
      )}

      {showAll && <StoresDialog stores={stores} activeId={session?.storeId} onClose={() => setShowAll(false)} />}
    </div>
  );
}

// Avatar + name; opens a small menu with Profile, Settings and Logout
function ProfileMenu() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useDismiss(menuRef, open, close);

  const logout = () => {
    setOpen(false);
    signOut();
    navigate("/auth/signin", { replace: true });
  };

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#161C2C] hover:bg-[#F3F6FA] transition";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-[#F3F6FA] transition sm:pr-3"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#141b2d] text-sm font-semibold text-white">
          A
        </span>
        <span className="hidden sm:inline text-sm font-medium text-[#161C2C]">Admin</span>
        <svg {...headerIcon} className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-48 rounded-xl border border-[#E3E7ED] bg-white p-1.5 shadow-lg shadow-[#141b2d]/10"
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
          <Link role="menuitem" to={`${BASE}/settings`} onClick={() => setOpen(false)} className={itemClass}>
            <svg {...headerIcon} className="h-4 w-4 text-slate-500">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
            Settings
          </Link>
          <div className="my-1 h-px bg-[#E3E7ED]" />
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

// Top bar shown on every admin page, above the sidebar (72px tall; the sidebar is pinned below it)
export function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-[72px] items-center gap-3 border-b border-[#EEF0F4] bg-white px-4 text-[#161C2C] shadow-[0_1px_8px_rgba(20,27,45,0.05)] sm:gap-6 sm:px-7">
      <Link to={`${BASE}/home`} className="flex shrink-0 items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#141b2d] text-xl font-extrabold text-white">
          S
        </span>
        <span className="hidden text-[22px] font-extrabold tracking-tight lg:inline">Store</span>
      </Link>

      <StoreSwitcher />

      {/* Search: grows to fill the middle, narrower on small screens */}
      <div className="flex flex-1 justify-center">
        <label className="group flex h-11 w-full max-w-[560px] items-center gap-2.5 rounded-full border border-transparent bg-[#F3F5F8] px-4 transition focus-within:border-[#141b2d]/40 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(20,27,45,0.08)]">
          <svg {...headerIcon} className="h-[18px] w-[18px] shrink-0 text-slate-500 group-focus-within:text-[#141b2d]">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full min-w-0 bg-transparent text-sm text-[#161C2C] outline-none placeholder:text-slate-500"
          />
        </label>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#161C2C] hover:bg-[#F3F6FA] transition"
        >
          <svg {...headerIcon} className="h-5 w-5">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <ProfileMenu />
      </div>
    </header>
  );
}
