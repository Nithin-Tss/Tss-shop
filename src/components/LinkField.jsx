import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// A Shopify-style link field: shows where the link goes; opening it lists the store's
// Home page, Collections, Products, Pages, Blogs, Blog posts and Policies to pick from,
// and anything typed that looks like an address (/path, https://, mailto:, tel:) is used as is.

const POLICY_RE = /policy|policies|terms|privacy|refund|shipping/i;

const ICONS = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  collection: "M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01",
  product: "M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01",
  page: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6",
  blog: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  policy: "M9 5h10v14H9zM5 8v11h4M12 9h4M12 12h4M12 15h3",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  phone:
    "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  chevron: "M9 6l6 6-6 6",
  back: "M15 6l-6 6 6 6",
};

function Icon({ name, className = "h-4 w-4" }) {
  return (
    <svg
      className={`${className} shrink-0`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

// What a stored link points at: its icon and a readable name
export function describeLink(value, { collections = [], products = [], pages = [], posts = [] }) {
  const v = (value || "").trim();
  if (!v) return null;
  if (v === "/") return { icon: "home", name: "Home page" };
  if (v === "/search") return { icon: "search", name: "Search" };
  if (v === "/collections/all") return { icon: "collection", name: "All products" };
  if (v === "/blog") return { icon: "blog", name: "Blog" };
  if (v.startsWith("mailto:")) return { icon: "mail", name: v.slice(7) || "Email" };
  if (v.startsWith("tel:")) return { icon: "phone", name: v.slice(4) || "Phone" };
  let m = v.match(/^\/collections\/([^/?#]+)/);
  if (m) {
    const found = collections.find((c) => c.id === m[1]);
    if (found) return { icon: "collection", name: found.name };
  }
  m = v.match(/^\/products\/([^/?#]+)/);
  if (m) {
    const found = products.find((p) => p.id === m[1]);
    if (found) return { icon: "product", name: found.title };
  }
  m = v.match(/^\/pages\/([^/?#]+)/);
  if (m) {
    const found = pages.find((p) => p.handle === m[1]);
    if (found) return { icon: POLICY_RE.test(found.handle) ? "policy" : "page", name: found.title };
  }
  m = v.match(/^\/blog\/([^/?#]+)/);
  if (m) {
    const found = posts.find((p) => p.handle === m[1]);
    if (found) return { icon: "blog", name: found.title };
  }
  return { icon: "link", name: v };
}

const looksLikeAddress = (text) => /^(\/|https?:\/\/|mailto:|tel:|#)/i.test(text.trim());

export default function LinkField({
  value,
  onChange,
  collections = [],
  products = [],
  pages = [],
  posts = [],
  placeholder = "Paste a link or search",
  label = "Link",
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState(null);
  const [box, setBox] = useState(null);
  const wrapRef = useRef(null);
  const popRef = useRef(null);
  const inputRef = useRef(null);

  const data = useMemo(
    () => ({ collections, products, pages, posts }),
    [collections, products, pages, posts]
  );
  const current = describeLink(value, data);

  const place = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const height = Math.min(300, Math.max(below, r.top) - 12);
    setBox({
      left: r.left,
      width: Math.max(r.width, 220),
      maxHeight: Math.max(height, 140),
      ...(below >= 220 || below >= r.top
        ? { top: r.bottom + 4 }
        : { bottom: window.innerHeight - r.top + 4 }),
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place, group]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (wrapRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  function close() {
    setOpen(false);
    setQuery("");
    setGroup(null);
  }

  function pick(url) {
    onChange(url);
    close();
  }

  const policies = pages.filter((p) => POLICY_RE.test(p.handle || ""));
  const plainPages = pages.filter((p) => !POLICY_RE.test(p.handle || ""));

  const GROUPS = {
    collections: {
      title: "Collections",
      icon: "collection",
      items: [
        { name: "All products", url: "/collections/all" },
        ...collections.map((c) => ({
          name: c.name + (c.status === "draft" ? " (Draft)" : ""),
          url: `/collections/${c.id}`,
        })),
      ],
    },
    products: {
      title: "Products",
      icon: "product",
      items: products.map((p) => ({ name: p.title, url: `/products/${p.id}` })),
    },
    pages: {
      title: "Pages",
      icon: "page",
      items: plainPages.map((p) => ({ name: p.title, url: `/pages/${p.handle}` })),
    },
    posts: {
      title: "Blog posts",
      icon: "blog",
      items: posts.map((p) => ({ name: p.title, url: `/blog/${p.handle}` })),
    },
    policies: {
      title: "Policies",
      icon: "policy",
      items: policies.map((p) => ({ name: p.title, url: `/pages/${p.handle}` })),
    },
  };

  const q = query.trim().toLowerCase();
  const typedAddress = q && looksLikeAddress(query);

  // Top level: shortcuts and groups; typing searches every entry
  const shortcuts = [
    { name: "Home page", url: "/", icon: "home" },
    { name: "Search", url: "/search", icon: "search" },
    { name: "Blog", url: "/blog", icon: "blog" },
  ];
  const groupRows = [
    ["collections", "Collections"],
    ["products", "Products"],
    ["pages", "Pages"],
    ["posts", "Blog posts"],
    ["policies", "Policies"],
  ];

  const results = q
    ? [
        ...shortcuts,
        ...Object.values(GROUPS).flatMap((g) => g.items.map((i) => ({ ...i, icon: g.icon }))),
      ]
        .filter((i) => i.name.toLowerCase().includes(q))
        .slice(0, 30)
    : null;

  const rowClass =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-[#0B1020] hover:bg-[#F5F3FF]";

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={`flex w-full items-center gap-2 rounded-lg border bg-white px-2.5 text-sm ${
          open ? "border-[#0B1020]" : "border-[#DDD6FE]"
        } ${compact ? "h-9" : "h-10"}`}
      >
        {current && !open ? (
          <>
            <span className="text-[#4C4F7A]">
              <Icon name={current.icon} />
            </span>
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              className="min-w-0 flex-1 truncate text-left text-[#0B1020]"
              title={value}
              aria-label={`${label}: ${current.name}`}
            >
              {current.name}
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded p-0.5 text-[#4C4F7A] hover:text-[#0B1020]"
              aria-label="Clear link"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <span className="text-[#4C4F7A]">
              <Icon name="link" />
            </span>
            <input
              ref={inputRef}
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setGroup(null);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) {
                  e.preventDefault();
                  if (typedAddress) pick(query.trim());
                  else if (results?.[0]) pick(results[0].url);
                }
              }}
              placeholder={placeholder}
              aria-label={label}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8F92B8]"
            />
          </>
        )}
      </div>

      {open && box && (
        <div
          ref={popRef}
          style={{ position: "fixed", zIndex: 60, ...box }}
          className="overflow-y-auto rounded-xl border border-[#E4DEFB] bg-white p-1.5 shadow-xl"
          role="listbox"
        >
          {typedAddress && (
            <button type="button" className={rowClass} onClick={() => pick(query.trim())}>
              <Icon name="link" />
              <span className="min-w-0 flex-1 truncate">
                Use <strong className="font-semibold">{query.trim()}</strong>
              </span>
            </button>
          )}

          {results &&
            results.map((r) => (
              <button key={r.url} type="button" className={rowClass} onClick={() => pick(r.url)}>
                <span className="text-[#4C4F7A]">
                  <Icon name={r.icon} />
                </span>
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
              </button>
            ))}
          {results && !results.length && !typedAddress && (
            <p className="px-2.5 py-2 text-sm text-[#4C4F7A]">
              No matches. Paste a full link instead.
            </p>
          )}

          {!results && group && (
            <>
              <button
                type="button"
                onClick={() => setGroup(null)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-[#0B1020] hover:bg-[#F5F3FF]"
              >
                <Icon name="back" />
                {GROUPS[group].title}
              </button>
              {GROUPS[group].items.length === 0 && (
                <p className="px-2.5 py-2 text-sm text-[#4C4F7A]">Nothing here yet.</p>
              )}
              {GROUPS[group].items.map((i) => (
                <button key={i.url} type="button" className={rowClass} onClick={() => pick(i.url)}>
                  <span className="min-w-0 flex-1 truncate">{i.name}</span>
                  {i.url === value && <span className="text-xs text-[#4C4F7A]">Selected</span>}
                </button>
              ))}
            </>
          )}

          {!results && !group && (
            <>
              <p className="px-2.5 pb-1 pt-1.5 text-xs font-semibold text-[#4C4F7A]">
                Online store
              </p>
              {shortcuts.map((s) => (
                <button key={s.url} type="button" className={rowClass} onClick={() => pick(s.url)}>
                  <span className="text-[#4C4F7A]">
                    <Icon name={s.icon} />
                  </span>
                  {s.name}
                </button>
              ))}
              {groupRows.map(([id, name]) => (
                <button key={id} type="button" className={rowClass} onClick={() => setGroup(id)}>
                  <span className="text-[#4C4F7A]">
                    <Icon name={GROUPS[id].icon} />
                  </span>
                  <span className="flex-1">{name}</span>
                  <span className="text-[#4C4F7A]">
                    <Icon name="chevron" />
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
