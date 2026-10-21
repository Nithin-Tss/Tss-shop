import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { API_URL, apiGet, apiPatch, apiPost, apiUpload } from "@/lib/api";
import { getActiveStore, getSession } from "@/lib/auth";

// Add collection (/admin/online-store/collections/new) and Edit collection (/collections/:collectionId).
// A manual collection holds the products picked for it; an automated one every product matching its
// conditions (the server keeps it up to date when products change).

const LIST_PATH = "/admin/online-store/collections";

// Same fields and comparisons as the server (apps/catalog/services.py RULE_FIELDS / RULE_OPERATORS)
const RULE_FIELDS = [
  { value: "product_category", label: "Product category", kind: "text" },
  { value: "tag", label: "Tag", kind: "text" },
  { value: "vendor", label: "Vendor", kind: "text" },
  { value: "price", label: "Price", kind: "number" },
  { value: "product_type", label: "Product type", kind: "text" },
  { value: "inventory_stock", label: "Inventory stock", kind: "number" },
  { value: "status", label: "Status", kind: "status" },
];
const OPERATORS = {
  equals: "is equal to",
  not_equals: "is not equal to",
  contains: "contains",
  greater_than: "greater than",
  less_than: "less than",
};
const OPERATORS_FOR = {
  text: ["equals", "not_equals", "contains"],
  status: ["equals", "not_equals"],
  number: ["equals", "not_equals", "greater_than", "less_than"],
};
const PRODUCT_STATUSES = ["active", "draft", "archived"];
const TEMPLATES = ["Default collection"];

const fieldKind = (field) => RULE_FIELDS.find((f) => f.value === field)?.kind || "text";

const EMPTY_FORM = {
  name: "",
  description: "",
  image_url: "",
  handle: "",
  type: "manual",
  status: "active",
  match: "all",
  rules: [],
  products: [],
  excluded_products: [],
  theme_template: "Default collection",
  seo_title: "",
  seo_description: "",
  sales_channels: null, // channel ids; null until the store's channels load
};

function slugify(text) {
  return (text || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

const plainText = (html) =>
  (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";
}

// ---------------------------------------------------------------- shared styles

const card =
  "rounded-xl border border-[#E3E5E8] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]";
const cardTitle = "text-[15px] font-semibold text-[#0B1020]";
const labelClass = "mb-1.5 block text-[13px] font-medium text-[#4A5160]";
const inputClass =
  "w-full rounded-lg border border-[#D5D8DD] bg-white px-3 py-2.5 text-[14px] text-[#0B1020] outline-none transition placeholder:text-[#9AA0A9] focus:border-[#0B1020] focus:ring-2 focus:ring-[#0B1020]/10";
const subtleButton =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D5D8DD] bg-white px-3 py-2 text-[13px] font-medium text-[#30343B] transition hover:bg-[#F6F7F8] disabled:opacity-40";
const iconButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F1F2F4] hover:text-[#0B1020]";

function Icon({ d, className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  back: "M15 18l-6-6 6-6",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  filter: "M4 5h16M7 12h10M10 19h4",
  x: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  edit: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
  image: "M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01",
  minus: "M5 12h14",
};

// ---------------------------------------------------------------- rich text

const RICH_TEXT_TOOLS = [
  { label: "Bold", text: <b>B</b>, command: "bold" },
  { label: "Italic", text: <i>I</i>, command: "italic" },
  { label: "Underline", text: <u>U</u>, command: "underline" },
  { label: "Bulleted list", text: "• List", command: "insertUnorderedList" },
  { label: "Numbered list", text: "1. List", command: "insertOrderedList" },
  { label: "Link", text: "Link", command: "createLink" },
  { label: "Clear formatting", text: "Clear", command: "removeFormat" },
];

// A small editor for the description: bold, italic, underline, lists and links. The store cleans the HTML.
// Also used for blog posts (AdminContent).
export function RichTextEditor({ id, value, onChange, placeholder }) {
  const ref = useRef(null);

  // Only write the HTML in when it changes from outside (loading, Discard), never while typing
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) ref.current.innerHTML = value || "";
  }, [value]);

  const emit = () => {
    const html = ref.current.innerHTML;
    onChange(plainText(html) ? html : "");
  };

  const run = (command, arg) => {
    ref.current.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const apply = (tool) => {
    if (tool.command !== "createLink") return run(tool.command);
    const url = window.prompt("Link address (https://...)");
    if (url) run("createLink", url);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#D5D8DD] focus-within:border-[#0B1020] focus-within:ring-2 focus-within:ring-[#0B1020]/10">
      <div
        className="flex flex-wrap gap-0.5 border-b border-[#E3E5E8] bg-[#FAFAFB] px-1.5 py-1"
        role="toolbar"
        aria-label="Text formatting"
      >
        {RICH_TEXT_TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(tool)}
            className="rounded-md px-2 py-1 text-[12px] text-[#4A5160] hover:bg-[#EDEEF0] hover:text-[#0B1020]"
          >
            {tool.text}
          </button>
        ))}
      </div>
      <div
        id={id}
        ref={ref}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        className="min-h-[120px] px-3 py-2.5 text-[14px] leading-relaxed text-[#0B1020] outline-none empty:before:pointer-events-none empty:before:text-[#9AA0A9] empty:before:content-[attr(data-placeholder)] [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}

