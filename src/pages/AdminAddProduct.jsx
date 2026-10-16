import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar, { AdminHeader } from "@/components/AdminSidebar";
import { EXTRA_FIELDS, emptyExtraFields, useFieldLabels, withLabels } from "@/lib/productFields";
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from "@/lib/api";
import { can, getActiveStore, useSession } from "@/lib/auth";

const NAVY = "#0B1020";
const PRODUCTS_URL = "/admin/online-store/products";

const inputClass =
  "w-full h-11 rounded-lg border border-[#DDE1EA] bg-[#FAF8FF] px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#0B1020] focus:bg-white focus:ring-4 focus:ring-[#0B1020]/[0.07]";

// Photos: JPG, PNG or WEBP, up to 1MB each
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_PHOTO_SIZE = 1 * 1024 * 1024;

// Returns why a photo can't be added, or "" when it's fine
function photoError(file) {
  // Some browsers leave file.type empty, so fall back to the extension
  const isAllowedType = file.type
    ? PHOTO_TYPES.includes(file.type)
    : PHOTO_EXTENSIONS.test(file.name);
  if (!isAllowedType) return "Not a supported image. Use JPG, PNG or WEBP.";
  if (file.size > MAX_PHOTO_SIZE) return "Image is too large. Maximum size is 1MB per image.";
  return "";
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFilenameFromUrl(url) {
  if (!url) return "";
  try {
    const cleanUrl = url.split("?")[0].split("#")[0];
    const parts = cleanUrl.split("/");
    const name = parts[parts.length - 1];
    return decodeURIComponent(name) || "image";
  } catch {
    return "image";
  }
}
const slugify = (text) =>
  (text || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// What the owner types in "URL handle": lower case, dashes for anything else
const cleanHandle = (text) =>
  text
    .replace(/^products\/?/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-");

// Product.status values, and how they read in the top bar and the Visibility card
const STATUSES = [
  {
    value: "active",
    label: "Active",
    text: "Shoppers can find and buy it",
    badge: "bg-emerald-100 text-emerald-800",
  },
  {
    value: "draft",
    label: "Draft",
    text: "Only you can see it",
    badge: "bg-slate-100 text-slate-600",
  },
  {
    value: "archived",
    label: "Archived",
    text: "Hidden and kept for your records",
    badge: "bg-amber-100 text-amber-800",
  },
];

// Product.theme_template values
const PAGE_LAYOUTS = [
  { value: "default", label: "Default product page" },
  { value: "featured", label: "Featured product" },
  { value: "minimal", label: "Minimal" },
];

const TARGET_SALES_CHANNELS = [
  { name: "Online Store", type: "online" },
  { name: "Point of Sale", type: "pos" },
  { name: "Shop", type: "shop" },
];

// Lists from the API come back either as an array or as { results }
const listOf = (res) =>
  Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.results) ? res.data.results : [];

// Categories in dropdown order: each top-level category followed by its subcategories
function categoryOptions(categories) {
  const byParent = {};
  categories.forEach((c) => (byParent[c.parent || "root"] ||= []).push(c));
  Object.values(byParent).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));

  const rows = [];
  const walk = (parentId, depth) =>
    (byParent[parentId] || []).forEach((c) => {
      rows.push({ id: c.id, label: `${"   ".repeat(depth)}${depth ? "↳ " : ""}${c.name}` });
      if (depth < 4) walk(c.id, depth + 1);
    });
  walk("root", 0);
  return rows;
}

/* ---------- small building blocks ---------- */

function Card({ title, hint, action, children }) {
  return (
    <section>
      <div className="rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_4px_16px_-6px_rgba(20,27,45,0.12)]">
        <header className="flex flex-wrap items-start justify-between gap-3 rounded-t-[21px] border-b border-[#E6E9F2] bg-[#EEF1F8] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-[#0B1020]">{title}</h2>
            {hint && <p className="mt-0.5 text-[13px] leading-snug text-[#55607A]">{hint}</p>}
          </div>
          {action && <div className="shrink-0 pt-0.5">{action}</div>}
        </header>
        <div className="px-5 py-5 sm:px-6">{children}</div>
      </div>
    </section>
  );
}

function Field({ label, help, error, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-semibold text-[#0B1020]">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : (
        help && <span className="mt-1 block text-xs text-slate-500">{help}</span>
      )}
    </label>
  );
}

function FieldError({ message }) {
  return message ? <span className="mt-1 block text-xs text-red-600">{message}</span> : null;
}

const withError = (error) => (error ? "border-red-400" : "");

