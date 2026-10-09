import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiDelete, apiGet, apiRequest } from "@/lib/api";
import { ONBOARDING_PATH, getActiveStore, setActiveStore, setStores, signOut, useSession } from "@/lib/auth";

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