// ---------------------------------------------------------------- product picker

// Popup with search and checkboxes; Done returns the ticked ids
function ProductPicker({ title, products, selected, onDone, onClose }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(() => new Set(selected));
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? products.filter(
          (p) => p.title.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q)
        )
      : products;
  }, [products, query]);

  const toggle = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1020]/30 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-xl bg-white shadow-xl sm:rounded-xl"
      >
        <div className="flex items-center justify-between border-b border-[#E3E5E8] px-5 py-4">
          <h2 id="picker-title" className={cardTitle}>
            {title}
          </h2>
          <button type="button" onClick={onClose} className={iconButton} aria-label="Close">
            <Icon d={ICONS.x} />
          </button>
        </div>

        <div className="border-b border-[#E3E5E8] px-5 py-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA0A9]">
              <Icon d={ICONS.search} />
            </span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {shown.length === 0 && (
            <li className="px-3 py-10 text-center text-[13px] text-[#6B7280]">
              No products found.
            </li>
          )}
          {shown.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[#F6F7F8]">
                <input
                  type="checkbox"
                  checked={picked.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="h-4 w-4 accent-[#0B1020]"
                />
                <Thumb product={p} size="h-10 w-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-[#0B1020]">{p.title}</span>
                  <span className="block text-[12px] text-[#6B7280]">
                    {capitalize(p.status)}
                    {p.price ? ` · ${formatPrice(p.price)}` : ""}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t border-[#E3E5E8] px-5 py-3">
          <span className="text-[13px] text-[#6B7280]">{picked.size} selected</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={subtleButton}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onDone([...picked])}
              className="rounded-lg bg-[#0B1020] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#262E42]"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Thumb({ product, size = "h-full w-full" }) {
  const url = product.images?.[0]?.url;
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F1F2F4] text-[#B4B9C1]`}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <Icon d={ICONS.image} className="h-5 w-5" />
      )}
    </span>
  );
}

// ---------------------------------------------------------------- page