function MoneyInput({ value, onChange, placeholder = "0.00", error }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
        $
      </span>
      <input
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} pl-7 ${withError(error)}`}
      />
    </div>
  );
}

// Text box that turns typed words into removable chips (Enter or comma adds one)
function ChipInput({ values, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const add = (raw) => {
    const value = raw.trim().replace(/,$/, "");
    if (value && !values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      onChange([...values, value]);
    }
    setDraft("");
  };

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-[#FAF8FF] px-2 py-1.5 focus-within:border-[#0B1020] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0B1020]/[0.07]">
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 rounded-full bg-[#0B1020] px-2.5 py-0.5 text-xs font-medium text-white"
        >
          {v}
          <button
            type="button"
            aria-label={`Remove ${v}`}
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="text-white/60 hover:text-white"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) =>
          e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value)
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={values.length ? "" : placeholder}
        className="min-w-[90px] flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

// Collections field with removable tags and dropdown popup (search, multi-select checkboxes, add new collection)
function CollectionsPicker({
  selectedCollections,
  onChange,
  availableCollections = [],
  onCollectionCreated,
  error,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const inlineInputRef = useRef(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [isOpen]);

  // Closing the dropdown clears what was typed in it
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) {
      setSearchQuery("");
      setIsCreatingInline(false);
      setNewCollectionName("");
      setCreateError("");
    }
  }

  // Focus inline input when opened
  useEffect(() => {
    if (isCreatingInline) {
      setTimeout(() => inlineInputRef.current?.focus(), 50);
    }
  }, [isCreatingInline]);

  // Merge store collections and selected collections to show full available list
  const allCollections = useMemo(() => {
    const list = [...new Set([...availableCollections, ...selectedCollections])].filter(Boolean);
    return list.sort((a, b) => a.localeCompare(b));
  }, [availableCollections, selectedCollections]);

  // Filter based on search query
  const filteredCollections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allCollections;
    return allCollections.filter((c) => c.toLowerCase().includes(q));
  }, [allCollections, searchQuery]);

  const handleToggle = (name) => {
    if (selectedCollections.includes(name)) {
      onChange(selectedCollections.filter((c) => c !== name));
    } else {
      onChange([...selectedCollections, name]);
    }
  };

  const handleRemove = (name) => {
    onChange(selectedCollections.filter((c) => c !== name));
  };

  const handleCreateCollection = async (rawName) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;

    // Check if collection already exists in all collections (case-insensitive check to prevent duplicates)
    const existing = allCollections.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!selectedCollections.includes(existing)) {
        onChange([...selectedCollections, existing]);
      }
      setSearchQuery("");
      setIsCreatingInline(false);
      setNewCollectionName("");
      return;
    }

    setIsCreating(true);
    setCreateError("");

    const res = await apiPost("/api/v1/catalog/collections/", { name: trimmed });
    setIsCreating(false);

    if (res.ok && res.data) {
      const createdName = res.data.name || trimmed;
      if (onCollectionCreated) {
        onCollectionCreated(createdName);
      }
      if (!selectedCollections.includes(createdName)) {
        onChange([...selectedCollections, createdName]);
      }
      setSearchQuery("");
      setIsCreatingInline(false);
      setNewCollectionName("");
    } else {
      setCreateError(res.error || res.formError || "Failed to create collection.");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Header with Title and Circle Plus Icon (Screenshot 1) */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#0B1020]">Collections</span>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="rounded-full p-0.5 text-gray-400 hover:text-slate-800 transition hover:bg-slate-100"
          title="Add or manage collections"
          aria-label="Add or manage collections"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9.5" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </button>
      </div>

      {/* Selected Collections Box with Removable Tags (Screenshot 1) */}
      <div
        onClick={() => setIsOpen(true)}
        className={`min-h-[58px] cursor-pointer rounded-lg border border-[#DDE1EA] bg-white p-2.5 transition focus-within:border-[#0B1020] ${
          error ? "border-red-400" : "hover:border-slate-400"
        }`}
      >
        {selectedCollections.length === 0 ? (
          <p className="flex items-center text-sm text-slate-400 select-none py-1">
            No collections selected
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            {selectedCollections.map((col) => (
              <span
                key={col}
                className="group inline-flex items-center gap-1.5 rounded-xl bg-[#E5E7EB] px-3 py-1 text-sm font-normal text-slate-800 transition hover:bg-[#DCDFE4]"
              >
                <span>{col}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(col);
                  }}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-500 hover:bg-slate-300 hover:text-slate-800 transition"
                  title={`Remove ${col}`}
                  aria-label={`Remove ${col}`}
                >
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="3" y1="3" x2="9" y2="9" />
                    <line x1="9" y1="3" x2="3" y2="9" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {/* Dropdown Popup (Screenshot 2) */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 rounded-xl border border-gray-200 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.15)] z-50 overflow-hidden">
          {/* Header */}
          <div className="px-3.5 pt-3 pb-1">
            <span className="text-xs font-semibold text-slate-600">Collections</span>
          </div>

          {/* Search Bar with Search/Plus Icon */}
          <div className="relative flex items-center border-b border-gray-200 px-3.5 py-2">
            <svg
              className="h-4 w-4 shrink-0 text-slate-500"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="8" r="5" />
              <line x1="11.5" y1="11.5" x2="16.5" y2="16.5" />
              <line x1="13.5" y1="3" x2="13.5" y2="7" />
              <line x1="11.5" y1="5" x2="15.5" y2="5" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    handleCreateCollection(searchQuery.trim());
                  }
                }
              }}
              placeholder="Search or add collections"
              className="ml-2.5 w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600 text-xs px-1"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* List of Available Collections with Checkboxes */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredCollections.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-slate-500">
                  {searchQuery
                    ? `No collections matching "${searchQuery}"`
                    : "No collections available"}
                </p>
              </div>
            ) : (
              filteredCollections.map((colName) => {
                const isChecked = selectedCollections.includes(colName);
                return (
                  <label
                    key={colName}
                    className="flex cursor-pointer select-none items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 transition"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(colName)}
                      className="h-4 w-4 rounded border-gray-300 text-slate-900 focus:ring-0 cursor-pointer accent-[#0B1020]"
                    />
                    <span className="text-sm text-slate-800">{colName}</span>
                  </label>
                );
              })
            )}
          </div>

          {/* Create Error */}
          {createError && (
            <div className="border-t border-red-100 bg-red-50 px-3 py-1.5 text-xs text-red-600">
              {createError}
            </div>
          )}

          {/* Footer: Add new collection option */}
          {isCreatingInline ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newCollectionName.trim()) {
                  handleCreateCollection(newCollectionName.trim());
                }
              }}
              className="border-t border-gray-200 bg-slate-50 p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <input
                  ref={inlineInputRef}
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Collection name..."
                  className="w-full rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-slate-500"
                />
                <button
                  type="submit"
                  disabled={isCreating || !newCollectionName.trim()}
                  className="rounded bg-[#0B1020] px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isCreating ? "Adding..." : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingInline(false);
                    setNewCollectionName("");
                    setCreateError("");
                  }}
                  className="px-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              disabled={isCreating}
              onClick={() => {
                if (searchQuery.trim()) {
                  handleCreateCollection(searchQuery.trim());
                } else {
                  setIsCreatingInline(true);
                }
              }}
              className="flex w-full cursor-pointer select-none items-center gap-2 border-t border-gray-200 px-3.5 py-2.5 text-left hover:bg-slate-50 transition disabled:opacity-50"
            >
              <svg
                className="h-4 w-4 shrink-0 text-slate-700"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span className="text-sm font-semibold text-slate-800">
                {isCreating
                  ? "Adding collection..."
                  : searchQuery.trim()
                    ? `Add "${searchQuery.trim()}"`
                    : "Add new collection"}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- page ---------- */

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "-");

// The "Add product" page
export default function AdminAddProduct() {
  return <ProductForm />;
}

// One form for adding a product and for editing one (`productId` set)
export function ProductForm({ productId }) {
  const fieldLabels = useFieldLabels();
  const navigate = useNavigate();
  const editing = Boolean(productId);
  const session = useSession();
  const activeStore = getActiveStore(session);

  // What the user's roles allow (the backend checks each of these too)
  const canEdit = can(session, "products.manage");
  const canDelete = can(session, "products.delete");
  const canSeeStock = can(session, "inventory.view");
  const canSetStock = can(session, "inventory.manage");

  // 1 Basic info
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");

  // 2 Photos: [{ id, file, url (preview), uploadedUrl, isSaved, name, size }], in display order
  const [photos, setPhotos] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [photoErrors, setPhotoErrors] = useState([]); // [{ name, message }] from the last upload
  const [uploadingPhotoId, setUploadingPhotoId] = useState(null);
  const [brokenImages, setBrokenImages] = useState([]);
  const mainFileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);
  const [replacingPhotoId, setReplacingPhotoId] = useState(null);

  // 3 Pricing
  const [price, setPrice] = useState("");

  // 4 Stock
  const [sku, setSku] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");

  // 5 Organize
  const [categoryId, setCategoryId] = useState("");
  const [productType, setProductType] = useState("");
  const [vendor, setVendor] = useState("");
  const [collections, setCollections] = useState([]); // collection names
  const [tags, setTags] = useState([]);

  // 6 Visibility
  const [status, setStatus] = useState("draft");

  // 7 Sales channels (ids)
  const [channelIds, setChannelIds] = useState([]);

  // 8 Page layout
  const [pageLayout, setPageLayout] = useState("default");

  // 9 Google preview
  const [editingSeo, setEditingSeo] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [extra, setExtra] = useState(emptyExtraFields); // the ten extra text fields, by key
  const [handle, setHandle] = useState(""); // URL handle: products/<handle>

  // The active store's own lists
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [storeCollections, setStoreCollections] = useState([]);
  // Automated collections fill themselves from their conditions: shown here, not picked
  const [automatedCollections, setAutomatedCollections] = useState([]);
  const [channels, setChannels] = useState([]);
  const displayedChannels = useMemo(() => {
    return TARGET_SALES_CHANNELS.map((target) => {
      const found = channels.find(
        (c) =>
          (c.type && c.type.toLowerCase() === target.type.toLowerCase()) ||
          (c.name && c.name.trim().toLowerCase() === target.name.toLowerCase())
      );
      return found ? { ...found, name: target.name } : null;
    }).filter(Boolean);
  }, [channels]);
  // Lists that failed to load: saving leaves those fields alone instead of clearing them
  const [failedLists, setFailedLists] = useState([]);

  // Edit mode: the saved product's variants, its stock per location id, and its dates
  const [variants, setVariants] = useState([]);
  const [stockByLocation, setStockByLocation] = useState({});
  const [dates, setDates] = useState({ createdAt: null, updatedAt: null });
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Unsaved changes: the form differs from how it was when loaded or last saved
  const [baseline, setBaseline] = useState(null);
  const [needsBaseline, setNeedsBaseline] = useState(false);

  // Put a saved product (API shape) into the form
  const fill = (p) => {
    const first = p.variants?.[0];
    setName(p.title || "");
    setAbout(p.description || "");
    setPhotos(
      [...(p.images || [])]
        .sort((a, b) => a.position - b.position)
        .map((img, i) => ({
          id: `saved-${i}-${img.url}`,
          url: img.url,
          uploadedUrl: img.url,
          isSaved: true,
          name: getFilenameFromUrl(img.url),
          size: null,
        }))
    );
    setPrice(first?.price ?? "");
    setSku(first?.sku || "");
    setCategoryId(p.category_id || "");
    setProductType(p.product_type || "");
    setVendor(p.vendor || "");
    setCollections(p.collections || []);
    setTags(p.tags || []);
    setStatus(p.status || "draft");
    setChannelIds(p.sales_channels || []);
    setPageLayout(p.theme_template || "default");
    setSeoTitle(p.seo_title || "");
    setSeoDescription(p.seo_description || "");
    setExtra(Object.fromEntries(EXTRA_FIELDS.map((f) => [f.key, p[f.key] || ""])));
    setHandle(p.handle || slugify(p.title));
    setVariants(p.variants || []);
    setDates({ createdAt: p.createdAt, updatedAt: p.updatedAt });
  };

  useEffect(() => {
    let cancelled = false;

    // Without inventory access there's no stock to show: skip those requests instead of reporting them as failed
    const noStock = { ok: true, data: [] };

    Promise.all([
      canSeeStock ? apiGet("/api/v1/inventory/locations/") : noStock,
      apiGet("/api/v1/catalog/categories/"),
      apiGet("/api/v1/catalog/collections/"),
      apiGet("/api/v1/catalog/sales-channels/"),
      editing ? apiGet(`/api/v1/catalog/products/${productId}/`) : null,
      editing && canSeeStock ? apiGet(`/api/v1/inventory/items/?product=${productId}`) : noStock,
    ]).then(([locationsRes, categoriesRes, collectionsRes, channelsRes, productRes, stockRes]) => {
      if (cancelled) return;
      const locationList = listOf(locationsRes);
      const channelList = listOf(channelsRes);

      setLocations(locationList);
      setCategories(listOf(categoriesRes));
      const storeCollectionList = listOf(collectionsRes);
      setStoreCollections(
        storeCollectionList.filter((c) => c.type !== "automated").map((c) => c.name)
      );
      setAutomatedCollections(
        storeCollectionList.filter((c) => c.type === "automated").map((c) => c.name)
      );
      setChannels(channelList);

      const lists = {
        locations: locationsRes,
        categories: categoriesRes,
        collections: collectionsRes,
        channels: channelsRes,
      };
      const failed = Object.keys(lists).filter((key) => !lists[key].ok);
      setFailedLists(failed);
      if (failed.length) {
        setError(
          `Some of your store's lists couldn't be loaded: ${lists[failed[0]].error} Reload the page to try again.`
        );
      }

      if (!editing) {
        setLocationId(locationList[0]?.id || "");
        // New products go on the online store by default
        setChannelIds(channelList.filter((c) => c.type === "online").map((c) => c.id));
        setNeedsBaseline(true);
        return;
      }

      setLoading(false);
      if (!productRes.ok) {
        setLoadError(productRes.error || "We couldn't load this product.");
        return;
      }
      fill(productRes.data);

      // Stock of the product's first variant, per location; the form opens on the first stocked location
      const firstVariant = productRes.data.variants?.[0]?.id;
      const stock = {};
      listOf(stockRes)
        .filter((item) => item.variant === firstVariant)
        .forEach((item) => (stock[item.location] = item.available));
      if (!stockRes.ok) setError(`The stock couldn't be loaded: ${stockRes.error}`);
      const stockedLocation = Object.keys(stock)[0];
      setStockByLocation(stock);
      setLocationId(stockedLocation || locationList[0]?.id || "");
      setQuantity(stockedLocation ? String(stock[stockedLocation]) : "");
      setNeedsBaseline(true);
    });

    return () => {
      cancelled = true;
    };
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => photos.forEach((p) => p.file && URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const snapshot = JSON.stringify([
    name,
    about,
    photos.map((p) => p.id),
    price,
    sku,
    locationId,
    quantity,
    categoryId,
    productType,
    vendor,
    collections,
    tags,
    status,
    channelIds,
    pageLayout,
    seoTitle,
    seoDescription,
    handle,
    extra,
  ]);
  if (needsBaseline) {
    setBaseline(snapshot);
    setNeedsBaseline(false);
  }
  const dirty = baseline !== null && snapshot !== baseline;

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const categoryRows = useMemo(() => categoryOptions(categories), [categories]);
  const statusInfo = STATUSES.find((s) => s.value === status) || STATUSES[1];

  const leave = () => {
    if (!dirty || window.confirm("Leave without saving? Your changes will be lost.")) {
      navigate(PRODUCTS_URL);
    }
  };

  // Edit mode: switching location shows the stock already kept there
  const chooseLocation = (id) => {
    setLocationId(id);
    if (editing) setQuantity(id in stockByLocation ? String(stockByLocation[id]) : "");
  };

  /* photos */
  const addPhotos = (fileList) => {
    const images = [];
    const rejected = [];
    Array.from(fileList || []).forEach((file) => {
      const message = photoError(file);
      if (message) {
        let detailedMsg = message;
        if (file.size > MAX_PHOTO_SIZE) {
          detailedMsg = `File size (${formatFileSize(file.size)}) exceeds the 1MB limit. Image is too large. Maximum size is 1MB per image.`;
        } else if (!file.type || !PHOTO_TYPES.includes(file.type)) {
          detailedMsg = `Unsupported format (${file.type || file.name.split(".").pop() || "unknown"}). Please use JPG, PNG, or WEBP.`;
        }
        rejected.push({ name: file.name, message: detailedMsg });
      } else {
        images.push(file);
      }
    });

    setPhotoErrors(rejected);
    if (!images.length) return;

    setPhotos((prev) => [
      ...prev,
      ...images.map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
        isSaved: false,
        name: file.name,
        size: file.size,
      })),
    ]);
  };

  const removePhoto = (id) =>
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo?.file) URL.revokeObjectURL(photo.url);
      setBrokenImages((b) => b.filter((item) => item !== id));
      return prev.filter((p) => p.id !== id);
    });

  const replacePhoto = (id, file) => {
    if (!file) return;
    const message = photoError(file);
    if (message) {
      let detailedMsg = message;
      if (file.size > MAX_PHOTO_SIZE) {
        detailedMsg = `File size (${formatFileSize(file.size)}) exceeds the 1MB limit. Image is too large. Maximum size is 1MB per image.`;
      } else if (!file.type || !PHOTO_TYPES.includes(file.type)) {
        detailedMsg = `Unsupported format (${file.type || file.name.split(".").pop() || "unknown"}). Please use JPG, PNG, or WEBP.`;
      }
      setPhotoErrors([{ name: file.name, message: detailedMsg }]);
      return;
    }
    setPhotoErrors([]);

    setPhotos((prev) => {
      const index = prev.findIndex((p) => p.id === id);
      if (index === -1) return prev;
      const oldPhoto = prev[index];
      if (oldPhoto?.file) URL.revokeObjectURL(oldPhoto.url);
      setBrokenImages((b) => b.filter((item) => item !== id));

      const updated = [...prev];
      updated[index] = {
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
        isSaved: false,
        name: file.name,
        size: file.size,
      };
      return updated;
    });
  };

  const handleStartReplace = (id) => {
    setReplacingPhotoId(id);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = "";
      replaceFileInputRef.current.click();
    }
  };

  const handleReplaceFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && replacingPhotoId) {
      replacePhoto(replacingPhotoId, file);
    }
    setReplacingPhotoId(null);
    e.target.value = "";
  };

  const handleImageError = (id) => {
    setBrokenImages((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const makeCover = (id) =>
    setPhotos((prev) => [prev.find((p) => p.id === id), ...prev.filter((p) => p.id !== id)]);

  const isChannelChecked = (ch) => {
    if (channelIds.includes(ch.id)) return true;
    const matchingChannels = channels.filter(
      (c) =>
        (c.type && ch.type && c.type.toLowerCase() === ch.type.toLowerCase()) ||
        (c.name && ch.name && c.name.trim().toLowerCase() === ch.name.trim().toLowerCase())
    );
    return matchingChannels.some((c) => channelIds.includes(c.id));
  };

  const toggleChannel = (ch) => {
    const matchingChannels = channels.filter(
      (c) =>
        (c.type && ch.type && c.type.toLowerCase() === ch.type.toLowerCase()) ||
        (c.name && ch.name && c.name.trim().toLowerCase() === ch.name.trim().toLowerCase())
    );
    const matchingIds = matchingChannels.map((c) => c.id);
    const checked = isChannelChecked(ch);
    if (checked) {
      setChannelIds((prev) => prev.filter((id) => !matchingIds.includes(id) && id !== ch.id));
    } else {
      setChannelIds((prev) => [...prev.filter((id) => !matchingIds.includes(id)), ch.id]);
    }
  };

  const fail = (message, errors = {}) => {
    setSaving(false);
    setFieldErrors(errors);
    setError(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Upload any photos not sent yet, keeping their order; returns the urls, or null on failure
  const uploadPhotos = async () => {
    const urls = [];
    const updated = [...photos];

    for (let i = 0; i < updated.length; i += 1) {
      const photo = updated[i];
      if (!photo.uploadedUrl) {
        setUploadingPhotoId(photo.id);
        const res = await apiUpload("/api/v1/catalog/products/images/", "image", photo.file);
        if (!res.ok) {
          setUploadingPhotoId(null);
          setPhotos(updated);
          return { error: `${photo.name || photo.file.name}: ${res.error}` };
        }
        updated[i] = { ...photo, uploadedUrl: res.data.url, isSaved: true };
      }
      urls.push(updated[i].uploadedUrl);
    }

    setUploadingPhotoId(null);
    setPhotos(updated);
    return { urls };
  };

  /* save */
  const handleSave = async () => {
    const errors = {};
    if (!name.trim()) errors.title = "Give your product a name.";
    if (price !== "" && !(parseFloat(price) >= 0)) errors.price = "Enter a price of 0 or more.";
    if (quantity !== "" && !(Number.isInteger(Number(quantity)) && Number(quantity) >= 0)) {
      errors.quantity = "Enter a whole number of 0 or more.";
    }
    if (quantity !== "" && !locationId) errors.location = "Choose a location for this stock.";

    if (Object.keys(errors).length) {
      fail("Please fix the highlighted fields.", errors);
      return;
    }

    setSaving(true);
    setError("");
    setSavedMessage("");
    setFieldErrors({});

    const uploaded = await uploadPhotos();
    if (uploaded.error) {
      fail("A photo couldn't be uploaded.", { images: uploaded.error });
      return;
    }

    // Edit mode only writes stock that actually changed
    // Roles without inventory rights never send stock
    const stockChanged =
      canSetStock &&
      quantity !== "" &&
      (!editing || Number(quantity) !== stockByLocation[locationId]);

    // Sent for the active store: lib/api adds its id to every request (X-Store-Id)
    const payload = {
      title: name.trim(),
      description: about.trim(),
      images: uploaded.urls,
      location: stockChanged ? locationId || null : null,
      quantity: stockChanged ? Number(quantity) : null,
      product_type: productType.trim(),
      vendor: vendor.trim(),
      collections,
      tags,
      status,
      theme_template: pageLayout,
      seo_title: seoTitle.trim(),
      seo_description: seoDescription.trim(),
      handle: (handle || slugify(name)).trim(),
      ...Object.fromEntries(EXTRA_FIELDS.map((f) => [f.key, extra[f.key].trim()])),
    };
    if (!failedLists.includes("categories")) payload.category_id = categoryId || null;
    if (!failedLists.includes("channels")) payload.sales_channels = channelIds;

    if (editing) {
      // Price and SKU belong to the first variant; any other variants go back unchanged so none is lost
      const [first, ...others] = variants;
      payload.variants = [
        { ...(first && { id: first.id }), sku: sku.trim(), price: price === "" ? null : price },
        ...others.map((v) => ({ id: v.id, sku: v.sku, price: v.price })),
      ];
    } else {
      payload.price = price === "" ? null : price;
      payload.sku = sku.trim();
    }

    // Edit mode updates this product (PATCH, scoped to the active store), never creates another
    const res = editing
      ? await apiPatch(`/api/v1/catalog/products/${productId}/`, payload)
      : await apiPost("/api/v1/catalog/products/", payload);

    if (!res.ok) {
      const firstFieldErr = Object.values(res.fieldErrors || {})[0];
      fail(
        res.formError || firstFieldErr || "Please fix the highlighted fields.",
        res.fieldErrors || {}
      );
      return;
    }

    setSaving(false);
    if (!editing) {
      navigate(PRODUCTS_URL);
      return;
    }

    fill(res.data);
    if (stockChanged) setStockByLocation((prev) => ({ ...prev, [locationId]: Number(quantity) }));
    setNeedsBaseline(true);
    setSavedMessage("Changes saved.");
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${name.trim() || "this product"}"? This can't be undone.`)) return;
    setDeleting(true);
    setError("");
    setSavedMessage("");
    const res = await apiDelete(`/api/v1/catalog/products/${productId}/`);
    setDeleting(false);
    if (!res.ok) {
      setError(res.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate(PRODUCTS_URL);
  };

  // The handle follows the name until the owner edits it
  const changeName = (value) => {
    if (!handle || handle === slugify(name)) setHandle(slugify(value));
    setName(value);
  };

  const storeBrand = (activeStore?.storeName || "SIPNOW").toUpperCase();
  const storeDomain = `https://${activeStore?.storeSlug || "zz35zk-e0"}.myshopify.com`;
  const currentHandle = handle || slugify(name) || "product-handle";
  const shownSeoTitle = seoTitle || name || "Your product name";
  const shownSeoDescription =
    seoDescription ||
    about ||
    "Add a short description so shoppers know what makes this product special.";

  if (loading || loadError) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <AdminHeader />
        <div className="flex min-h-[calc(100vh-72px)]">
          <AdminSidebar />
          <main className="flex-1 min-w-0 bg-white px-6 py-10">
            {loading ? (
              <p className="text-sm text-slate-500">Loading product...</p>
            ) : (
              <>
                <p className="text-sm text-red-700">{loadError}</p>
                <Link to={PRODUCTS_URL} className="mt-3 inline-block text-sm font-medium underline">
                  Back to products
                </Link>
              </>
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <AdminHeader />

      <div className="flex min-h-[calc(100vh-72px)]">
        <AdminSidebar />

        <main className="flex-1 min-w-0 bg-white">
          {/* STICKY ACTION BAR */}
          <div className="sticky top-[72px] z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={leave}
                  className="-ml-1 flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <span aria-hidden>←</span> Back
                </button>
                <h1 className="truncate text-lg font-bold">
                  {name.trim() || (editing ? "Product" : "New product")}
                </h1>
                <span
                  className={`hidden sm:inline rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.badge}`}
                >
                  {statusInfo.label}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {!canEdit && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    View only
                  </span>
                )}
                {editing ? (
                  canDelete && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting || saving}
                      className="h-9 rounded-full border border-red-200 px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={leave}
                    className="h-9 rounded-full px-4 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Discard
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || deleting}
                    className="h-9 rounded-full px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: NAVY }}
                  >
                    {saving ? "Saving..." : editing ? "Save changes" : "Save product"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[960px] px-3 py-8 sm:px-4">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-[#0B1020]">
                {!canEdit ? "Product details" : editing ? "Edit product" : "Add a new product"}
              </h2>
              <p className="mt-1 text-sm text-[#55607A]">
                {!canEdit
                  ? "Your role can view this product but not change it."
                  : editing
                    ? "Change any of the steps below. Only the product name is required."
                    : "Work down the steps below. Only the product name is required. You can come back and fill in the rest later."}
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {savedMessage && (
              <div
                role="status"
                className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              >
                {savedMessage}
              </div>
            )}

            {/* View-only roles: every field and button inside is disabled */}
            <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0">
              <div className="space-y-6">
                {/* 1 BASIC INFO */}
                <Card
                  title="Basic info"
                  hint="Give your product a clear name and describe it in a few simple sentences."
                >
                  <div className="space-y-4">
                    <Field label="Product name" error={fieldErrors.title}>
                      <input
                        value={name}
                        onChange={(e) => changeName(e.target.value)}
                        placeholder="e.g. Zonzo Chardonnay 2023 750ml"
                        className={`${inputClass} ${withError(fieldErrors.title)}`}
                        autoFocus
                      />
                    </Field>

                    <Field
                      label="About this product"
                      help={`${about.length} characters`}
                      error={fieldErrors.description}
                    >
                      <textarea
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        rows={6}
                        placeholder="Tell shoppers what it is, what it's made of and why they'll love it."
                        className={`${inputClass} h-auto resize-y py-2.5 leading-relaxed ${withError(fieldErrors.description)}`}
                      />
                    </Field>
                  </div>
                </Card>

                {/* 2 MEDIA */}
                <Card
                  title="Media"
                  hint="Add clear photos of your product. The first photo is the primary cover shoppers see."
                  action={
                    <button
                      type="button"
                      onClick={() => mainFileInputRef.current?.click()}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE1EA] bg-white px-3 py-1.5 text-xs font-semibold text-[#0B1020] shadow-2xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Add media
                    </button>
                  }
                >
                  {/* Hidden file input for adding multiple images */}
                  <input
                    ref={mainFileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    disabled={saving}
                    onChange={(e) => {
                      addPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />

                  {/* Hidden file input for replacing an individual image */}
                  <input
                    ref={replaceFileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={saving}
                    onChange={handleReplaceFileChange}
                  />

                  {/* Photos Grid or Empty Drag & Drop Area */}
                  {photos.length === 0 ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        if (!saving) addPhotos(e.dataTransfer.files);
                      }}
                      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                        dragging
                          ? "border-[#0B1020] bg-[#EEF1F8]"
                          : "border-[#DDE1EA] bg-[#FAF8FF] hover:bg-slate-50"
                      }`}
                    >
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <svg
                          className="h-6 w-6 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.7"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-[#0B1020]">Upload product images</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Drag and drop images here, or browse files from your computer
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Accepted formats: JPG, PNG, WEBP (up to 1MB each)
                      </p>
                      <button
                        type="button"
                        onClick={() => mainFileInputRef.current?.click()}
                        disabled={saving}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0B1020] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1e2842] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Select images
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
                      {photos.map((photo, i) => {
                        const isCover = i === 0;
                        const isBroken = brokenImages.includes(photo.id);
                        const isUploading = uploadingPhotoId === photo.id;

                        return (
                          <div
                            key={photo.id}
                            className={`group relative aspect-square overflow-hidden rounded-xl border bg-[#FAF8FF] transition ${
                              isCover
                                ? "border-[#0B1020] ring-2 ring-[#0B1020]/15 col-span-2 row-span-2"
                                : "border-[#DDE1EA] hover:border-slate-400"
                            }`}
                          >
                            {/* Image or Broken fallback */}
                            {isBroken ? (
                              <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center text-slate-400">
                                <svg
                                  className="mb-1 h-7 w-7 text-slate-300"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                  />
                                </svg>
                                <span className="text-[11px] font-medium text-slate-600">
                                  Image unavailable
                                </span>
                                <span className="truncate max-w-[120px] text-[10px] text-slate-400">
                                  {photo.name}
                                </span>
                              </div>
                            ) : (
                              <img
                                src={photo.url}
                                alt={photo.name || "Product image"}
                                onError={() => handleImageError(photo.id)}
                                className="h-full w-full object-cover transition duration-200 group-hover:scale-102"
                              />
                            )}

                            {/* Uploading Spinner Overlay */}
                            {isUploading && (
                              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-2xs">
                                <svg
                                  className="mb-1.5 h-6 w-6 animate-spin text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8H4z"
                                  />
                                </svg>
                                <span className="text-[11px] font-semibold">Uploading…</span>
                              </div>
                            )}

                            {/* Top Badges */}
                            <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1.5 pointer-events-none">
                              {isCover && (
                                <span className="rounded-md bg-[#0B1020] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                  ★ Primary
                                </span>
                              )}
                              {photo.isSaved ? (
                                <span className="rounded-md border border-emerald-200 bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-2xs">
                                  Saved
                                </span>
                              ) : (
                                <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                                  New preview
                                </span>
                              )}
                            </div>

                            {/* Bottom info banner & action buttons */}
                            <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2.5 text-white">
                              {/* File information */}
                              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium leading-tight text-slate-100">
                                <span className="truncate max-w-[140px]" title={photo.name}>
                                  {photo.name || "image"}
                                </span>
                                {photo.size && (
                                  <span className="ml-1 shrink-0 text-[10px] text-slate-300">
                                    {formatFileSize(photo.size)}
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                {!isCover && (
                                  <button
                                    type="button"
                                    onClick={() => makeCover(photo.id)}
                                    disabled={saving}
                                    className="rounded-md bg-white/90 hover:bg-white px-2 py-1 text-[10px] font-semibold text-[#0B1020] shadow-sm transition disabled:opacity-50"
                                    title="Set as primary product image"
                                  >
                                    Make primary
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleStartReplace(photo.id)}
                                  disabled={saving}
                                  className="rounded-md bg-white/90 hover:bg-white px-2 py-1 text-[10px] font-semibold text-slate-800 shadow-sm transition disabled:opacity-50"
                                  title="Replace with another image"
                                >
                                  Replace
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removePhoto(photo.id)}
                                  disabled={saving}
                                  className="rounded-md bg-red-600/90 hover:bg-red-600 px-2 py-1 text-[10px] font-semibold text-white shadow-sm transition disabled:opacity-50"
                                  title="Remove this image"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add More Drop Target inside Grid */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragging(false);
                          if (!saving) addPhotos(e.dataTransfer.files);
                        }}
                        onClick={() => {
                          if (!saving) mainFileInputRef.current?.click();
                        }}
                        className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-3 text-center transition ${
                          dragging
                            ? "border-[#0B1020] bg-[#EEF1F8]"
                            : "border-[#DDE1EA] bg-[#FAF8FF] hover:border-slate-400 hover:bg-slate-50"
                        } ${saving ? "pointer-events-none opacity-50" : ""}`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/80 text-[#0B1020]">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.5"
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </div>
                        <span className="text-xs font-semibold text-[#0B1020]">Add image</span>
                        <span className="text-[10px] text-slate-400">or drop here</span>
                      </div>
                    </div>
                  )}

                  {/* Validation Error Alerts */}
                  {photoErrors.length > 0 && (
                    <div
                      role="alert"
                      className="mt-3 flex items-start justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                      <div>
                        <p className="font-semibold text-red-800">
                          {photoErrors.length === 1
                            ? "1 file could not be added:"
                            : `${photoErrors.length} files could not be added:`}
                        </p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                          {photoErrors.map((item, i) => (
                            <li key={`${item.name}-${i}`}>
                              <span className="font-medium break-all">{item.name}</span>:{" "}
                              {item.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPhotoErrors([])}
                        className="ml-3 inline-flex h-5 w-5 items-center justify-center rounded text-red-500 hover:bg-red-100 hover:text-red-700"
                        aria-label="Dismiss errors"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <FieldError message={fieldErrors.images} />
                </Card>

                {/* 3 PRICING */}
                <Card title="Pricing" hint="Set what shoppers pay for this product.">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Selling price" error={fieldErrors.price}>
                      <MoneyInput value={price} onChange={setPrice} error={fieldErrors.price} />
                    </Field>
                  </div>
                </Card>

                {/* 4 STOCK */}
                <Card
                  title="Stock"
                  hint="Enter how many you have, plus your own codes to keep track of it."
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="SKU" help="Your own stock code" error={fieldErrors.sku}>
                      <input
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="e.g. WINE-ZC-750"
                        className={`${inputClass} ${withError(fieldErrors.sku)}`}
                      />
                    </Field>
                    {!canSeeStock ? (
                      <p className="text-sm text-slate-500 sm:col-span-2 sm:self-end">
                        Stock levels are managed by people with inventory access.
                      </p>
                    ) : (
                      <>
                        <div>
                          <Field
                            label="Location"
                            help={locations.length ? "Where this stock is kept" : undefined}
                            error={fieldErrors.location}
                          >
                            <select
                              value={locationId}
                              onChange={(e) => chooseLocation(e.target.value)}
                              disabled={!locations.length}
                              className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400 ${withError(fieldErrors.location)}`}
                            >
                              {locations.length ? (
                                locations.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.name}
                                  </option>
                                ))
                              ) : (
                                <option value="">No locations yet</option>
                              )}
                            </select>
                          </Field>
                          {!locations.length && !fieldErrors.location && (
                            <span className="mt-1 block text-xs text-slate-500">
                              Add one under{" "}
                              <Link
                                to="/admin/online-store/inventory"
                                className="font-medium text-[#0B1020] underline"
                              >
                                Inventory
                              </Link>
                            </span>
                          )}
                        </div>
                        <Field
                          label="Quantity"
                          help={
                            canSetStock ? undefined : "Your role can see stock but not change it"
                          }
                          error={fieldErrors.quantity}
                        >
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            disabled={!canSetStock}
                            placeholder="0"
                            className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400 ${withError(fieldErrors.quantity)}`}
                          />
                        </Field>
                      </>
                    )}
                  </div>
                </Card>

                {/* 5 ORGANIZE */}
                <Card
                  title="Organize"
                  hint="Add a category, vendor, collections and tags so the product is easy to find and sort."
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Category" error={fieldErrors.category_id}>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className={`${inputClass} ${withError(fieldErrors.category_id)}`}
                      >
                        <option value="">
                          {categoryRows.length ? "No category" : "No categories yet"}
                        </option>
                        {categoryRows.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Product type" error={fieldErrors.product_type}>
                      <input
                        value={productType}
                        onChange={(e) => setProductType(e.target.value)}
                        placeholder="e.g. White wine"
                        className={`${inputClass} ${withError(fieldErrors.product_type)}`}
                      />
                    </Field>
                    <Field label="Vendor" error={fieldErrors.vendor}>
                      <input
                        value={vendor}
                        onChange={(e) => setVendor(e.target.value)}
                        placeholder="e.g. Sipnow"
                        className={`${inputClass} ${withError(fieldErrors.vendor)}`}
                      />
                    </Field>
                    <div>
                      <CollectionsPicker
                        selectedCollections={collections.filter(
                          (c) => !automatedCollections.includes(c)
                        )}
                        onChange={(picked) =>
                          setCollections([
                            ...picked,
                            ...collections.filter((c) => automatedCollections.includes(c)),
                          ])
                        }
                        availableCollections={storeCollections}
                        onCollectionCreated={(newCol) => {
                          setStoreCollections((prev) =>
                            prev.includes(newCol) ? prev : [...prev, newCol]
                          );
                        }}
                        error={fieldErrors.collections}
                      />
                      {collections.some((c) => automatedCollections.includes(c)) && (
                        <p className="mt-1.5 text-[12px] text-slate-500">
                          Also in, by their conditions:{" "}
                          {collections.filter((c) => automatedCollections.includes(c)).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="mb-1.5 block text-[13px] font-semibold text-[#0B1020]">
                        Tags
                      </span>
                      <ChipInput
                        values={tags}
                        onChange={setTags}
                        placeholder="Type a tag and press Enter"
                      />
                      <FieldError message={fieldErrors.tags} />
                    </div>
                  </div>
                </Card>

                {/* EXTRA DETAILS */}
                <Card
                  title="Additional details"
                  hint="Optional notes about this product. Fill in only what applies; empty fields are left out."
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {withLabels(fieldLabels).map((f) => (
                      <Field key={f.key} label={f.label} error={fieldErrors[f.key]}>
                        <textarea
                          value={extra[f.key]}
                          onChange={(e) =>
                            setExtra((prev) => ({ ...prev, [f.key]: e.target.value }))
                          }
                          rows={2}
                          className={`${inputClass} h-auto resize-y py-2.5 leading-relaxed ${withError(fieldErrors[f.key])}`}
                        />
                      </Field>
                    ))}
                  </div>
                </Card>

                {/* 6 VISIBILITY */}
                <Card
                  title="Visibility"
                  hint="Choose whether shoppers can see this product now, or keep it hidden for later."
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {STATUSES.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                          status === opt.value
                            ? "border-[#0B1020] bg-[#EEF1F8] ring-1 ring-[#0B1020]"
                            : "border-[#DDE1EA] hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="visibility"
                          value={opt.value}
                          checked={status === opt.value}
                          onChange={() => setStatus(opt.value)}
                          className="mt-0.5 accent-[#0B1020]"
                        />
                        <span>
                          <span className="block text-sm font-semibold">{opt.label}</span>
                          <span className="block text-xs text-slate-500">{opt.text}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <FieldError message={fieldErrors.status} />
                </Card>

                {/* 7 SALES CHANNELS */}
                <Card title="Sales channels" hint="Choose where you want to sell this product.">
                  {displayedChannels.length ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {displayedChannels.map((ch) => {
                        const checked = isChannelChecked(ch);
                        return (
                          <label
                            key={ch.id}
                            className="flex cursor-pointer items-center justify-between rounded-lg border border-[#DDE1EA] bg-[#FAF8FF] px-4 py-3 text-sm font-medium transition hover:border-[#0B1020] hover:bg-white"
                          >
                            <span className="text-[#0B1020]">{ch.name}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleChannel(ch)}
                              className="h-4 w-4 accent-[#0B1020] cursor-pointer rounded"
                            />
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Loading your sales channels…</p>
                  )}
                  <FieldError message={fieldErrors.sales_channels} />
                </Card>

                {/* 8 PAGE LAYOUT */}
                <Card
                  title="Page layout"
                  hint="Choose which product page template your store uses for this product."
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Product page template" error={fieldErrors.theme_template}>
                      <select
                        value={pageLayout}
                        onChange={(e) => setPageLayout(e.target.value)}
                        className={`${inputClass} ${withError(fieldErrors.theme_template)}`}
                      >
                        {PAGE_LAYOUTS.map((layout) => (
                          <option key={layout.value} value={layout.value}>
                            {layout.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </Card>

                {/* 9 GOOGLE PREVIEW */}
                <Card
                  title="Google preview"
                  hint="This is how the product may look on Google. Edit it if you want to change it."
                  action={
                    <button
                      type="button"
                      onClick={() => setEditingSeo((v) => !v)}
                      className="h-8 rounded-full border border-[#0B1020]/20 bg-white px-3.5 text-xs font-semibold text-[#0B1020] hover:bg-[#0B1020] hover:text-white"
                    >
                      {editingSeo ? "Done" : "Edit"}
                    </button>
                  }
                >
                  <div className="rounded-lg border border-[#DDE1EA] bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-800">
                      {storeBrand}
                    </p>
                    <p className="break-all text-xs text-slate-600">
                      {storeDomain} › products › {currentHandle}
                    </p>
                    <p className="mt-0.5 truncate text-lg text-[#1a0dab]">{shownSeoTitle}</p>
                    <p className="line-clamp-2 text-sm text-slate-600">{shownSeoDescription}</p>
                    {price !== "" && !isNaN(Number(price)) && (
                      <p className="mt-1 text-xs text-slate-500">${Number(price).toFixed(2)} AUD</p>
                    )}
                  </div>

                  {(editingSeo ||
                    fieldErrors.seo_title ||
                    fieldErrors.seo_description ||
                    fieldErrors.handle) && (
                    <div className="mt-4 space-y-4">
                      <Field
                        label="SEO title"
                        help={`${seoTitle.length} of 70 characters`}
                        error={fieldErrors.seo_title}
                      >
                        <input
                          value={seoTitle}
                          maxLength={70}
                          onChange={(e) => setSeoTitle(e.target.value)}
                          placeholder={name}
                          className={`${inputClass} ${withError(fieldErrors.seo_title)}`}
                        />
                      </Field>
                      <Field
                        label="SEO description"
                        help={`${seoDescription.length} of 160 characters`}
                        error={fieldErrors.seo_description}
                      >
                        <textarea
                          value={seoDescription}
                          maxLength={160}
                          rows={3}
                          onChange={(e) => setSeoDescription(e.target.value)}
                          className={`${inputClass} h-auto resize-none py-2.5 ${withError(fieldErrors.seo_description)}`}
                        />
                      </Field>
                      <Field
                        label="URL handle"
                        help={`${storeDomain}/products/${currentHandle}`}
                        error={fieldErrors.handle}
                      >
                        <div
                          className={`flex h-11 items-center rounded-lg border border-[#DDE1EA] bg-[#FAF8FF] px-3.5 transition focus-within:border-[#0B1020] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0B1020]/[0.07] ${withError(fieldErrors.handle)}`}
                        >
                          <span className="select-none text-sm text-slate-500">products/</span>
                          <input
                            value={handle}
                            onChange={(e) => setHandle(cleanHandle(e.target.value))}
                            placeholder={slugify(name)}
                            className="w-full bg-transparent text-sm text-slate-900 outline-none"
                          />
                        </div>
                      </Field>
                    </div>
                  )}
                </Card>
              </div>
            </fieldset>

            {editing && (
              <p className="mt-6 text-xs text-slate-500">
                Created {formatDate(dates.createdAt)} · Updated {formatDate(dates.updatedAt)}
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