export default function AdminAddCollection() {
  const { collectionId } = useParams();
  const editing = Boolean(collectionId);
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(EMPTY_FORM);
  const [initial, setInitial] = useState(EMPTY_FORM); // last saved state, for "changed?" and Discard
  const [allProducts, setAllProducts] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({}); // field -> message
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");

  const [handleTouched, setHandleTouched] = useState(editing);
  const [seoOpen, setSeoOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [picker, setPicker] = useState(null); // "include" | "exclude"
  const [viewMode, setViewMode] = useState("grid");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  // Server preview of an automated collection, tagged with the conditions it was made for
  const [fetchedPreview, setFetchedPreview] = useState({ key: null, count: 0, products: [] });

  const fileRef = useRef(null);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const dirty = !loading && JSON.stringify(form) !== JSON.stringify(initial);

  // ---- load products, channels and (editing) the collection

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [productsRes, channelsRes, collectionRes] = await Promise.all([
        apiGet("/api/v1/catalog/products/"),
        apiGet("/api/v1/catalog/sales-channels/"),
        editing ? apiGet(`/api/v1/catalog/collections/${collectionId}/`) : Promise.resolve(null),
      ]);
      if (cancelled) return;

      const storeChannels = channelsRes.ok ? channelsRes.data || [] : [];
      setAllProducts(productsRes.ok ? productsRes.data || [] : []);
      setChannels(storeChannels);

      let loaded;
      if (editing) {
        if (!collectionRes.ok) {
          setLoadError(collectionRes.error || "This collection couldn't be loaded.");
          setLoading(false);
          return;
        }
        const c = collectionRes.data;
        loaded = {
          ...EMPTY_FORM,
          ...Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, c[k] ?? EMPTY_FORM[k]])),
          rules: (c.rules || []).map(({ field, operator, value }) => ({ field, operator, value })),
          sales_channels: (c.sales_channels || []).map((ch) => ch.id),
        };
      } else {
        // A new collection goes on the Online Store
        loaded = {
          ...EMPTY_FORM,
          sales_channels: storeChannels.filter((ch) => ch.type === "online").map((ch) => ch.id),
        };
      }
      setForm(loaded);
      setInitial(loaded);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [editing, collectionId]);

  // ---- leaving with unsaved changes

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const leave = () => {
    if (!dirty || window.confirm("Leave without saving? Your changes will be lost."))
      navigate(LIST_PATH);
  };

  const discard = () => {
    if (!window.confirm("Discard all unsaved changes?")) return;
    if (!editing) {
      navigate(LIST_PATH);
      return;
    }
    setForm(initial);
    setErrors({});
    setFormError("");
  };

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // ---- title -> handle (until the handle is typed by hand)

  const setTitle = (value) =>
    setForm((f) => ({ ...f, name: value, ...(handleTouched ? {} : { handle: slugify(value) }) }));

  // ---- image

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    setErrors((e) => ({ ...e, image_url: "" }));
    const res = await apiUpload("/api/v1/catalog/products/images/", "image", file);
    setUploading(false);
    if (res.ok) set("image_url", res.data.url);
    else setErrors((e) => ({ ...e, image_url: res.error }));
    if (fileRef.current) fileRef.current.value = "";
  };

  // ---- products in the collection

  const byId = useMemo(() => Object.fromEntries(allProducts.map((p) => [p.id, p])), [allProducts]);
  const completeRules = form.rules.filter((r) => String(r.value).trim() !== "");

  // Automated: ask the server which products the (unsaved) conditions match
  const rulesKey = JSON.stringify([completeRules, form.match, form.excluded_products]);
  useEffect(() => {
    if (form.type !== "automated" || loading || !completeRules.length) return undefined;
    let live = true;
    const t = setTimeout(async () => {
      const res = await apiPost("/api/v1/catalog/collections/preview/", {
        rules: completeRules,
        match: form.match,
        excluded_products: form.excluded_products,
      });
      if (!live) return;
      setFetchedPreview(
        res.ok ? { key: rulesKey, ...res.data } : { key: rulesKey, count: 0, products: [] }
      );
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesKey, form.type, loading]);
  // Until the preview for the current conditions arrives, keep showing the last one as loading
  const preview = completeRules.length
    ? { ...fetchedPreview, loading: fetchedPreview.key !== rulesKey }
    : { loading: false, count: 0, products: [] };

  const items =
    form.type === "automated"
      ? preview.products
      : form.products.map((id) => byId[id]).filter(Boolean);
  const itemCount = form.type === "automated" ? preview.count : items.length;
  const shownItems =
    statusFilter === "all" ? items : items.filter((p) => p.status === statusFilter);

  const switchType = (type) =>
    setForm((f) => {
      if (f.type === type) return f;
      // Automated -> manual keeps the products it matched, so nothing disappears by surprise
      const products =
        type === "manual" && !f.products.length ? preview.products.map((p) => p.id) : f.products;
      return { ...f, type, products };
    });

  // ---- conditions

  const addRule = () =>
    set("rules", [...form.rules, { field: "tag", operator: "equals", value: "" }]);
  const updateRule = (i, patch) =>
    set(
      "rules",
      form.rules.map((r, j) => {
        if (j !== i) return r;
        const next = { ...r, ...patch };
        // A new field may not allow the old comparison or value
        if (patch.field) {
          const kind = fieldKind(patch.field);
          if (!OPERATORS_FOR[kind].includes(next.operator)) next.operator = "equals";
          if (kind !== fieldKind(r.field)) next.value = kind === "status" ? "active" : "";
        }
        return next;
      })
    );
  const removeRule = (i) =>
    set(
      "rules",
      form.rules.filter((_, j) => j !== i)
    );

  // ---- publishing

  const onlineIds = channels.filter((ch) => ch.type === "online").map((ch) => ch.id);
  const onOnlineStore = (form.sales_channels || []).some((id) => onlineIds.includes(id));
  const setOnlineStore = (on) =>
    set(
      "sales_channels",
      on
        ? [...new Set([...(form.sales_channels || []), ...onlineIds])]
        : (form.sales_channels || []).filter((id) => !onlineIds.includes(id))
    );

  // ---- save

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Title is required.";
    if (form.type === "automated" && !completeRules.length)
      next.rules = "Add at least one condition with a value.";
    return next;
  };

  const save = async () => {
    const found = validate();
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    const body = {
      ...form,
      name: form.name.trim(),
      handle: slugify(form.handle),
      rules:
        form.type === "automated"
          ? completeRules
          : form.rules.filter((r) => String(r.value).trim() !== ""),
      products: form.type === "manual" ? form.products : undefined,
      sales_channels: form.sales_channels || [],
    };
    const res = editing
      ? await apiPatch(`/api/v1/catalog/collections/${collectionId}/`, body)
      : await apiPost("/api/v1/catalog/collections/", body);
    setSaving(false);

    if (!res.ok) {
      const fieldErrors = { ...res.fieldErrors };
      if (fieldErrors.rules && typeof fieldErrors.rules !== "string")
        fieldErrors.rules = "Check the conditions.";
      setErrors(fieldErrors);
      if (fieldErrors.handle) setSeoOpen(true);
      setFormError(res.formError || "Couldn't save the collection. Check the highlighted fields.");
      return;
    }

    const c = res.data;
    const saved = {
      ...form,
      name: c.name,
      handle: c.handle,
      rules: (c.rules || []).map(({ field, operator, value }) => ({ field, operator, value })),
      products: form.type === "manual" ? c.products : form.products,
      sales_channels: (c.sales_channels || []).map((ch) => ch.id),
    };
    setForm(saved);
    setInitial(saved);
    setHandleTouched(true);
    setErrors({});
    if (editing) setNotice("Collection saved");
    else
      navigate(`${LIST_PATH}/${c.id}`, { replace: true, state: { notice: "Collection created" } });
  };

  // ---- search engine listing

  const store = getActiveStore(getSession());
  const storeUrl = `${API_URL.replace(/\/$/, "")}/s/${store?.storeSlug || "your-store"}`;
  const collectionUrl = `${storeUrl}/collections/${slugify(form.handle) || "collection-handle"}`;
  const seoTitle = form.seo_title || form.name || "Collection title";
  const seoDescription =
    form.seo_description ||
    plainText(form.description) ||
    "Add a description to see how this collection appears in search results.";

  const pageTitle = editing ? initial.name || "Edit collection" : "Add collection";
  const excludedProducts = form.excluded_products.map((id) => byId[id]).filter(Boolean);

  // ---------------------------------------------------------------- render

  return (
    <div className="min-h-screen bg-[#F1F2F4] font-sans text-[#0B1020]">
      <AdminHeader />
      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />

        <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {/* Top bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={leave}
                className={iconButton}
                aria-label="Back to collections"
              >
                <Icon d={ICONS.back} />
              </button>
              <h1 className="truncate text-[20px] font-semibold tracking-tight">{pageTitle}</h1>
              {editing && !loading && !loadError && (
                <span className="rounded-full bg-[#E9EAEC] px-2 py-0.5 text-[12px] font-medium text-[#4A5160]">
                  {capitalize(initial.status)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discard}
                disabled={!dirty || saving}
                className={subtleButton}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saving || loading}
                className="rounded-lg bg-[#0B1020] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#262E42] disabled:cursor-not-allowed disabled:bg-[#D5D8DD] disabled:text-[#8A909A]"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div aria-live="polite">
            {notice && (
              <div className="mb-5 flex items-center justify-between rounded-xl border border-[#D5D8DD] bg-white px-4 py-3 text-[14px] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <span>✓ {notice}</span>
                <button
                  type="button"
                  onClick={() => setNotice("")}
                  className={iconButton}
                  aria-label="Dismiss"
                >
                  <Icon d={ICONS.x} />
                </button>
              </div>
            )}
            {formError && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700"
              >
                {formError}
              </div>
            )}
          </div>

          {loadError ? (
            <div className={`${card} text-center`}>
              <p className="text-[14px] text-[#4A5160]">{loadError}</p>
              <button
                type="button"
                onClick={() => navigate(LIST_PATH)}
                className={`${subtleButton} mt-4`}
              >
                Back to collections
              </button>
            </div>
          ) : loading ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                {[220, 260, 90].map((h) => (
                  <div key={h} className={`${card} animate-pulse`} style={{ height: h }} />
                ))}
              </div>
              <div className={`${card} h-48 animate-pulse`} />
            </div>
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              {/* ---------------- main column ---------------- */}
              <div className="min-w-0 space-y-6">
                {/* Title, description, image */}
                <section className={card} aria-label="Title and description">
                  <div className="flex flex-col gap-6 sm:flex-row">
                    <div className="shrink-0">
                      {form.image_url ? (
                        <div className="w-full sm:w-36">
                          <div className="aspect-square overflow-hidden rounded-xl border border-[#E3E5E8] bg-[#F1F2F4]">
                            <img
                              src={form.image_url}
                              alt="Collection"
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="mt-2 flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => fileRef.current?.click()}
                              className={`${subtleButton} flex-1 px-2 py-1.5 text-[12px]`}
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => set("image_url", "")}
                              className={`${subtleButton} flex-1 px-2 py-1.5 text-[12px]`}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            uploadImage(e.dataTransfer.files?.[0]);
                          }}
                          className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#C4C8CE] bg-[#FAFAFB] text-[#6B7280] transition hover:border-[#8A909A] hover:bg-white sm:w-36"
                        >
                          <Icon d={ICONS.upload} className="h-5 w-5" />
                          <span className="text-[12px]">
                            {uploading ? "Uploading…" : "Add image"}
                          </span>
                        </button>
                      )}
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => uploadImage(e.target.files?.[0])}
                      />
                      {errors.image_url && (
                        <p className="mt-2 text-[12px] text-red-600 sm:w-36">{errors.image_url}</p>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-4">
                      <div>
                        <label htmlFor="collection-title" className={labelClass}>
                          Title
                        </label>
                        <input
                          id="collection-title"
                          value={form.name}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Summer collection"
                          maxLength={255}
                          aria-invalid={Boolean(errors.name)}
                          className={`${inputClass} ${errors.name ? "border-red-400" : ""}`}
                          autoFocus={!editing}
                        />
                        {errors.name && (
                          <p className="mt-1.5 text-[12px] text-red-600">{errors.name}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="collection-description" className={labelClass}>
                          Description
                        </label>
                        <RichTextEditor
                          id="collection-description"
                          value={form.description}
                          onChange={(html) => set("description", html)}
                          placeholder="Tell customers about this collection"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Collection items */}
                <section className={card} aria-labelledby="items-title">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h2 id="items-title" className={cardTitle}>
                        Collection items
                      </h2>
                      <span className="rounded-full bg-[#F1F2F4] px-2 py-0.5 text-[12px] font-medium text-[#4A5160]">
                        {preview.loading && form.type === "automated" ? "…" : itemCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="flex rounded-lg border border-[#E3E5E8] p-0.5"
                        role="radiogroup"
                        aria-label="View"
                      >
                        {["grid", "list"].map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            role="radio"
                            aria-checked={viewMode === mode}
                            aria-label={`${capitalize(mode)} view`}
                            onClick={() => setViewMode(mode)}
                            className={`flex h-7 w-7 items-center justify-center rounded-md ${viewMode === mode ? "bg-[#F1F2F4] text-[#0B1020]" : "text-[#9AA0A9] hover:text-[#4A5160]"}`}
                          >
                            <Icon d={ICONS[mode]} />
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setFilterOpen((o) => !o)}
                          aria-expanded={filterOpen}
                          aria-label="Filter"
                          className={iconButton}
                        >
                          <Icon d={ICONS.filter} />
                        </button>
                        {filterOpen && (
                          <div className="absolute right-0 top-9 z-20 w-44 rounded-lg border border-[#E3E5E8] bg-white p-1 shadow-lg">
                            <p className="px-2.5 py-1.5 text-[12px] font-medium text-[#6B7280]">
                              Product status
                            </p>
                            {["all", ...PRODUCT_STATUSES].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => {
                                  setStatusFilter(s);
                                  setFilterOpen(false);
                                }}
                                className={`block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-[#F6F7F8] ${statusFilter === s ? "font-semibold" : ""}`}
                              >
                                {s === "all" ? "All" : capitalize(s)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {statusFilter !== "all" && (
                    <div className="mb-4">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#D5D8DD] bg-[#FAFAFB] py-1 pl-3 pr-1 text-[12px] text-[#30343B]">
                        Status: {capitalize(statusFilter)}
                        <button
                          type="button"
                          onClick={() => setStatusFilter("all")}
                          className="rounded-full p-0.5 hover:bg-[#E9EAEC]"
                          aria-label="Clear status filter"
                        >
                          <Icon d={ICONS.x} className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </div>
                  )}

                  {items.length === 0 ? (
                    <div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden="true">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="rounded-xl border border-[#EEEFF1] p-2.5">
                            <div className="mb-2.5 aspect-square rounded-lg bg-[#F4F5F6]" />
                            <div className="mb-1.5 h-2.5 w-3/4 rounded bg-[#EEEFF1]" />
                            <div className="h-2 w-1/3 rounded bg-[#F4F5F6]" />
                          </div>
                        ))}
                      </div>
                      <p className="mt-5 text-center text-[13px] text-[#6B7280]">
                        {preview.loading
                          ? "Finding matching products…"
                          : "Add conditions or products to populate your collection"}
                      </p>
                    </div>
                  ) : shownItems.length === 0 ? (
                    <p className="py-10 text-center text-[13px] text-[#6B7280]">
                      No {statusFilter} products in this collection.
                    </p>
                  ) : viewMode === "grid" ? (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                      {shownItems.map((p) => (
                        <li
                          key={p.id}
                          className="group relative rounded-xl border border-[#E3E5E8] p-2.5"
                        >
                          <div className="mb-2.5 aspect-square">
                            <Thumb product={p} />
                          </div>
                          <p className="truncate text-[13px] font-medium text-[#0B1020]">
                            {p.title}
                          </p>
                          <p className="text-[12px] text-[#6B7280]">
                            {formatPrice(p.price) || "—"}
                            {p.status !== "active" && <span> · {capitalize(p.status)}</span>}
                          </p>
                          <ItemAction product={p} type={form.type} form={form} set={set} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="divide-y divide-[#EEEFF1] rounded-xl border border-[#E3E5E8]">
                      {shownItems.map((p) => (
                        <li
                          key={p.id}
                          className="group relative flex items-center gap-3 px-3 py-2.5"
                        >
                          <Thumb product={p} size="h-10 w-10" />
                          <span className="min-w-0 flex-1 truncate text-[14px]">{p.title}</span>
                          <span className="hidden text-[12px] text-[#6B7280] sm:inline">
                            {capitalize(p.status)}
                          </span>
                          <span className="w-20 text-right text-[13px] text-[#4A5160]">
                            {formatPrice(p.price) || "—"}
                          </span>
                          <ItemAction product={p} type={form.type} form={form} set={set} inline />
                        </li>
                      ))}
                    </ul>
                  )}
                  {form.type === "automated" && preview.count > preview.products.length && (
                    <p className="mt-3 text-[12px] text-[#6B7280]">
                      Showing the first {preview.products.length} of {preview.count} products.
                    </p>
                  )}
                </section>

                {/* Theme template */}
                <section className={card}>
                  <label htmlFor="theme-template" className={`${cardTitle} mb-3 block`}>
                    Theme template
                  </label>
                  <select
                    id="theme-template"
                    value={form.theme_template}
                    onChange={(e) => set("theme_template", e.target.value)}
                    className={inputClass}
                  >
                    {[...new Set([...TEMPLATES, form.theme_template].filter(Boolean))].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </section>

                {/* Search engine listing */}
                <section className={card} aria-labelledby="seo-title">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 id="seo-title" className={cardTitle}>
                      Search engine listing
                    </h2>
                    <button
                      type="button"
                      onClick={() => setSeoOpen((o) => !o)}
                      aria-expanded={seoOpen}
                      aria-label="Edit search engine listing"
                      className={iconButton}
                    >
                      <Icon d={ICONS.edit} />
                    </button>
                  </div>

                  <div className="space-y-0.5">
                    <p className="truncate text-[16px] text-[#1A0DAB]">{seoTitle}</p>
                    <p className="truncate text-[13px] text-[#4A5160]">{collectionUrl}</p>
                    <p className="line-clamp-2 text-[13px] text-[#6B7280]">{seoDescription}</p>
                  </div>

                  {seoOpen && (
                    <div className="mt-5 space-y-4 border-t border-[#EEEFF1] pt-5">
                      <div>
                        <label htmlFor="seo-page-title" className={labelClass}>
                          Page title
                        </label>
                        <input
                          id="seo-page-title"
                          value={form.seo_title}
                          onChange={(e) => set("seo_title", e.target.value)}
                          placeholder={form.name || "Collection title"}
                          maxLength={255}
                          className={inputClass}
                        />
                        <p className="mt-1 text-[12px] text-[#9AA0A9]">
                          {form.seo_title.length} of 70 characters used
                        </p>
                      </div>
                      <div>
                        <label htmlFor="seo-description" className={labelClass}>
                          Meta description
                        </label>
                        <textarea
                          id="seo-description"
                          value={form.seo_description}
                          onChange={(e) => set("seo_description", e.target.value)}
                          rows={3}
                          placeholder={
                            plainText(form.description) || "A short summary for search results"
                          }
                          className={`${inputClass} resize-y`}
                        />
                        <p className="mt-1 text-[12px] text-[#9AA0A9]">
                          {form.seo_description.length} of 160 characters used
                        </p>
                      </div>
                      <div>
                        <label htmlFor="seo-handle" className={labelClass}>
                          URL handle
                        </label>
                        <div
                          className={`flex items-center overflow-hidden rounded-lg border bg-white focus-within:border-[#0B1020] ${errors.handle ? "border-red-400" : "border-[#D5D8DD]"}`}
                        >
                          <span className="hidden max-w-[45%] truncate border-r border-[#E3E5E8] bg-[#FAFAFB] px-3 py-2.5 text-[13px] text-[#6B7280] sm:block">
                            {storeUrl}/collections/
                          </span>
                          <input
                            id="seo-handle"
                            value={form.handle}
                            onChange={(e) => {
                              setHandleTouched(true);
                              set("handle", e.target.value.toLowerCase().replace(/\s+/g, "-"));
                            }}
                            onBlur={() => set("handle", slugify(form.handle) || slugify(form.name))}
                            aria-invalid={Boolean(errors.handle)}
                            className="min-w-0 flex-1 px-3 py-2.5 text-[14px] outline-none"
                          />
                        </div>
                        {errors.handle && (
                          <p className="mt-1.5 text-[12px] text-red-600">{errors.handle}</p>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {/* ---------------- side column ---------------- */}
              <div className="min-w-0 space-y-6">
                {/* Products: manual or automated */}
                <section className={`${card} p-5`} aria-labelledby="products-title">
                  <h2 id="products-title" className={`${cardTitle} mb-3`}>
                    Products
                  </h2>

                  <div
                    className="mb-4 grid grid-cols-2 rounded-lg bg-[#F1F2F4] p-0.5"
                    role="radiogroup"
                    aria-label="Collection type"
                  >
                    {[
                      ["manual", "Manual"],
                      ["automated", "Automated"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={form.type === value}
                        onClick={() => switchType(value)}
                        className={`rounded-md py-1.5 text-[13px] font-medium transition ${form.type === value ? "bg-white text-[#0B1020] shadow-sm" : "text-[#6B7280] hover:text-[#0B1020]"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {form.type === "manual" ? (
                    <>
                      <p className="mb-3 text-[13px] text-[#6B7280]">Pick products one by one.</p>
                      <button
                        type="button"
                        onClick={() => setPicker("include")}
                        className={`${subtleButton} w-full`}
                      >
                        <Icon d={ICONS.plus} /> Add products
                      </button>
                      {form.products.length > 0 && (
                        <p className="mt-3 text-[12px] text-[#6B7280]">
                          {form.products.length} product{form.products.length === 1 ? "" : "s"}{" "}
                          selected
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <fieldset className="mb-4">
                        <legend className="mb-2 text-[13px] text-[#4A5160]">
                          Products must match
                        </legend>
                        <div className="flex gap-4">
                          {[
                            ["all", "all conditions"],
                            ["any", "any condition"],
                          ].map(([value, label]) => (
                            <label
                              key={value}
                              className="flex cursor-pointer items-center gap-2 text-[13px]"
                            >
                              <input
                                type="radio"
                                name="match"
                                checked={form.match === value}
                                onChange={() => set("match", value)}
                                className="accent-[#0B1020]"
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <ul className="mb-3 space-y-3">
                        {form.rules.map((rule, i) => {
                          const kind = fieldKind(rule.field);
                          return (
                            <li key={i} className="rounded-lg border border-[#E3E5E8] p-3">
                              <div className="mb-2 flex items-center gap-2">
                                <select
                                  value={rule.field}
                                  onChange={(e) => updateRule(i, { field: e.target.value })}
                                  aria-label={`Condition ${i + 1} field`}
                                  className={`${inputClass} py-2 text-[13px]`}
                                >
                                  {RULE_FIELDS.map((f) => (
                                    <option key={f.value} value={f.value}>
                                      {f.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => removeRule(i)}
                                  className={iconButton}
                                  aria-label={`Remove condition ${i + 1}`}
                                >
                                  <Icon d={ICONS.x} />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={rule.operator}
                                  onChange={(e) => updateRule(i, { operator: e.target.value })}
                                  aria-label={`Condition ${i + 1} comparison`}
                                  className={`${inputClass} py-2 text-[13px]`}
                                >
                                  {OPERATORS_FOR[kind].map((op) => (
                                    <option key={op} value={op}>
                                      {OPERATORS[op]}
                                    </option>
                                  ))}
                                </select>
                                {kind === "status" ? (
                                  <select
                                    value={rule.value || "active"}
                                    onChange={(e) => updateRule(i, { value: e.target.value })}
                                    aria-label={`Condition ${i + 1} value`}
                                    className={`${inputClass} py-2 text-[13px]`}
                                  >
                                    {PRODUCT_STATUSES.map((s) => (
                                      <option key={s} value={s}>
                                        {capitalize(s)}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type={kind === "number" ? "number" : "text"}
                                    inputMode={kind === "number" ? "decimal" : undefined}
                                    value={rule.value}
                                    onChange={(e) => updateRule(i, { value: e.target.value })}
                                    placeholder={kind === "number" ? "0" : "Value"}
                                    aria-label={`Condition ${i + 1} value`}
                                    className={`${inputClass} py-2 text-[13px]`}
                                  />
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      {errors.rules && (
                        <p className="mb-3 text-[12px] text-red-600">{errors.rules}</p>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={addRule} className={subtleButton}>
                          <Icon d={ICONS.plus} /> Add condition
                        </button>
                        <button
                          type="button"
                          onClick={() => setPicker("exclude")}
                          className={subtleButton}
                        >
                          <Icon d={ICONS.minus} /> Exclude
                        </button>
                      </div>

                      {excludedProducts.length > 0 && (
                        <div className="mt-4 border-t border-[#EEEFF1] pt-3">
                          <p className="mb-2 text-[12px] font-medium text-[#4A5160]">
                            Excluded ({excludedProducts.length})
                          </p>
                          <ul className="space-y-1">
                            {excludedProducts.map((p) => (
                              <li
                                key={p.id}
                                className="flex items-center justify-between gap-2 text-[13px]"
                              >
                                <span className="truncate">{p.title}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    set(
                                      "excluded_products",
                                      form.excluded_products.filter((id) => id !== p.id)
                                    )
                                  }
                                  className="shrink-0 text-[12px] text-[#4A5160] underline hover:text-[#0B1020]"
                                >
                                  Include
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </section>

                {/* Publishing */}
                <section className={`${card} p-5`} aria-labelledby="publishing-title">
                  <h2 id="publishing-title" className={`${cardTitle} mb-4`}>
                    Publishing
                  </h2>

                  <label htmlFor="collection-status" className={labelClass}>
                    Status
                  </label>
                  <select
                    id="collection-status"
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                    className={`${inputClass} mb-4`}
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </select>

                  <p className="mb-2 text-[13px] font-medium text-[#4A5160]">Sales channels</p>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E3E5E8] px-3 py-2.5">
                    <span className="text-[14px]">Online Store</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={onOnlineStore}
                      aria-label="Show on the Online Store"
                      disabled={!onlineIds.length}
                      onClick={() => setOnlineStore(!onOnlineStore)}
                      className={`relative h-5 w-9 rounded-full transition ${onOnlineStore ? "bg-[#0B1020]" : "bg-[#D5D8DD]"} disabled:opacity-40`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${onOnlineStore ? "left-[18px]" : "left-0.5"}`}
                      />
                    </button>
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-[#6B7280]">
                    {form.status === "draft"
                      ? "Draft collections are hidden from your store."
                      : onOnlineStore
                        ? "Visible on your store."
                        : "Hidden from your store until it's on the Online Store."}
                  </p>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>

      {picker && (
        <ProductPicker
          title={picker === "include" ? "Add products" : "Exclude products"}
          products={allProducts}
          selected={picker === "include" ? form.products : form.excluded_products}
          onClose={() => setPicker(null)}
          onDone={(ids) => {
            set(picker === "include" ? "products" : "excluded_products", ids);
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

// Remove (manual) or exclude (automated) one product, from its card or row
function ItemAction({ product, type, form, set, inline = false }) {
  const manual = type === "manual";
  const label = manual ? `Remove ${product.title}` : `Exclude ${product.title}`;
  const run = useCallback(() => {
    if (manual)
      set(
        "products",
        form.products.filter((id) => id !== product.id)
      );
    else set("excluded_products", [...form.excluded_products, product.id]);
  }, [manual, form.products, form.excluded_products, product.id, set]);

  return (
    <button
      type="button"
      onClick={run}
      aria-label={label}
      title={manual ? "Remove" : "Exclude"}
      className={
        inline
          ? iconButton
          : "absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[#4A5160] opacity-100 shadow-sm transition hover:text-[#0B1020] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
      }
    >
      <Icon d={manual ? ICONS.x : ICONS.minus} />
    </button>
  );
}
